import { getDb, nextId } from "@/db/client";
import type { Interaction } from "@/domain/types";
import { nowIso } from "@/lib/utils";

type Row = {
  id: string; customer_id: string | null; case_id: string | null; type: string; source: string; subject: string;
  content: string; masked_content: string; inbox_item_id: string | null; created_at: string;
};

function map(r: Row): Interaction {
  return {
    id: r.id,
    customerId: r.customer_id,
    caseId: r.case_id,
    type: r.type as Interaction["type"],
    source: r.source as Interaction["source"],
    subject: r.subject,
    content: r.content,
    maskedContent: r.masked_content,
    inboxItemId: r.inbox_item_id,
    createdAt: r.created_at,
  };
}

export const interactionRepository = {
  list(): Interaction[] {
    return (getDb().prepare("SELECT * FROM interactions ORDER BY created_at DESC").all() as Row[]).map(map);
  },
  listByCase(caseId: string): Interaction[] {
    return (getDb().prepare("SELECT * FROM interactions WHERE case_id = ? ORDER BY created_at DESC").all(caseId) as Row[]).map(map);
  },
  findById(id: string): Interaction | null {
    const r = getDb().prepare("SELECT * FROM interactions WHERE id = ?").get(id) as Row | undefined;
    return r ? map(r) : null;
  },
  search(q: string): Interaction[] {
    const like = `%${q}%`;
    return (getDb().prepare("SELECT * FROM interactions WHERE subject LIKE ? OR content LIKE ? LIMIT 10").all(like, like) as Row[]).map(map);
  },
  create(input: Omit<Interaction, "id" | "createdAt"> & { id?: string; createdAt?: string }): Interaction {
    const db = getDb();
    const id = input.id ?? nextId(db, "INT");
    const ts = input.createdAt ?? nowIso();
    db.prepare(
      `INSERT INTO interactions(id, customer_id, case_id, type, source, subject, content, masked_content, inbox_item_id, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).run(id, input.customerId, input.caseId, input.type, input.source, input.subject, input.content, input.maskedContent, input.inboxItemId, ts);
    return this.findById(id)!;
  },
  link(id: string, patch: { caseId?: string | null; customerId?: string | null }): Interaction {
    const db = getDb();
    if (patch.caseId !== undefined) db.prepare("UPDATE interactions SET case_id = ? WHERE id = ?").run(patch.caseId, id);
    if (patch.customerId !== undefined) db.prepare("UPDATE interactions SET customer_id = ? WHERE id = ?").run(patch.customerId, id);
    return this.findById(id)!;
  },
  count(): number {
    return (getDb().prepare("SELECT COUNT(*) c FROM interactions").get() as { c: number }).c;
  },
};
