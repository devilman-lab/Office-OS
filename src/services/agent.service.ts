import { getAIProvider } from "@/ai";
import { audit } from "@/audit/audit-logger";
import { db } from "@/db";
import type { AgentAction, Permission } from "@/domain/enums";
import { ApprovalRequiredError, KnowledgeUnavailableError, PermissionDeniedError } from "@/domain/errors";
import { AIProposalOutputSchema } from "@/domain/schemas";
import type { AgentPermission } from "@/domain/types";
import { getKnowledgeProvider } from "@/knowledge";
import { SETTING_KNOWLEDGE_UNAVAILABLE } from "@/knowledge/local-markdown-provider";
import { caseRepository, interactionRepository, permissionRepository, proposalRepository, settingsRepository } from "@/repositories";
import { enforceAgentPermission } from "@/security/permissions";
import { AGENT_ACTOR } from "@/security/current-user";
import { toSerializableHit } from "./pipeline.types";

export interface AgentTool {
  action: AgentAction;
  name: string;
  description: string;
  permission: Permission;
  approvalRequired: boolean;
  demoInput?: string;
  demoLabel: string;
}

const TOOL_META: Record<AgentAction, { name: string; demoLabel: string; demoInput?: string }> = {
  READ_KNOWLEDGE: { name: "Read Knowledge", demoLabel: "KB-001 を読み取る", demoInput: "KB-001" },
  SEARCH_KNOWLEDGE: { name: "Search Knowledge", demoLabel: "「資格取得 必要書類」で検索", demoInput: "資格取得 必要書類" },
  READ_CASE: { name: "Read Case", demoLabel: "CASE-0002 を読み取る", demoInput: "CASE-0002" },
  READ_INTERACTION: { name: "Read Interaction", demoLabel: "INT-0010（匿名化版）を読み取る", demoInput: "INT-0010" },
  CREATE_CASE_PROPOSAL: { name: "Create Case Proposal", demoLabel: "案件候補を作成する" },
  CREATE_TASK_PROPOSAL: { name: "Create Task Proposal", demoLabel: "タスク候補を作成する" },
  CREATE_CASE: { name: "Create Case", demoLabel: "案件を直接登録しようとする" },
  CREATE_TASK: { name: "Create Task", demoLabel: "タスクを直接登録しようとする" },
  UPDATE_CUSTOMER: { name: "Update Customer", demoLabel: "顧客情報を変更しようとする" },
  SEND_EXTERNAL_MESSAGE: { name: "Send External Message", demoLabel: "顧客へメールを送信しようとする" },
  WRITE_KNOWLEDGE: { name: "Write Knowledge", demoLabel: "KB-001 を書き換えようとする", demoInput: "KB-001" },
  DELETE_KNOWLEDGE: { name: "Delete Knowledge", demoLabel: "KB-001 を削除しようとする", demoInput: "KB-001" },
  DELETE_CASE: { name: "Delete Case", demoLabel: "案件を削除しようとする", demoInput: "CASE-0002" },
  EXPORT_PII: { name: "Export PII", demoLabel: "個人情報を出力しようとする" },
};

export function listAgentTools(): AgentTool[] {
  db();
  return permissionRepository.list().map((p: AgentPermission) => ({
    action: p.action,
    name: TOOL_META[p.action]?.name ?? p.action,
    description: p.description,
    permission: p.permission,
    approvalRequired: p.approvalRequired,
    demoInput: TOOL_META[p.action]?.demoInput,
    demoLabel: TOOL_META[p.action]?.demoLabel ?? p.action,
  }));
}

export interface AgentToolResult {
  action: string;
  outcome: "success" | "denied" | "approval_required" | "failed";
  title: string;
  message: string;
  reason: string | null;
  data: unknown;
  nextAction: string | null;
}

/** Executes an agent tool through the permission gate. Denied / approval-required calls never reach the data layer. */
export async function runAgentTool(action: AgentAction, input?: string): Promise<AgentToolResult> {
  db();
  try {
    enforceAgentPermission(action, { input: input ?? null, invokedFrom: "agent-console" });
  } catch (err) {
    if (err instanceof PermissionDeniedError) {
      if (action === "WRITE_KNOWLEDGE" || action === "DELETE_KNOWLEDGE") {
        audit.log({ actor: AGENT_ACTOR, actorType: "ai", action, resourceType: "knowledge", resourceId: input ?? null, result: "denied", reason: "Knowledge Source is read-only.", metadata: { attemptedAction: action } });
      } else {
        audit.log({ actor: AGENT_ACTOR, actorType: "ai", action: "AGENT_TOOL_CALL", resourceType: "agent_tool", resourceId: action, result: "denied", reason: err.message, metadata: { input: input ?? null } });
      }
      return { action, outcome: "denied", title: "ACCESS DENIED", message: "AIによる操作は制限されています。", reason: err.message, data: null, nextAction: action.includes("KNOWLEDGE") ? "ナレッジの更新が必要な場合は、担当者が Obsidian で編集し所長が確認します。" : "この操作は担当者が業務DBから直接行ってください。" };
    }
    if (err instanceof ApprovalRequiredError) {
      audit.log({ actor: AGENT_ACTOR, actorType: "ai", action: "AGENT_TOOL_CALL", resourceType: "agent_tool", resourceId: action, result: "warning", reason: err.message, metadata: { input: input ?? null } });
      return { action, outcome: "approval_required", title: "APPROVAL REQUIRED", message: "この操作には担当者の承認が必要です。AI は提案のみ作成できます。", reason: err.message, data: null, nextAction: "承認画面（Approvals）で担当者が内容を確認し、承認して登録してください。" };
    }
    throw err;
  }

  // Allowed tools
  switch (action) {
    case "READ_KNOWLEDGE": {
      const doc = await getKnowledgeProvider().getDocument(input ?? "KB-001");
      audit.log({ actor: AGENT_ACTOR, actorType: "ai", action: "AGENT_TOOL_CALL", resourceType: "knowledge", resourceId: doc?.id ?? input ?? null, result: doc ? "success" : "failed", reason: doc ? "ナレッジを読み取り" : "ドキュメントが見つかりません", metadata: {} });
      return { action, outcome: doc ? "success" : "failed", title: doc ? "READ OK" : "NOT FOUND", message: doc ? `${doc.title}（確認済み: ${doc.verified ? "YES" : "NO"}）を読み取りました。` : "ドキュメントが見つかりません。", reason: null, data: doc ? { id: doc.id, title: doc.title, category: doc.category, verified: doc.verified, excerpt: doc.content.split("\n").slice(2, 8).join("\n") } : null, nextAction: null };
    }
    case "SEARCH_KNOWLEDGE": {
      const q = input ?? "資格取得 必要書類";
      const hits = await getKnowledgeProvider().search(q, { limit: 3 });
      audit.log({ actor: AGENT_ACTOR, actorType: "ai", action: "KNOWLEDGE_SEARCH", resourceType: "knowledge", resourceId: null, result: "success", reason: `${hits.length} documents retrieved`, metadata: { query: q, documents: hits.map((h) => h.document.id) } });
      return { action, outcome: "success", title: "SEARCH OK", message: `${hits.length} 件のナレッジを取得しました。`, reason: null, data: hits.map(toSerializableHit), nextAction: null };
    }
    case "READ_CASE": {
      const c = caseRepository.findById(input ?? "CASE-0002");
      audit.log({ actor: AGENT_ACTOR, actorType: "ai", action: "AGENT_TOOL_CALL", resourceType: "case", resourceId: c?.id ?? null, result: c ? "success" : "failed", reason: "案件を読み取り（匿名化済みフィールドのみ）", metadata: {} });
      return { action, outcome: c ? "success" : "failed", title: c ? "READ OK" : "NOT FOUND", message: c ? `${c.id} を読み取りました（顧客名は AI に渡されません）。` : "案件が見つかりません。", reason: null, data: c ? { id: c.id, status: c.status, priority: c.priority, dueDate: c.dueDate, assignee: c.assignee, customer: "[ORG_MASKED]" } : null, nextAction: null };
    }
    case "READ_INTERACTION": {
      const i = interactionRepository.findById(input ?? "INT-0010");
      audit.log({ actor: AGENT_ACTOR, actorType: "ai", action: "AGENT_TOOL_CALL", resourceType: "interaction", resourceId: i?.id ?? null, result: i ? "success" : "failed", reason: "対応履歴（マスキング版）を読み取り", metadata: {} });
      return { action, outcome: i ? "success" : "failed", title: i ? "READ OK" : "NOT FOUND", message: i ? `${i.id} のマスキング版を読み取りました。原本は AI に渡されません。` : "対応履歴が見つかりません。", reason: null, data: i ? { id: i.id, type: i.type, maskedContent: i.maskedContent } : null, nextAction: null };
    }
    case "CREATE_CASE_PROPOSAL":
    case "CREATE_TASK_PROPOSAL": {
      const pending = proposalRepository.count({ status: "pending_review" });
      audit.log({ actor: AGENT_ACTOR, actorType: "ai", action: "AGENT_TOOL_CALL", resourceType: "agent_tool", resourceId: action, result: "success", reason: "提案作成は Inbox のパイプラインから実行", metadata: {} });
      return { action, outcome: "success", title: "ALLOWED", message: `提案の作成は許可されています。現在 ${pending} 件の提案が確認待ちです。`, reason: null, data: null, nextAction: "Inbox の「AIで整理」から実行すると、提案が作成され承認待ちになります。" };
    }
    default:
      return { action, outcome: "failed", title: "UNSUPPORTED", message: "このツールはデモでは実行できません。", reason: null, data: null, nextAction: null };
  }
}

export type DemoErrorKind = "INVALID_AI_OUTPUT" | "KNOWLEDGE_UNAVAILABLE";

/** Error-handling demonstrations that exercise real code paths (Zod gate / knowledge outage). */
export async function runDemoError(kind: DemoErrorKind): Promise<AgentToolResult> {
  db();
  if (kind === "INVALID_AI_OUTPUT") {
    const badOutput = { intent: "social_insurance_enrollment", summary: "短い", caseProposal: { description: "title と priority が欠落した出力", dueDate: "来週" }, taskProposals: [] };
    const parsed = AIProposalOutputSchema.safeParse(badOutput);
    const issues = parsed.success ? [] : parsed.error.issues.map((i) => ({ path: i.path.join(".") || "root", message: i.message }));
    audit.ai("AI_VALIDATION_FAILED", "ai_proposal", null, "failed", "AI 出力がスキーマ検証に失敗しました。DB には保存されません。", { issues, provider: getAIProvider().name });
    return { action: "VALIDATE_AI_OUTPUT", outcome: "failed", title: "AI RESPONSE VALIDATION FAILED", message: `AI の出力が Zod スキーマ検証に失敗しました（${issues.length} 件）。不正な出力は業務DBに保存されません。`, reason: "title / priority / taskProposals が欠落・不正", data: issues, nextAction: "AI 処理を再実行してください。再発する場合は担当者が手動で案件登録します。" };
  }
  // KNOWLEDGE_UNAVAILABLE: temporarily flag the source as unreachable, attempt a search, restore.
  const previous = settingsRepository.get(SETTING_KNOWLEDGE_UNAVAILABLE, "false");
  settingsRepository.set(SETTING_KNOWLEDGE_UNAVAILABLE, "true");
  try {
    await getKnowledgeProvider().search("資格取得 必要書類");
    return { action: "SEARCH_KNOWLEDGE", outcome: "success", title: "UNEXPECTED", message: "ナレッジ検索が成功しました。", reason: null, data: null, nextAction: null };
  } catch (err) {
    const message = err instanceof KnowledgeUnavailableError ? err.message : String(err);
    audit.ai("KNOWLEDGE_UNAVAILABLE", "knowledge", null, "failed", message, { simulated: true });
    return { action: "SEARCH_KNOWLEDGE", outcome: "failed", title: "KNOWLEDGE UNAVAILABLE", message, reason: "ナレッジソースへの接続に失敗（シミュレーション）", data: null, nextAction: "AI はナレッジなしで推測回答を行いません。連携画面で Obsidian コネクタを確認し、復旧後に再実行してください。" };
  } finally {
    settingsRepository.set(SETTING_KNOWLEDGE_UNAVAILABLE, previous);
  }
}
