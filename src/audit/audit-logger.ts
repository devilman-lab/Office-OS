import type { ActorType, AuditAction, AuditResult } from "@/domain/enums";
import type { AuditLog } from "@/domain/types";
import { auditRepository } from "@/repositories/audit.repository";
import { CURRENT_USER, AI_ACTOR, SYSTEM_ACTOR } from "@/security/current-user";

export interface AuditEntry {
  actor?: string;
  actorType: ActorType;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  result: AuditResult;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Central audit logger. Every AI request, knowledge lookup, permission check, approval,
 * DB registration and error passes through here. Nothing is logged with raw PII:
 * callers pass masked text or counts only.
 */
export const audit = {
  log(entry: AuditEntry): AuditLog {
    const actor = entry.actor ?? (entry.actorType === "human" ? CURRENT_USER.name : entry.actorType === "ai" ? AI_ACTOR : SYSTEM_ACTOR);
    return auditRepository.append({
      actor,
      actorType: entry.actorType,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      result: entry.result,
      reason: entry.reason ?? null,
      metadata: entry.metadata ?? {},
    });
  },
  ai(action: AuditAction, resourceType: string, resourceId: string | null, result: AuditResult, reason?: string, metadata?: Record<string, unknown>) {
    return this.log({ actorType: "ai", action, resourceType, resourceId, result, reason, metadata });
  },
  human(action: AuditAction, resourceType: string, resourceId: string | null, result: AuditResult, reason?: string, metadata?: Record<string, unknown>) {
    return this.log({ actorType: "human", action, resourceType, resourceId, result, reason, metadata });
  },
  system(action: AuditAction, resourceType: string, resourceId: string | null, result: AuditResult, reason?: string, metadata?: Record<string, unknown>) {
    return this.log({ actorType: "system", action, resourceType, resourceId, result, reason, metadata });
  },
};
