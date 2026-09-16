import { db } from "@/db";
import type { AuditLog, Case, InboxItem, Task } from "@/domain/types";
import { auditRepository, caseRepository, customerRepository, inboxRepository, proposalRepository, taskRepository } from "@/repositories";
import { todayDateOnly, daysBetween } from "@/lib/utils";
import { estimateSavedMinutes } from "./effectiveness.service";

export interface DashboardMetrics {
  operations: {
    unprocessedRequests: number;
    aiReviewRequired: number;
    activeCases: number;
    dueSoonTasks: number;
    overdueTasks: number;
  };
  aiProductivity: {
    aiAssistedRequests: number;
    proposalsCreated: number;
    proposalsApproved: number;
    tasksGenerated: number;
    estimatedTimeSavedMinutes: number;
  };
  pipeline: { label: string; count: number; hint: string }[];
  recentActivity: ActivityItem[];
  attention: { dueSoon: (Task & { caseTitle: string })[]; overdue: (Task & { caseTitle: string })[]; pendingInbox: InboxItem[]; pendingProposals: { id: string; intentLabel: string; confidence: string; createdAt: string; missing: number }[] };
  totals: { customers: number; cases: number; tasks: number; auditLogs: number; deniedOperations: number };
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  kind: "request" | "ai" | "approval" | "registration" | "denied" | "knowledge" | "system";
  title: string;
  detail: string | null;
  actor: string;
  href: string | null;
}

export function getDashboardMetrics(): DashboardMetrics {
  db();
  const today = todayDateOnly();
  const inboxCounts = inboxRepository.countByStatus();
  const cases = caseRepository.list();
  const tasks = taskRepository.list();
  const openTasks = tasks.filter((t) => t.status === "todo" || t.status === "in_progress");
  const caseTitle = new Map(cases.map((c) => [c.id, c.title]));

  const overdue = openTasks.filter((t) => t.dueDate && daysBetween(today, t.dueDate) < 0);
  const dueSoon = openTasks.filter((t) => t.dueDate && daysBetween(today, t.dueDate) >= 0 && daysBetween(today, t.dueDate) <= 7);
  const withCase = (t: Task) => ({ ...t, caseTitle: caseTitle.get(t.caseId) ?? t.caseId });

  const proposals = proposalRepository.list();
  const aiTasks = taskRepository.count({ source: "ai" });
  const approved = proposals.filter((p) => p.status === "approved").length;

  const statusCounts = caseRepository.countByStatus();
  const activeCases = cases.filter((c) => !["completed", "archived"].includes(c.status)).length;

  return {
    operations: {
      unprocessedRequests: (inboxCounts.not_processed ?? 0) + (inboxCounts.failed ?? 0),
      aiReviewRequired: proposalRepository.count({ status: "pending_review" }),
      activeCases,
      dueSoonTasks: dueSoon.length,
      overdueTasks: overdue.length,
    },
    aiProductivity: {
      aiAssistedRequests: proposals.length,
      proposalsCreated: proposals.length,
      proposalsApproved: approved,
      tasksGenerated: aiTasks,
      estimatedTimeSavedMinutes: estimateSavedMinutes(proposals.length),
    },
    pipeline: [
      { label: "未処理", count: (inboxCounts.not_processed ?? 0) + (inboxCounts.failed ?? 0), hint: "Inbox でAI整理を実行" },
      { label: "AI確認待ち", count: inboxCounts.review_required ?? 0, hint: "担当者の承認が必要" },
      { label: "登録済み", count: inboxCounts.registered ?? 0, hint: "案件・タスク化済み" },
      { label: "新規案件", count: statusCounts.new ?? 0, hint: "着手前" },
      { label: "対応中", count: (statusCounts.in_progress ?? 0) + (statusCounts.review ?? 0) + (statusCounts.waiting ?? 0), hint: "確認中・対応中・待ち" },
      { label: "完了", count: statusCounts.completed ?? 0, hint: "今期" },
    ],
    recentActivity: auditRepository.list({ limit: 12 }).map(toActivity),
    attention: {
      dueSoon: dueSoon.slice(0, 5).map(withCase),
      overdue: overdue.slice(0, 5).map(withCase),
      pendingInbox: inboxRepository.list().filter((i) => i.aiStatus === "not_processed").slice(0, 4),
      pendingProposals: proposals.filter((p) => p.status === "pending_review").slice(0, 4).map((p) => ({ id: p.id, intentLabel: p.intentLabel, confidence: p.confidence, createdAt: p.createdAt, missing: p.missingInformation.filter((m) => m.severity === "required").length })),
    },
    totals: {
      customers: customerRepository.count(),
      cases: cases.length,
      tasks: tasks.length,
      auditLogs: auditRepository.count(),
      deniedOperations: auditRepository.count({ result: "denied" }),
    },
  };
}

const ACTION_TITLE: Partial<Record<AuditLog["action"], string>> = {
  INBOX_RECEIVED: "新しい依頼を受信",
  AI_REQUEST: "AI処理を開始",
  PII_MASKING: "個人情報をマスキング",
  INTENT_CLASSIFICATION: "依頼内容を分類",
  ENTITY_EXTRACTION: "情報を抽出",
  KNOWLEDGE_SEARCH: "ナレッジを検索",
  KNOWLEDGE_REFERENCE: "参照元を記録",
  KNOWLEDGE_UNAVAILABLE: "ナレッジソースに接続できません",
  CASE_ANALYSIS: "案件を分析",
  TASK_GENERATION: "タスク候補を生成",
  PROPOSAL_VALIDATION: "AI出力を検証",
  AI_VALIDATION_FAILED: "AI出力の検証に失敗",
  PROPOSAL_CREATED: "AI提案を作成（確認が必要です）",
  PROPOSAL_EDITED: "提案を編集",
  HUMAN_APPROVAL: "担当者が承認",
  HUMAN_REJECTION: "担当者が却下",
  CASE_CREATED: "案件を登録",
  TASK_CREATED: "タスクを登録",
  TASK_UPDATED: "タスクを更新",
  CASE_UPDATED: "案件を更新",
  INTERACTION_CREATED: "対応履歴を記録",
  CUSTOMER_CREATED: "顧客を登録",
  DUPLICATE_DETECTED: "重複を検出",
  PERMISSION_CHECK: "権限チェック",
  WRITE_KNOWLEDGE: "ナレッジ書き込み（拒否）",
  DELETE_KNOWLEDGE: "ナレッジ削除（拒否）",
  AI_ANSWER: "AIが根拠付き回答を生成",
  AGENT_TOOL_CALL: "エージェントがツールを実行",
  API_SYNC: "外部連携を同期",
  API_ERROR: "外部連携エラー",
  API_RETRY: "外部連携を再試行",
  BACKUP: "バックアップ",
  RESTORE_POINT: "復元ポイント",
  DEMO_RESET: "デモデータをリセット",
  SETTINGS_CHANGED: "設定を変更",
};

export function toActivity(log: AuditLog): ActivityItem {
  const kind: ActivityItem["kind"] =
    log.result === "denied" ? "denied"
      : log.action === "INBOX_RECEIVED" ? "request"
        : ["HUMAN_APPROVAL", "HUMAN_REJECTION", "PROPOSAL_EDITED"].includes(log.action) ? "approval"
          : ["CASE_CREATED", "TASK_CREATED", "CUSTOMER_CREATED", "INTERACTION_CREATED"].includes(log.action) ? "registration"
            : ["KNOWLEDGE_SEARCH", "KNOWLEDGE_REFERENCE", "AI_ANSWER"].includes(log.action) ? "knowledge"
              : log.actorType === "ai" ? "ai" : "system";
  const href = hrefFor(log);
  return { id: log.id, timestamp: log.timestamp, kind, title: ACTION_TITLE[log.action] ?? log.action, detail: log.reason, actor: log.actor, href };
}

function hrefFor(log: AuditLog): string | null {
  if (!log.resourceId) return null;
  if (log.resourceType === "case") return `/cases/${log.resourceId}`;
  if (log.resourceType === "ai_proposal") return `/approvals/${log.resourceId}`;
  if (log.resourceType === "inbox_item") return `/inbox/${log.resourceId}`;
  if (log.resourceType === "knowledge" && log.resourceId.startsWith("KB-")) return `/knowledge?doc=${log.resourceId}`;
  if (log.resourceType === "integration") return `/integrations`;
  return null;
}

export function summarizeCase(c: Case) {
  return { id: c.id, title: c.title, status: c.status };
}
