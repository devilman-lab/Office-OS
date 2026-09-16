import type { AuditAction, AuditResult, ActorType } from "@/domain/enums";
import { daysAgoIso } from "./helpers";

export interface SeedAudit {
  timestamp: string;
  actor: string;
  actorType: ActorType;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  result: AuditResult;
  reason: string | null;
  metadata: Record<string, unknown>;
}

const H = "佐藤（所長）";
const A = "ai-assistant";
const G = "ai-agent";
const S = "system";

function e(days: number, hour: number, minute: number, actor: string, actorType: ActorType, action: AuditAction, resourceType: string, resourceId: string | null, result: AuditResult, reason: string | null, metadata: Record<string, unknown> = {}): SeedAudit {
  return { timestamp: daysAgoIso(days, hour, minute), actor, actorType, action, resourceType, resourceId, result, reason, metadata };
}

export const AUDIT_LOGS: SeedAudit[] = [
  // --- 8 days ago: PROP-0002 flow (approved → CASE-0005)
  e(8, 10, 18, S, "system", "INBOX_RECEIVED", "interaction", "INT-0008", "success", "Gmail から受信", { source: "gmail" }),
  e(8, 10, 19, A, "ai", "AI_REQUEST", "interaction", "INT-0008", "success", "AI整理を開始", { provider: "mock" }),
  e(8, 10, 19, A, "ai", "PII_MASKING", "interaction", "INT-0008", "success", "PERSON 1 件をマスキング", { PERSON: 1, ORGANIZATION: 0 }),
  e(8, 10, 19, A, "ai", "INTENT_CLASSIFICATION", "interaction", "INT-0008", "success", "被扶養者 異動手続き", { confidence: "high" }),
  e(8, 10, 20, A, "ai", "KNOWLEDGE_SEARCH", "knowledge", null, "success", "2 documents retrieved", { query: "扶養 異動届 被扶養者 必要書類", documents: ["KB-004", "KB-009"] }),
  e(8, 10, 20, A, "ai", "PROPOSAL_VALIDATION", "ai_proposal", "PROP-0002", "success", "スキーマ検証 OK", {}),
  e(8, 10, 20, A, "ai", "PROPOSAL_CREATED", "ai_proposal", "PROP-0002", "success", "案件候補 1 件 / タスク候補 2 件", {}),
  e(8, 11, 5, H, "human", "HUMAN_APPROVAL", "ai_proposal", "PROP-0002", "success", "承認して登録", { note: "内容確認済み。" }),
  e(8, 11, 5, H, "human", "CASE_CREATED", "case", "CASE-0005", "success", "AI提案から案件を登録", { proposalId: "PROP-0002" }),
  e(8, 11, 5, H, "human", "TASK_CREATED", "task", "TASK-0010", "success", null, { caseId: "CASE-0005" }),
  e(8, 11, 5, H, "human", "TASK_CREATED", "task", "TASK-0011", "success", null, { caseId: "CASE-0005" }),
  e(8, 11, 5, S, "system", "KNOWLEDGE_REFERENCE", "knowledge_reference", "REF-0001", "success", "案件に参照元を紐付け", { caseId: "CASE-0005", documentId: "KB-004" }),
  // --- 5 days ago: assistant usage & denied agent action
  e(5, 14, 2, H, "human", "AI_REQUEST", "assistant", null, "success", "質問: 有給休暇 年5日 取得義務", {}),
  e(5, 14, 2, A, "ai", "KNOWLEDGE_SEARCH", "knowledge", null, "success", "1 document retrieved", { query: "有給休暇 年5日 取得義務", documents: ["KB-008"] }),
  e(5, 14, 3, A, "ai", "AI_ANSWER", "assistant", null, "success", "grounded answer (confidence: high)", { citedDocuments: ["KB-008"] }),
  e(5, 15, 30, G, "ai", "PERMISSION_CHECK", "agent_permission", "WRITE_KNOWLEDGE", "denied", "AI agents are not permitted to modify the Knowledge Source.", { permission: "denied" }),
  e(5, 15, 30, G, "ai", "WRITE_KNOWLEDGE", "knowledge", "KB-008", "denied", "Knowledge Source is read-only.", { attemptedBy: "agent-demo" }),
  // --- 4 days ago: integration sync
  e(4, 9, 0, S, "system", "API_SYNC", "integration", "INTG-gmail", "success", "SYNC COMPLETED: 3 new records", { records: 3 }),
  e(4, 9, 1, S, "system", "DUPLICATE_DETECTED", "integration", "INTG-notion", "warning", "DUPLICATE DETECTED: 案件タイトルが既存案件と一致", { existingId: "CASE-0002" }),
  e(4, 3, 0, S, "system", "BACKUP", "backup", "BKP-0001", "success", "日次自動バックアップ完了", { records: 55 }),
  // --- 3 days ago: PROP-0003 rejected
  e(3, 9, 0, S, "system", "INBOX_RECEIVED", "inbox_item", "INBOX-007", "success", "Gmail から受信", { source: "gmail" }),
  e(3, 9, 1, A, "ai", "AI_REQUEST", "inbox_item", "INBOX-007", "success", "AI整理を開始", { provider: "mock" }),
  e(3, 9, 1, A, "ai", "PII_MASKING", "inbox_item", "INBOX-007", "success", "マスキング対象なし", { PERSON: 0 }),
  e(3, 9, 1, A, "ai", "INTENT_CLASSIFICATION", "inbox_item", "INBOX-007", "warning", "分類不能（confidence: low）", { confidence: "low" }),
  e(3, 9, 2, A, "ai", "KNOWLEDGE_SEARCH", "knowledge", null, "warning", "0 documents retrieved", { query: "" }),
  e(3, 9, 2, A, "ai", "PROPOSAL_CREATED", "ai_proposal", "PROP-0003", "success", "確認が必要です（confidence: low）", {}),
  e(3, 9, 40, H, "human", "HUMAN_REJECTION", "ai_proposal", "PROP-0003", "success", "営業メールのため案件化不要。", {}),
  e(3, 3, 0, S, "system", "BACKUP", "backup", "BKP-0002", "success", "日次自動バックアップ完了", { records: 58 }),
  // --- 2 days ago: PROP-0001 (pending)
  e(2, 10, 30, S, "system", "INBOX_RECEIVED", "inbox_item", "INBOX-006", "success", "Gmail から受信", { source: "gmail" }),
  e(2, 10, 31, A, "ai", "AI_REQUEST", "inbox_item", "INBOX-006", "success", "AI整理を開始", { provider: "mock" }),
  e(2, 10, 31, A, "ai", "PII_MASKING", "inbox_item", "INBOX-006", "success", "PERSON 2 件 / ORGANIZATION 1 件をマスキング", { PERSON: 2, ORGANIZATION: 1 }),
  e(2, 10, 31, A, "ai", "INTENT_CLASSIFICATION", "inbox_item", "INBOX-006", "success", "在留資格 申請・変更", { confidence: "high" }),
  e(2, 10, 32, A, "ai", "KNOWLEDGE_SEARCH", "knowledge", null, "success", "2 documents retrieved", { query: "在留資格 変更 就労 必要書類 入管", documents: ["KB-011", "KB-014"] }),
  e(2, 10, 33, A, "ai", "PROPOSAL_VALIDATION", "ai_proposal", "PROP-0001", "success", "スキーマ検証 OK", {}),
  e(2, 10, 33, A, "ai", "PROPOSAL_CREATED", "ai_proposal", "PROP-0001", "success", "案件候補 1 件 / タスク候補 3 件 — 確認が必要です", {}),
  // --- today
  e(1, 3, 0, S, "system", "BACKUP", "backup", "BKP-0003", "success", "日次自動バックアップ完了", { records: 61 }),
  e(0, 8, 45, S, "system", "API_ERROR", "integration", "INTG-lineworks", "failed", "SYNC FAILED: 認証トークンの期限切れ（シミュレーション）", { retryable: true }),
  e(0, 9, 15, S, "system", "API_SYNC", "integration", "INTG-gmail", "success", "SYNC COMPLETED: 2 new records", { records: 2 }),
  e(0, 9, 15, S, "system", "INBOX_RECEIVED", "inbox_item", "INBOX-001", "success", "Gmail から受信", { source: "gmail" }),
  e(0, 8, 41, S, "system", "INBOX_RECEIVED", "inbox_item", "INBOX-002", "success", "LINE WORKS から受信", { source: "line_works" }),
];
