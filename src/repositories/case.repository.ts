import { getDb, nextId } from "@/db/client";
import type { Case } from "@/domain/types";
import type { CaseStatus } from "@/domain/enums";
import { nowIso } from "@/lib/utils";

type Row = {
  id: string; customer_id: string; title: string; description: string; status: string; priority: string;
  due_date: string | null; assignee: string; source: string; proposal_id: string | null; created_at: string; updated_at: string;
};

function map(r: Row): Case {
  return {
    id: r.id,
    customerId: r.customer_id,
    title: r.title,
    description: r.description,
    status: r.status as Case["status"],
    priority: r.priority as Case["priority"],
    dueDate: r.due_date,
    assignee: r.assignee,
    source: r.source as Case["source"],
    proposalId: r.proposal_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const caseRepository = {
  list(filter?: { status?: CaseStatus; customerId?: string }): Case[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter?.status) { where.push("status = ?"); params.push(filter.status); }
    if (filter?.customerId) { where.push("customer_id = ?"); params.push(filter.customerId); }
    const sql = `SELECT * FROM cases ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC`;
    return (getDb().prepare(sql).all(...params) as Row[]).map(map);
  },
  findById(id: string): Case | null {
    const r = getDb().prepare("SELECT * FROM cases WHERE id = ?").get(id) as Row | undefined;
    return r ? map(r) : null;
  },
  findOpenByCustomerAndTitle(customerId: string, title: string): Case | null {
    const r = getDb()
      .prepare("SELECT * FROM cases WHERE customer_id = ? AND title = ? AND status NOT IN ('completed','archived')")
      .get(customerId, title) as Row | undefined;
    return r ? map(r) : null;
  },
  search(q: string): Case[] {
    const like = `%${q}%`;
    return (getDb().prepare("SELECT * FROM cases WHERE title LIKE ? OR description LIKE ? OR id LIKE ? ORDER BY created_at DESC LIMIT 10").all(like, like, like) as Row[]).map(map);
  },
  create(input: Omit<Case, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string }): Case {
    const db = getDb();
    const id = input.id ?? nextId(db, "CASE");
    const ts = input.createdAt ?? nowIso();
    db.prepare(
      `INSERT INTO cases(id, customer_id, title, description, status, priority, due_date, assignee, source, proposal_id, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(id, input.customerId, input.title, input.description, input.status, input.priority, input.dueDate, input.assignee, input.source, input.proposalId, ts, ts);
    return this.findById(id)!;
  },
  update(id: string, patch: Partial<Pick<Case, "status" | "priority" | "dueDate" | "assignee" | "title" | "description">>): Case {
    const db = getDb();
    const sets: string[] = [];
    const params: unknown[] = [];
    if (patch.status !== undefined) { sets.push("status = ?"); params.push(patch.status); }
    if (patch.priority !== undefined) { sets.push("priority = ?"); params.push(patch.priority); }
    if (patch.dueDate !== undefined) { sets.push("due_date = ?"); params.push(patch.dueDate); }
    if (patch.assignee !== undefined) { sets.push("assignee = ?"); params.push(patch.assignee); }
    if (patch.title !== undefined) { sets.push("title = ?"); params.push(patch.title); }
    if (patch.description !== undefined) { sets.push("description = ?"); params.push(patch.description); }
    sets.push("updated_at = ?"); params.push(nowIso());
    params.push(id);
    db.prepare(`UPDATE cases SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    return this.findById(id)!;
  },
  countByStatus(): Record<string, number> {
    const rows = getDb().prepare("SELECT status, COUNT(*) c FROM cases GROUP BY status").all() as { status: string; c: number }[];
    return Object.fromEntries(rows.map((r) => [r.status, r.c]));
  },
  count(filter?: { source?: string }): number {
    if (filter?.source) return (getDb().prepare("SELECT COUNT(*) c FROM cases WHERE source = ?").get(filter.source) as { c: number }).c;
    return (getDb().prepare("SELECT COUNT(*) c FROM cases").get() as { c: number }).c;
  },
};
