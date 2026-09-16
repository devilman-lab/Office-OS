import type { AIProposal, KnowledgeHit, MaskedEntity } from "@/domain/types";
import type { ExtractedEntities, IntentResult } from "@/ai/provider";

export const PIPELINE_STEPS = [
  { key: "input_received", label: "INPUT RECEIVED", labelJa: "入力受付" },
  { key: "pii_masking", label: "PII MASKING", labelJa: "個人情報マスキング" },
  { key: "intent_classification", label: "INTENT CLASSIFICATION", labelJa: "依頼内容の分類" },
  { key: "entity_extraction", label: "ENTITY EXTRACTION", labelJa: "情報抽出" },
  { key: "knowledge_search", label: "KNOWLEDGE SEARCH", labelJa: "ナレッジ検索" },
  { key: "case_analysis", label: "CASE ANALYSIS", labelJa: "案件分析" },
  { key: "task_generation", label: "TASK GENERATION", labelJa: "タスク候補生成" },
  { key: "validation", label: "VALIDATION", labelJa: "出力検証" },
  { key: "human_review_required", label: "HUMAN REVIEW REQUIRED", labelJa: "担当者確認待ち" },
] as const;

export type PipelineStepKey = (typeof PIPELINE_STEPS)[number]["key"];
export type PipelineStepStatus = "success" | "warning" | "failed" | "skipped";

export interface PipelineStep {
  key: PipelineStepKey;
  index: number;
  label: string;
  labelJa: string;
  status: PipelineStepStatus;
  durationMs: number;
  summary: string;
  detail?: Record<string, unknown>;
}

export interface SerializableKnowledgeHit {
  documentId: string;
  title: string;
  category: string;
  verified: boolean;
  verifiedBy: string | null;
  updatedAt: string;
  relevance: KnowledgeHit["relevance"];
  score: number;
  matchedTerms: string[];
  snippet: string;
}

export interface PipelineResult {
  inboxItemId: string;
  status: "review_required" | "failed";
  steps: PipelineStep[];
  masking: { original: string; masked: string; counts: Record<MaskedEntity["type"], number>; entities: MaskedEntity[] } | null;
  intent: IntentResult | null;
  entities: ExtractedEntities | null;
  knowledgeQuery: string | null;
  knowledge: SerializableKnowledgeHit[];
  proposal: AIProposal | null;
  error: { code: string; message: string; nextAction: string; details?: unknown } | null;
  totalMs: number;
}

export function toSerializableHit(h: KnowledgeHit): SerializableKnowledgeHit {
  return {
    documentId: h.document.id,
    title: h.document.title,
    category: h.document.category,
    verified: h.document.verified,
    verifiedBy: h.document.verifiedBy,
    updatedAt: h.document.updatedAt,
    relevance: h.relevance,
    score: h.score,
    matchedTerms: h.matchedTerms,
    snippet: h.snippet,
  };
}
