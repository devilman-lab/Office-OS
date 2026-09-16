import { getDb, nextId } from "@/db/client";
import type { InboxItem } from "@/domain/types";
import type { InboxAiStatus } from "@/domain/enums";

type Row = {
  id: string; source: string; sender: string; sender_organization: string | null; subject: string; content: string;
  received_at: string; ai_status: string; proposal_id: string | null; interaction_id: string | null;
};

function map(r: Row): InboxItem {
  return {
    id: r.id,
    source: r.source as InboxItem["source"],
    sender: r.sender,
    senderOrganization: r.sender_organization,
    subject: r.subject,
    content: r.content,
    receivedAt: r.received_at,
    aiStatus: r.ai_status as InboxAiStatus,
    proposalId: r.proposal_id,
    interactionId: r.interaction_id,
  };
}

export const inboxRepository = {
  list(): InboxItem[] {
    return (getDb().prepare("SELECT * FROM inbox_items ORDER BY received_at DESC").all() as Row[]).map(map);
  },
  findById(id: string): InboxItem | null {
    const r = getDb().prepare("SELECT * FROM inbox_items WHERE id = ?").get(id) as Row | undefined;
    return r ? map(r) : null;
  },
  create(input: Omit<InboxItem, "id"> & { id?: string }): InboxItem {
    const db = getDb();
    const id = input.id ?? nextId(db, "INBOX", 3);
    db.prepare(
      `INSERT INTO inbox_items(id, source, sender, sender_organization, subject, content, received_at, ai_status, proposal_id, interaction_id)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ).run(id, input.source, input.sender, input.senderOrganization, input.subject, input.content, input.receivedAt, input.aiStatus, input.proposalId, input.interactionId);
    return this.findById(id)!;
  },
  update(id: string, patch: Partial<Pick<InboxItem, "aiStatus" | "proposalId" | "interactionId">>): InboxItem {
    const db = getDb();
    if (patch.aiStatus !== undefined) db.prepare("UPDATE inbox_items SET ai_status = ? WHERE id = ?").run(patch.aiStatus, id);
    if (patch.proposalId !== undefined) db.prepare("UPDATE inbox_items SET proposal_id = ? WHERE id = ?").run(patch.proposalId, id);
    if (patch.interactionId !== undefined) db.prepare("UPDATE inbox_items SET interaction_id = ? WHERE id = ?").run(patch.interactionId, id);
    return this.findById(id)!;
  },
  existsBySubjectAndSender(subject: string, sender: string): boolean {
    const r = getDb().prepare("SELECT 1 FROM inbox_items WHERE subject = ? AND sender = ?").get(subject, sender);
    return !!r;
  },
  countByStatus(): Record<string, number> {
    const rows = getDb().prepare("SELECT ai_status, COUNT(*) c FROM inbox_items GROUP BY ai_status").all() as { ai_status: string; c: number }[];
    return Object.fromEntries(rows.map((r) => [r.ai_status, r.c]));
  },
};
