import { db } from "@/db";
import { auditRepository, caseRepository, proposalRepository, taskRepository } from "@/repositories";

/**
 * Effectiveness model (DEMO ASSUMPTIONS — not measured business results).
 * Baseline: a request handled fully by hand (read, classify, look up knowledge, register case + tasks) ≈ 25 min.
 * With AI assistance the reviewer confirms/edits a proposal ≈ 15.6 min per request (the remaining work is unchanged).
 * The production system replaces these constants with measured before/after timings per task type.
 */
export const EFFECTIVENESS_ASSUMPTIONS = {
  manualMinutesPerRequest: 25,
  aiAssistedMinutesPerRequest: 15.6,
  weeklyRequestsBaseline: 30,
  baselineWeeklyHoursBefore: 12.5,
} as const;

export function estimateSavedMinutes(assistedRequests: number): number {
  const { manualMinutesPerRequest, aiAssistedMinutesPerRequest } = EFFECTIVENESS_ASSUMPTIONS;
  return Math.round(assistedRequests * (manualMinutesPerRequest - aiAssistedMinutesPerRequest) * 10) / 10;
}

export interface EffectivenessMetrics {
  assumptions: typeof EFFECTIVENESS_ASSUMPTIONS;
  live: {
    aiAssistedRequests: number;
    proposalsApproved: number;
    casesCreatedByAI: number;
    tasksGeneratedByAI: number;
    averageProcessingMs: number;
    estimatedManualMinutes: number;
    estimatedAssistedMinutes: number;
    estimatedSavedMinutes: number;
    manualWorkReductionPct: number;
    deniedOperations: number;
    knowledgeReferences: number;
  };
  weekly: { beforeHours: number; afterHours: number; savedHours: number; reductionPct: number };
  breakdown: { activity: string; beforeMin: number; afterMin: number; note: string }[];
  trend: { week: string; before: number; after: number }[];
}

export function getEffectivenessMetrics(): EffectivenessMetrics {
  db();
  const a = EFFECTIVENESS_ASSUMPTIONS;
  const proposals = proposalRepository.list();
  const assisted = proposals.length;
  const approved = proposals.filter((p) => p.status === "approved").length;
  const { total, count } = proposalRepository.sumProcessingMs();
  const manual = assisted * a.manualMinutesPerRequest;
  const withAi = assisted * a.aiAssistedMinutesPerRequest;
  const saved = estimateSavedMinutes(assisted);
  const reductionPct = Math.round(((a.manualMinutesPerRequest - a.aiAssistedMinutesPerRequest) / a.manualMinutesPerRequest) * 1000) / 10;

  const beforeHours = a.baselineWeeklyHoursBefore;
  const afterHours = Math.round((a.weeklyRequestsBaseline * a.aiAssistedMinutesPerRequest) / 60 * 10) / 10;

  return {
    assumptions: a,
    live: {
      aiAssistedRequests: assisted,
      proposalsApproved: approved,
      casesCreatedByAI: caseRepository.count({ source: "ai" }),
      tasksGeneratedByAI: taskRepository.count({ source: "ai" }),
      averageProcessingMs: count ? Math.round(total / count) : 0,
      estimatedManualMinutes: manual,
      estimatedAssistedMinutes: Math.round(withAi * 10) / 10,
      estimatedSavedMinutes: saved,
      manualWorkReductionPct: reductionPct,
      deniedOperations: auditRepository.count({ result: "denied" }),
      knowledgeReferences: auditRepository.count({ action: "KNOWLEDGE_REFERENCE" }),
    },
    weekly: { beforeHours, afterHours, savedHours: Math.round((beforeHours - afterHours) * 10) / 10, reductionPct: Math.round(((beforeHours - afterHours) / beforeHours) * 1000) / 10 },
    breakdown: [
      { activity: "依頼内容の読解・分類", beforeMin: 5, afterMin: 1.5, note: "AI分類結果の確認のみ" },
      { activity: "個人情報の整理・匿名化", beforeMin: 2, afterMin: 0.3, note: "自動マスキング（目視確認）" },
      { activity: "関連ナレッジ・過去案件の検索", beforeMin: 6, afterMin: 2, note: "参照元付きで提示" },
      { activity: "案件登録（顧客・期限・担当）", beforeMin: 5, afterMin: 3, note: "候補を確認・編集して承認" },
      { activity: "タスク分解・期限設定", beforeMin: 5, afterMin: 2.8, note: "候補を確認・編集" },
      { activity: "対応履歴の記録", beforeMin: 2, afterMin: 0, note: "承認時に自動記録" },
      { activity: "監査記録", beforeMin: 0, afterMin: 0, note: "自動（手作業ゼロ）" },
    ],
    trend: [
      { week: "W-4", before: 12.5, after: 12.5 },
      { week: "W-3", before: 12.5, after: 11.1 },
      { week: "W-2", before: 12.5, after: 9.4 },
      { week: "W-1", before: 12.5, after: 8.3 },
      { week: "今週", before: 12.5, after: afterHours },
    ],
  };
}
