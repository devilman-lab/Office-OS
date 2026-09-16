import { getAIProvider } from "@/ai";
import { audit } from "@/audit/audit-logger";
import { db } from "@/db";
import { KnowledgeUnavailableError } from "@/domain/errors";
import { GroundedAnswerSchema } from "@/domain/schemas";
import type { Confidence } from "@/domain/enums";
import { getKnowledgeProvider } from "@/knowledge";
import { knowledgeRepository } from "@/repositories";
import { checkAgentPermission } from "@/security/permissions";
import { maskForAI } from "./masking.service";
import { toSerializableHit, type SerializableKnowledgeHit } from "./pipeline.types";

export interface AssistantAnswer {
  question: string;
  maskedQuestion: string;
  maskedEntityCount: number;
  searchQuery: string;
  retrieved: SerializableKnowledgeHit[];
  answer: string;
  grounded: boolean;
  confidence: Confidence;
  citedDocumentIds: string[];
  verifiedCount: number;
  totalCited: number;
  referenceIds: string[];
  error: { code: string; message: string; nextAction: string } | null;
  elapsedMs: number;
}

/**
 * Grounded Q&A: question → (mask) → knowledge search → answer restricted to retrieved verified documents.
 * If nothing sufficiently relevant is found the assistant refuses to guess.
 */
export async function askAssistant(question: string): Promise<AssistantAnswer> {
  db();
  const started = Date.now();
  const ai = getAIProvider();
  const knowledge = getKnowledgeProvider();
  const masking = maskForAI(question);
  const base: AssistantAnswer = {
    question,
    maskedQuestion: masking.masked,
    maskedEntityCount: masking.entities.length,
    searchQuery: masking.masked,
    retrieved: [],
    answer: "",
    grounded: false,
    confidence: "low",
    citedDocumentIds: [],
    verifiedCount: 0,
    totalCited: 0,
    referenceIds: [],
    error: null,
    elapsedMs: 0,
  };

  audit.human("AI_REQUEST", "assistant", null, "success", `質問: ${masking.masked.slice(0, 80)}`, { maskedEntities: masking.entities.length });
  const perm = checkAgentPermission("SEARCH_KNOWLEDGE", { context: "assistant" });
  if (perm.permission !== "allowed") {
    return { ...base, answer: perm.reason, error: { code: "PERMISSION_DENIED", message: perm.reason, nextAction: "管理者に権限設定を確認してください。" }, elapsedMs: Date.now() - started };
  }

  try {
    const hits = await knowledge.search(masking.masked, { limit: 5 });
    const verifiedHits = hits.filter((h) => h.document.verified);
    audit.ai("KNOWLEDGE_SEARCH", "knowledge", null, hits.length ? "success" : "warning", `${hits.length} documents retrieved`, { query: masking.masked, documents: hits.map((h) => h.document.id), verified: verifiedHits.length });

    const raw = await ai.answerQuestion({ question: masking.masked, knowledge: verifiedHits });
    const parsed = GroundedAnswerSchema.safeParse(raw);
    if (!parsed.success) {
      audit.ai("AI_VALIDATION_FAILED", "assistant", null, "failed", "AI 回答がスキーマ検証に失敗", { issues: parsed.error.issues.map((i) => i.path.join(".")) });
      return { ...base, retrieved: hits.map(toSerializableHit), answer: "AI の回答が検証に失敗しました。", error: { code: "AI_VALIDATION_FAILED", message: "AI 応答の形式が不正でした。", nextAction: "もう一度質問してください。再発する場合は担当者が直接ナレッジを確認してください。" }, elapsedMs: Date.now() - started };
    }
    const out = parsed.data;
    // Defensive: citations must be a subset of what was actually retrieved and verified.
    const allowed = new Set(verifiedHits.map((h) => h.document.id));
    const cited = out.citedDocumentIds.filter((id) => allowed.has(id));
    const grounded = out.grounded && cited.length > 0;
    const referenceIds = cited.map((docId) => {
      const hit = verifiedHits.find((h) => h.document.id === docId)!;
      return knowledgeRepository.createReference({ knowledgeDocumentId: docId, query: masking.masked, relevance: hit.relevance, score: hit.score, usedBy: "assistant", caseId: null, proposalId: null }).id;
    });
    audit.ai("AI_ANSWER", "assistant", null, grounded ? "success" : "warning", grounded ? `grounded answer (confidence: ${out.confidence})` : "根拠不足のため回答を保留", { citedDocuments: cited, confidence: out.confidence });
    return {
      ...base,
      retrieved: hits.map(toSerializableHit),
      answer: out.answer,
      grounded,
      confidence: grounded ? out.confidence : "low",
      citedDocumentIds: cited,
      verifiedCount: cited.length,
      totalCited: cited.length,
      referenceIds,
      elapsedMs: Date.now() - started,
    };
  } catch (err) {
    if (err instanceof KnowledgeUnavailableError) {
      audit.ai("KNOWLEDGE_UNAVAILABLE", "knowledge", null, "failed", err.message, { query: masking.masked });
      return { ...base, answer: err.message, error: { code: err.code, message: err.message, nextAction: "連携画面で Obsidian コネクタを確認してください。AI はナレッジなしでの回答を行いません。" }, elapsedMs: Date.now() - started };
    }
    throw err;
  }
}

export const SUGGESTED_QUESTIONS = [
  "社会保険の資格取得手続きについて必要な書類を教えてください。",
  "退職者の資格喪失届の提出期限はいつまでですか？",
  "建設業許可の新規申請で不足しやすい書類は何ですか？",
  "就業規則を変更する手順を教えてください。",
  "有給休暇の年5日取得義務の対象者は誰ですか？",
  "外国人社員の在留期間更新はいつから申請できますか？",
  "宇宙旅行保険の加入手続きについて教えてください。",
];
