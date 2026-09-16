import { getDb, nextId } from "@/db/client";
import type { AIProposal } from "@/domain/types";
import { nowIso, safeJsonParse } from "@/lib/utils";

type Row = {
  id: string; source_interaction_id: string; inbox_item_id: string | null; customer: string; intent: string; intent_label: string;
  summary: string; case_proposal: string; task_proposals: string; missing_information: string; confidence: string;
  knowledge_reference_ids: string; status: string; review_note: string | null; reviewed_by: string | null; reviewed_at: string | null;
  created_case_id: string | null; processing_ms: number; created_at: string; updated_at: string;
};

function map(r: Row): AIProposal {
  return {
    id: r.id,
    sourceInteractionId: r.source_interaction_id,
    inboxItemId: r.inbox_item_id,
    customer: safeJsonParse(r.customer, { customerId: null, maskedName: "", matchedOrganization: null, isNew: true }),
    intent: r.intent,
    intentLabel: r.intent_label,
    summary: r.summary,
    caseProposal: safeJsonParse(r.case_proposal, { title: "", description: "", priority: "medium", dueDate: null, assignee: "" }),
    taskProposals: safeJsonParse(r.task_proposals, []),
    missingInformation: safeJsonParse(r.missing_information, []),
    confidence: r.confidence as AIProposal["confidence"],
    knowledgeReferenceIds: safeJsonParse(r.knowledge_reference_ids, []),
    status: r.status as AIProposal["status"],
    reviewNote: r.review_note,
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at,
    createdCaseId: r.created_case_id,
    processingMs: r.processing_ms,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const proposalRepository = {
  list(filter?: { status?: AIProposal["status"] }): AIProposal[] {
    if (filter?.status) {
      return (getDb().prepare("SELECT * FROM ai_proposals WHERE status = ? ORDER BY created_at DESC").all(filter.status) as Row[]).map(map);
    }
    return (getDb().prepare("SELECT * FROM ai_proposals ORDER BY created_at DESC").all() as Row[]).map(map);
  },
  findById(id: string): AIProposal | null {
    const r = getDb().prepare("SELECT * FROM ai_proposals WHERE id = ?").get(id) as Row | undefined;
    return r ? map(r) : null;
  },
  findByCaseId(caseId: string): AIProposal | null {
    const r = getDb().prepare("SELECT * FROM ai_proposals WHERE created_case_id = ?").get(caseId) as Row | undefined;
    return r ? map(r) : null;
  },
  create(input: Omit<AIProposal, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string }): AIProposal {
    const db = getDb();
    const id = input.id ?? nextId(db, "PROP");
    const ts = input.createdAt ?? nowIso();
    db.prepare(
      `INSERT INTO ai_proposals(id, source_interaction_id, inbox_item_id, customer, intent, intent_label, summary, case_proposal, task_proposals,
         missing_information, confidence, knowledge_reference_ids, status, review_note, reviewed_by, reviewed_at, created_case_id, processing_ms, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id, input.sourceInteractionId, input.inboxItemId, JSON.stringify(input.customer), input.intent, input.intentLabel, input.summary,
      JSON.stringify(input.caseProposal), JSON.stringify(input.taskProposals), JSON.stringify(input.missingInformation), input.confidence,
      JSON.stringify(input.knowledgeReferenceIds), input.status, input.reviewNote, input.reviewedBy, input.reviewedAt, input.createdCaseId,
      input.processingMs, ts, ts,
    );
    return this.findById(id)!;
  },
  update(id: string, patch: Partial<Pick<AIProposal, "summary" | "caseProposal" | "taskProposals" | "missingInformation" | "status" | "reviewNote" | "reviewedBy" | "reviewedAt" | "createdCaseId" | "customer">>): AIProposal {
    const db = getDb();
    const sets: string[] = [];
    const params: unknown[] = [];
    if (patch.summary !== undefined) { sets.push("summary = ?"); params.push(patch.summary); }
    if (patch.caseProposal !== undefined) { sets.push("case_proposal = ?"); params.push(JSON.stringify(patch.caseProposal)); }
    if (patch.taskProposals !== undefined) { sets.push("task_proposals = ?"); params.push(JSON.stringify(patch.taskProposals)); }
    if (patch.missingInformation !== undefined) { sets.push("missing_information = ?"); params.push(JSON.stringify(patch.missingInformation)); }
    if (patch.customer !== undefined) { sets.push("customer = ?"); params.push(JSON.stringify(patch.customer)); }
    if (patch.status !== undefined) { sets.push("status = ?"); params.push(patch.status); }
    if (patch.reviewNote !== undefined) { sets.push("review_note = ?"); params.push(patch.reviewNote); }
    if (patch.reviewedBy !== undefined) { sets.push("reviewed_by = ?"); params.push(patch.reviewedBy); }
    if (patch.reviewedAt !== undefined) { sets.push("reviewed_at = ?"); params.push(patch.reviewedAt); }
    if (patch.createdCaseId !== undefined) { sets.push("created_case_id = ?"); params.push(patch.createdCaseId); }
    sets.push("updated_at = ?"); params.push(nowIso());
    params.push(id);
    db.prepare(`UPDATE ai_proposals SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    return this.findById(id)!;
  },
  count(filter?: { status?: AIProposal["status"] }): number {
    if (filter?.status) return (getDb().prepare("SELECT COUNT(*) c FROM ai_proposals WHERE status = ?").get(filter.status) as { c: number }).c;
    return (getDb().prepare("SELECT COUNT(*) c FROM ai_proposals").get() as { c: number }).c;
  },
  sumProcessingMs(): { total: number; count: number } {
    const r = getDb().prepare("SELECT COALESCE(SUM(processing_ms),0) total, COUNT(*) count FROM ai_proposals").get() as { total: number; count: number };
    return r;
  },
};
