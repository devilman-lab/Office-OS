import type { AIProvider, AnswerContext, ExtractedEntities, IntentResult, MaskedInput, ProposalContext } from "../provider";
import { INTENTS, findIntent } from "../intents";
import { extractDates } from "./date-extractor";
import { addDays, toDateOnly } from "@/lib/utils";
import { keywords, normalize } from "@/knowledge/tokenizer";
import type { Confidence } from "@/domain/enums";
import type { KnowledgeHit } from "@/domain/types";

/**
 * Deterministic, rule-based stand-in for an LLM.
 * It exists so the demo runs offline, is reproducible, and never sends data anywhere.
 * The output *shape* is identical to what a real LLM provider is prompted to return,
 * and it goes through the same Zod validation as any other provider.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "Mock AI (rule-based, offline)";
  readonly kind = "mock" as const;
  readonly trainingOptOut = true;

  /** Demo hook: when set, generateProposal returns this raw value once (used to demo validation failures). */
  private forcedProposalOutput: unknown | undefined;
  forceNextProposalOutput(value: unknown) {
    this.forcedProposalOutput = value;
  }

  async classifyIntent(input: MaskedInput): Promise<IntentResult> {
    const text = normalize(input.subject + " " + input.maskedText);
    const scored = INTENTS.filter((i) => i.intent !== "other").map((def) => {
      let score = 0;
      const hits: string[] = [];
      for (const k of def.keywords) {
        const occurrences = text.split(normalize(k)).length - 1;
        if (occurrences > 0) {
          const strong = def.strongKeywords.includes(k);
          score += (strong ? 3 : 1) * Math.min(occurrences, 2);
          hits.push(k);
        }
      }
      return { def, score, hits };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    const second = scored[1];
    if (!best || best.score === 0) {
      const other = findIntent("other");
      return { intent: other.intent, label: other.label, confidence: "low", score: 0, rationale: "分類キーワードが検出されませんでした。担当者による確認が必要です。", alternatives: [] };
    }
    const margin = best.score - (second?.score ?? 0);
    const confidence: Confidence = best.score >= 6 && margin >= 3 ? "high" : best.score >= 3 ? "medium" : "low";
    return {
      intent: best.def.intent,
      label: best.def.label,
      confidence,
      score: best.score,
      rationale: `検出キーワード: ${best.hits.join("、")}`,
      alternatives: scored.slice(1, 3).filter((s) => s.score > 0).map((s) => ({ intent: s.def.intent, label: s.def.label, score: s.score })),
    };
  }

  async extractEntities(input: MaskedInput): Promise<ExtractedEntities> {
    const text = input.maskedText;
    const persons = [...new Set(text.match(/\[PERSON_\d{3}\]/g) ?? [])];
    const organizations = [...new Set(text.match(/\[ORG(?:ANIZATION)?_\d{3}\]/g) ?? [])];
    const headMatch = text.normalize("NFKC").match(/(\d{1,3})\s?(?:名|人)/);
    return {
      dates: extractDates(text, input.receivedAt),
      persons,
      organizations,
      keywords: keywords(text).filter((k) => k.length >= 2 && !/^(PERSON|ORGANIZATION|ORG|PHONE|EMAIL|ADDRESS)$/.test(k)).slice(0, 12),
      headcount: headMatch ? Number(headMatch[1]) : persons.length > 0 ? persons.length : null,
    };
  }

  async generateProposal(ctx: ProposalContext): Promise<unknown> {
    if (this.forcedProposalOutput !== undefined) {
      const forced = this.forcedProposalOutput;
      this.forcedProposalOutput = undefined;
      return forced;
    }
    const def = findIntent(ctx.intent.intent);
    const org = ctx.entities.organizations[0] ?? "[ORG_NEW]";
    const received = new Date(ctx.input.receivedAt);

    const requiredDate = def.requiredDateRole
      ? ctx.entities.dates.find((d) => d.role === def.requiredDateRole) ?? ctx.entities.dates.find((d) => d.role === "unknown") ?? null
      : ctx.entities.dates.find((d) => d.role === "deadline") ?? null;
    const anchorIso = requiredDate?.iso ?? null;

    const missingInformation: { field: string; label: string; message: string; severity: "required" | "recommended" }[] = [];
    let caseDueDate: string | null = null;
    if (def.caseDueOffsetDays !== null) {
      if (anchorIso) caseDueDate = toDateOnly(addDays(new Date(anchorIso + "T00:00:00"), def.caseDueOffsetDays));
      else if (!def.requiredDateRole) caseDueDate = toDateOnly(addDays(received, def.caseDueOffsetDays));
    }
    if (def.requiredDateRole && !anchorIso) {
      missingInformation.push({ field: "dueDate", label: "期限", message: `${def.requiredDateLabel}が本文から特定できないため、期限を設定できません。`, severity: "required" });
    }
    if (ctx.entities.persons.length === 0 && ["social_insurance_enrollment", "social_insurance_loss", "immigration", "dependent_change"].includes(def.intent)) {
      missingInformation.push({ field: "subject_person", label: "対象者", message: "手続きの対象者（従業員）が特定できません。", severity: "recommended" });
    }
    if (ctx.knowledge.length === 0) {
      missingInformation.push({ field: "knowledge", label: "参照ナレッジ", message: "関連する確認済みナレッジが見つかりませんでした。担当者が根拠を確認してください。", severity: "recommended" });
    }

    const assignee = ctx.assigneeCandidates[def.intent === "construction_license" || def.intent === "immigration" ? 2 : 1] ?? ctx.assigneeCandidates[0];
    const tasks = def.tasks.map((t) => {
      let dueDate: string | null = null;
      if (t.offsetDays !== null) {
        if (t.anchor === "received") dueDate = toDateOnly(addDays(received, t.offsetDays));
        else if (anchorIso) dueDate = toDateOnly(addDays(new Date(anchorIso + "T00:00:00"), t.offsetDays));
      }
      return { title: t.title, description: t.description, priority: t.priority, dueDate, assignee };
    });

    const knowledgeNote = ctx.knowledge.length ? `参照ナレッジ: ${ctx.knowledge.map((k) => k.document.title).join("、")}` : "参照ナレッジなし";
    const dateNote = requiredDate ? `${def.requiredDateLabel || "関連日付"}: ${requiredDate.iso}（本文「${requiredDate.text}」）` : "";
    const summary = [
      `${org} から ${def.label} に関する依頼。`,
      ctx.entities.persons.length ? `対象者 ${ctx.entities.persons.length} 名（${ctx.entities.persons.join("、")}）。` : "",
      dateNote,
      knowledgeNote,
    ].filter(Boolean).join(" ");

    const confidence: Confidence = missingInformation.some((m) => m.severity === "required")
      ? ctx.intent.confidence === "high" ? "medium" : "low"
      : ctx.intent.confidence;

    return {
      intent: def.intent,
      intentLabel: def.label,
      summary,
      caseProposal: {
        title: def.caseTitle(org),
        description: `${def.description}。\n${dateNote ? dateNote + "\n" : ""}${knowledgeNote}`,
        priority: def.priority,
        dueDate: caseDueDate,
        assignee,
      },
      taskProposals: tasks,
      missingInformation,
      confidence,
    };
  }

  async answerQuestion(ctx: AnswerContext): Promise<unknown> {
    const usable = ctx.knowledge.filter((k) => k.relevance !== "low");
    if (usable.length === 0) {
      return { answer: "確認済みナレッジから十分な根拠を取得できませんでした。担当者による確認が必要です。", grounded: false, confidence: "low", citedDocumentIds: [] };
    }
    // Ground the answer in the strongest matches only (high; fall back to medium).
    const primary = usable.some((k) => k.relevance === "high") ? usable.filter((k) => k.relevance === "high") : usable.slice(0, 2);
    const cited = primary.slice(0, 3);
    const lines = composeGroundedLines(ctx.question, cited);
    const verifiedCount = cited.filter((k) => k.document.verified).length;
    const confidence: Confidence = cited[0].relevance === "high" && verifiedCount === cited.length ? "high" : verifiedCount > 0 ? "medium" : "low";
    const answer = [
      "確認済みナレッジに基づく回答案です。",
      ...lines,
      "",
      "※ 最終的な判断・顧客への回答は担当者が参照元を確認したうえで行ってください。",
    ].join("\n");
    return { answer, grounded: true, confidence, citedDocumentIds: cited.map((k) => k.document.id) };
  }
}

/** Pulls the most relevant bullet lines (with their section heading) out of the retrieved documents. */
function composeGroundedLines(question: string, hits: KnowledgeHit[]): string[] {
  const qTerms = [...new Set(keywords(question).map(normalize))].filter((t) => t.length >= 2);
  const out: string[] = [];
  for (const hit of hits) {
    let heading = "";
    const candidates: { line: string; heading: string }[] = [];
    for (const raw of hit.document.content.split("\n")) {
      const l = raw.trim();
      if (/^##?\s/.test(l)) { heading = l.replace(/^#+\s*/, ""); continue; }
      if (/^[-*]\s|^\d+\.\s/.test(l)) candidates.push({ line: l.replace(/^[-*]\s|^\d+\.\s/, "").replace(/\*\*/g, ""), heading });
    }
    const scored = candidates.map((c) => {
      const nl = normalize(c.line);
      const nh = normalize(c.heading);
      let sc = 0;
      for (const t of qTerms) {
        if (nl.includes(t)) sc += 1;
        if (nh.includes(t)) sc += 1.5;
      }
      return { ...c, sc };
    });
    const matched = scored.filter((c) => c.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 5);
    const chosen = matched.length ? matched : scored.slice(0, 4);
    if (chosen.length) {
      out.push("", "【" + hit.document.title + "】");
      let lastHeading = "";
      for (const c of chosen) {
        if (c.heading && c.heading !== lastHeading) { out.push("（" + c.heading + "）"); lastHeading = c.heading; }
        out.push("・" + c.line);
      }
    }
  }
  return out;
}
