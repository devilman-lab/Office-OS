import type { AgentAction, Permission } from "@/domain/enums";
import { ApprovalRequiredError, PermissionDeniedError } from "@/domain/errors";
import { permissionRepository } from "@/repositories/permission.repository";
import { audit } from "@/audit/audit-logger";
import { AGENT_ACTOR } from "./current-user";

export interface PermissionCheck {
  action: AgentAction;
  permission: Permission;
  reason: string;
}

const DENY_REASON: Partial<Record<AgentAction, string>> = {
  WRITE_KNOWLEDGE: "AI agents are not permitted to modify the Knowledge Source. ナレッジ正本（Obsidian）は読み取り専用です。",
  DELETE_KNOWLEDGE: "AI agents are not permitted to delete Knowledge documents. ナレッジ正本の削除は人間の管理者のみが行えます。",
  DELETE_CASE: "AI agents cannot delete business records. 案件の削除は担当者のみが行えます。",
  EXPORT_PII: "AI agents cannot export personal information. 個人情報のエクスポートは禁止されています。",
};

/**
 * Looks up the permission for an agent action, records the check in the audit log,
 * and returns the decision. Unknown actions are denied by default (deny-by-default policy).
 */
export function checkAgentPermission(action: AgentAction, context?: Record<string, unknown>): PermissionCheck {
  const entry = permissionRepository.findByAction(action);
  const permission: Permission = entry?.permission ?? "denied";
  const reason =
    permission === "denied"
      ? DENY_REASON[action] ?? `${action} は AI エージェントに許可されていません。`
      : permission === "approval_required"
        ? `${action} には担当者の承認が必要です。AI は提案のみ作成できます。`
        : `${action} は許可されています。`;

  audit.log({
    actor: AGENT_ACTOR,
    actorType: "ai",
    action: "PERMISSION_CHECK",
    resourceType: "agent_permission",
    resourceId: action,
    result: permission === "denied" ? "denied" : permission === "approval_required" ? "warning" : "success",
    reason,
    metadata: { permission, ...(context ?? {}) },
  });

  return { action, permission, reason };
}

/** Enforces the permission: throws for denied / approval-required actions. */
export function enforceAgentPermission(action: AgentAction, context?: Record<string, unknown>): PermissionCheck {
  const check = checkAgentPermission(action, context);
  if (check.permission === "denied") throw new PermissionDeniedError(action, check.reason);
  if (check.permission === "approval_required") throw new ApprovalRequiredError(action);
  return check;
}
