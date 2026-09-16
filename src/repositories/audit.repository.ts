import { getDb } from "@/db/client";
import type { AuditLog } from "@/domain/types";
import type { AuditAction, AuditResult, ActorType } from "@/domain/enums";
import { nowIso, safeJsonParse } from "@/lib/utils";

type Row = {
  id: string; seq: number; actor: string; actor_type: string; action: string; resource_type: string; resource_id: string | null;
  result: string; reason: string | null; metadata: string; timestamp: string;
};

function map(r: Row): AuditLog {
  return {
    id: r.id,
    actor: r.actor,
    actorType: r.actor_type as ActorType,
    action: r.action as AuditAction,
    resourceType: r.resource_type,
    resourceId: r.resource_id,
    result: r.result as AuditResult,
    reason: r.reason,
    metadata: safeJsonParse<Record<string, unknown>>(r.metadata, {}),
    timestamp: r.timestamp,
  };
}

export interface AuditFilter {
  action?: string;
  result?: string;
  actorType?: string;
  resourceId?: string;
  q?: string;
  limit?: number;
}

export const auditRepository = {
  list(filter: AuditFilter = {}): AuditLog[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter.action) { where.push("action = ?"); params.push(filter.action); }
    if (filter.result) { where.push("result = ?"); params.push(filter.result); }
    if (filter.actorType) { where.push("actor_type = ?"); params.push(filter.actorType); }
    if (filter.resourceId) { where.push("(resource_id = ? OR metadata LIKE ?)"); params.push(filter.resourceId, `%${filter.resourceId}%`); }
    if (filter.q) { where.push("(action LIKE ? OR reason LIKE ? OR resource_id LIKE ? OR metadata LIKE ?)"); const like = `%${filter.q}%`; params.push(like, like, like, like); }
    const limit = filter.limit ?? 200;
    const sql = `SELECT * FROM audit_logs ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY seq DESC LIMIT ${limit}`;
    return (getDb().prepare(sql).all(...params) as Row[]).map(map);
  },
  append(input: Omit<AuditLog, "id" | "timestamp"> & { timestamp?: string }): AuditLog {
    const db = getDb();
    const seqRow = db.prepare("SELECT COALESCE(MAX(seq),0) + 1 AS s FROM audit_logs").get() as { s: number };
    const seq = seqRow.s;
    const id = `LOG-${String(seq).padStart(6, "0")}`;
    const ts = input.timestamp ?? nowIso();
    db.prepare(
      `INSERT INTO audit_logs(id, seq, actor, actor_type, action, resource_type, resource_id, result, reason, metadata, timestamp)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(id, seq, input.actor, input.actorType, input.action, input.resourceType, input.resourceId, input.result, input.reason, JSON.stringify(input.metadata ?? {}), ts);
    return map(db.prepare("SELECT * FROM audit_logs WHERE id = ?").get(id) as Row);
  },
  count(filter?: { action?: string; result?: string }): number {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter?.action) { where.push("action = ?"); params.push(filter.action); }
    if (filter?.result) { where.push("result = ?"); params.push(filter.result); }
    const sql = `SELECT COUNT(*) c FROM audit_logs ${where.length ? "WHERE " + where.join(" AND ") : ""}`;
    return (getDb().prepare(sql).get(...params) as { c: number }).c;
  },
  countByResult(): Record<string, number> {
    const rows = getDb().prepare("SELECT result, COUNT(*) c FROM audit_logs GROUP BY result").all() as { result: string; c: number }[];
    return Object.fromEntries(rows.map((r) => [r.result, r.c]));
  },
};
