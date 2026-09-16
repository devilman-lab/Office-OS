import { getAIProvider } from "@/ai";
import { findIntent } from "@/ai/intents";
import type { ExtractedEntities, IntentResult, MaskedInput } from "@/ai/provider";
import { audit } from "@/audit/audit-logger";
import { db } from "@/db";
import { KnowledgeUnavailableError, NotFoundError } from "@/domain/errors";
import { AIProposalOutputSchema } from "@/domain/schemas";
import type { KnowledgeHit, MaskingResult, ProposalCustomer } from "@/domain/types";
import { getKnowledgeProvider } from "@/knowledge";
import { customerRepository, inboxRepository, interactionRepository, knowledgeRepository, proposalRepository } from "@/repositories";
import { checkAgentPermission } from "@/security/permissions";
import { containsLikelyPII } from "@/security/pii-masker";
import { STAFF } from "@/security/current-user";
import { maskForAI } from "./masking.service";
import { PIPELINE_STEPS, toSerializableHit, type PipelineResult, type PipelineStep, type PipelineStepKey } from "./pipeline.types";

const SOURCE_TO_INTERACTION = { gmail: "email", line_works: "line_works", voice_memo: "voice_memo", phone_memo: "phone", meeting_note: "meeting", manual: "note", ai: "note" } as const;

class StepRecorder {
  steps: PipelineStep[] = [];
  private startedAt = Date.now();
  private stepStart = Date.now();
  begin() { this.stepStart = Date.now(); }
  end(key: PipelineStepKey, status: PipelineStep["status"], summary: string, detail?: Record<string, unknown>) {
    const idx = PIPELINE_STEPS.findIndex((s) => s.key === key);
    const def = PIPELINE_STEPS[idx];
    this.steps.push({ key, index: idx + 1, label: def.label, labelJa: def.labelJa, status, durationMs: Date.now() - this.stepStart, summary, detail });
    this.stepStart = Date.now();
  }
  skipRemaining(after: PipelineStepKey) {
    const idx = PIPELINE_STEPS.findIndex((s) => s.key === after);
    for (const def of PIPELINE_STEPS.slice(idx + 1)) {
      this.steps.push({ key: def.key, index: PIPELINE_STEPS.indexOf(def) + 1, label: def.label, labelJa: def.labelJa, status: "skipped", durationMs: 0, summary: "前段の失敗によりスキップ" });
    }
  }
  total() { return Date.now() - this.startedAt; }
}

/**
 * The intake pipeline: Inbox item → masked → classified → knowledge-grounded → validated proposal.
 * Every step is audited. Nothing is written to cases/tasks here — only an AIProposal awaiting human review.
 */
export async function runIntakePipeline(inboxItemId: string): Promise<PipelineResult> {
  db();
  const ai = getAIProvider();
  const knowledge = getKnowledgeProvider();
  const rec = new StepRecorder();
  const result: PipelineResult = { inboxItemId, status: "failed", steps: rec.steps, masking: null, intent: null, entities: null, knowledgeQuery: null, knowledge: [], proposal: null, error: null, totalMs: 0 };

  // 01 INPUT RECEIVED
  rec.begin();
  const item = inboxRepository.findById(inboxItemId);
  if (!item) throw new NotFoundError("InboxItem", inboxItemId);
  inboxRepository.update(item.id, { aiStatus: "processing" });
  audit.ai("AI_REQUEST", "inbox_item", item.id, "success", "AI整理を開始", { provider: ai.name, source: item.source, subject: item.subject, trainingOptOut: ai.trainingOptOut });
  rec.end("input_received", "success", `${item.source} / ${item.content.length} 文字`, { source: item.source, receivedAt: item.receivedAt });

  // 02 PII MASKING
  rec.begin();
  const masking: MaskingResult = maskForAI(item.content);
  const leak = containsLikelyPII(masking.masked);
  result.masking = { original: masking.original, masked: masking.masked, counts: masking.counts, entities: masking.entities };
  const maskSummary = Object.entries(masking.counts).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`).join(" / ") || "マスキング対象なし";
  audit.ai("PII_MASKING", "inbox_item", item.id, leak ? "warning" : "success", maskSummary, { ...masking.counts, residualPiiDetected: leak });
  rec.end("pii_masking", leak ? "warning" : "success", maskSummary, { counts: masking.counts });

  const input: MaskedInput = { maskedText: masking.masked, subject: item.subject, source: item.source, receivedAt: item.receivedAt };

  // 03 INTENT CLASSIFICATION
  rec.begin();
  const intent: IntentResult = await ai.classifyIntent(input);
  result.intent = intent;
  audit.ai("INTENT_CLASSIFICATION", "inbox_item", item.id, intent.confidence === "low" ? "warning" : "success", `${intent.label}（confidence: ${intent.confidence}）`, { intent: intent.intent, score: intent.score, rationale: intent.rationale });
  rec.end("intent_classification", intent.confidence === "low" ? "warning" : "success", `${intent.label} — ${intent.rationale}`, { confidence: intent.confidence, alternatives: intent.alternatives });

  // 04 ENTITY EXTRACTION
  rec.begin();
  const entities: ExtractedEntities = await ai.extractEntities(input);
  result.entities = entities;
  audit.ai("ENTITY_EXTRACTION", "inbox_item", item.id, "success", `日付 ${entities.dates.length} / 人物 ${entities.persons.length} / 組織 ${entities.organizations.length}`, { dates: entities.dates, persons: entities.persons, organizations: entities.organizations });
  rec.end("entity_extraction", "success", `日付 ${entities.dates.length} 件、対象者 ${entities.persons.length} 名、組織 ${entities.organizations.length} 件を抽出`, { dates: entities.dates, keywords: entities.keywords });

  // 05 KNOWLEDGE SEARCH
  rec.begin();
  const def = findIntent(intent.intent);
  const query = def.knowledgeQuery || item.subject;
  result.knowledgeQuery = query;
  let hits: KnowledgeHit[] = [];
  const perm = checkAgentPermission("SEARCH_KNOWLEDGE", { inboxItemId: item.id });
  try {
    hits = perm.permission === "allowed" ? await knowledge.search(query, { limit: 4 }) : [];
    const verifiedHits = hits.filter((h) => h.document.verified);
    result.knowledge = hits.map(toSerializableHit);
    audit.ai("KNOWLEDGE_SEARCH", "knowledge", null, hits.length ? "success" : "warning", `${hits.length} documents retrieved`, { query, documents: hits.map((h) => h.document.id), verified: verifiedHits.length });
    rec.end("knowledge_search", hits.length ? "success" : "warning", hits.length ? `${hits.length} 件のナレッジを取得（確認済み ${verifiedHits.length} 件）` : "関連する確認済みナレッジが見つかりませんでした", { query, documents: hits.map((h) => ({ id: h.document.id, title: h.document.title, relevance: h.relevance })) });
    hits = verifiedHits.filter((h) => h.relevance !== "low"); // only verified, sufficiently relevant knowledge may ground the proposal
  } catch (err) {
    if (err instanceof KnowledgeUnavailableError) {
      audit.ai("KNOWLEDGE_UNAVAILABLE", "knowledge", null, "failed", err.message, { query });
      rec.end("knowledge_search", "failed", err.message);
      rec.skipRemaining("knowledge_search");
      inboxRepository.update(item.id, { aiStatus: "failed" });
      result.error = { code: err.code, message: err.message, nextAction: "連携画面で Obsidian コネクタの状態を確認し、復旧後に「AIで整理」を再実行してください。" };
      result.totalMs = rec.total();
      return result;
    }
    throw err;
  }

  // 06 CASE ANALYSIS (customer matching)
  rec.begin();
  const customer = resolveCustomer(masking, item.senderOrganization);
  audit.ai("CASE_ANALYSIS", "inbox_item", item.id, "success", customer.customerId ? `既存顧客に一致: ${customer.customerId}` : "新規顧客候補", { customer });
  rec.end("case_analysis", "success", customer.customerId ? `既存顧客 ${customer.customerId}（${customer.maskedName}）に紐付け` : "既存顧客に一致せず — 新規顧客候補として扱います", { customer });

  // 07 TASK GENERATION (raw AI output)
  rec.begin();
  const raw = await ai.generateProposal({ input, intent, entities, knowledge: hits, assigneeCandidates: STAFF });
  const rawTaskCount = Array.isArray((raw as { taskProposals?: unknown[] })?.taskProposals) ? (raw as { taskProposals: unknown[] }).taskProposals.length : 0;
  audit.ai("TASK_GENERATION", "inbox_item", item.id, "success", `案件候補 1 件 / タスク候補 ${rawTaskCount} 件を生成（未検証）`, { taskCount: rawTaskCount });
  rec.end("task_generation", "success", `案件候補 1 件、タスク候補 ${rawTaskCount} 件を生成（未検証）`);

  // 08 VALIDATION (Zod — LLM output is untrusted)
  rec.begin();
  const parsed = AIProposalOutputSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    audit.ai("AI_VALIDATION_FAILED", "inbox_item", item.id, "failed", "AI 出力がスキーマ検証に失敗しました。DB には保存されません。", { issues });
    rec.end("validation", "failed", `スキーマ検証に失敗（${issues.length} 件）: ${issues.map((i) => i.path || "root").join(", ")}`, { issues });
    rec.skipRemaining("validation");
    inboxRepository.update(item.id, { aiStatus: "failed" });
    result.error = { code: "AI_VALIDATION_FAILED", message: "AI の出力が検証に失敗したため、提案は保存されませんでした。", nextAction: "「AIで整理」を再実行してください。再発する場合は担当者が手動で案件登録してください。", details: issues };
    result.totalMs = rec.total();
    return result;
  }
  const output = parsed.data;
  const requiredMissing = output.missingInformation.filter((m) => m.severity === "required");
  audit.ai("PROPOSAL_VALIDATION", "inbox_item", item.id, requiredMissing.length ? "warning" : "success", requiredMissing.length ? `検証 OK — 不足情報 ${requiredMissing.length} 件` : "スキーマ検証 OK", { missing: output.missingInformation });
  rec.end("validation", requiredMissing.length ? "warning" : "success", requiredMissing.length ? `スキーマ検証 OK。不足情報 ${requiredMissing.length} 件（${requiredMissing.map((m) => m.label).join("、")}）` : "スキーマ検証 OK — 必須項目が揃っています", { missing: output.missingInformation });

  // 09 HUMAN REVIEW REQUIRED (persist proposal; nothing enters cases/tasks yet)
  rec.begin();
  const handle = db();
  const persist = handle.transaction(() => {
    const interaction = interactionRepository.create({
      customerId: customer.customerId,
      caseId: null,
      type: SOURCE_TO_INTERACTION[item.source],
      source: item.source,
      subject: item.subject,
      content: item.content,
      maskedContent: masking.masked,
      inboxItemId: item.id,
    });
    const proposal = proposalRepository.create({
      sourceInteractionId: interaction.id,
      inboxItemId: item.id,
      customer,
      intent: output.intent,
      intentLabel: output.intentLabel,
      summary: output.summary,
      caseProposal: output.caseProposal,
      taskProposals: output.taskProposals,
      missingInformation: output.missingInformation,
      confidence: output.confidence,
      knowledgeReferenceIds: [],
      status: "pending_review",
      reviewNote: null,
      reviewedBy: null,
      reviewedAt: null,
      createdCaseId: null,
      processingMs: rec.total(),
    });
    const refIds = hits.map((h) => knowledgeRepository.createReference({ knowledgeDocumentId: h.document.id, query, relevance: h.relevance, score: h.score, usedBy: proposal.id, caseId: null, proposalId: proposal.id }).id);
    handle.prepare("UPDATE ai_proposals SET knowledge_reference_ids = ? WHERE id = ?").run(JSON.stringify(refIds), proposal.id);
    inboxRepository.update(item.id, { aiStatus: "review_required", proposalId: proposal.id, interactionId: interaction.id });
    audit.system("INTERACTION_CREATED", "interaction", interaction.id, "success", "受信内容を対応履歴として記録（原本とマスキング版を分離保存）", { inboxItemId: item.id });
    for (const id of refIds) audit.system("KNOWLEDGE_REFERENCE", "knowledge_reference", id, "success", "提案に参照元ナレッジを紐付け", { proposalId: proposal.id });
    audit.ai("PROPOSAL_CREATED", "ai_proposal", proposal.id, "success", `案件候補 1 件 / タスク候補 ${output.taskProposals.length} 件 — 担当者の確認が必要です`, { confidence: output.confidence, interactionId: interaction.id });
    return proposal.id;
  });
  const proposalId = persist();
  result.proposal = proposalRepository.findById(proposalId);
  rec.end("human_review_required", "success", `提案 ${proposalId} を作成しました。承認されるまで案件・タスクは登録されません。`, { proposalId });

  result.status = "review_required";
  result.totalMs = rec.total();
  return result;
}

function resolveCustomer(masking: MaskingResult, senderOrganization: string | null): ProposalCustomer {
  const orgEntity = masking.entities.find((e) => e.type === "ORGANIZATION");
  const orgName = orgEntity?.original ?? senderOrganization;
  const existing = orgName ? customerRepository.findByOrganization(orgName) : null;
  if (existing) {
    return { customerId: existing.id, maskedName: orgEntity?.token ?? existing.maskedName, matchedOrganization: existing.organization, isNew: false };
  }
  return { customerId: null, maskedName: orgEntity?.token ?? "[ORG_NEW]", matchedOrganization: null, isNew: true };
}
