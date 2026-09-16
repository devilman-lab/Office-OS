import { countRows, getDb, truncateAll, type DB } from "@/db/client";
import { KNOWLEDGE_DOCS } from "./knowledge";
import { CUSTOMERS } from "./customers";
import { INBOX_ITEMS } from "./inbox";
import { CASES, TASKS } from "./operations";
import { INTERACTIONS } from "./interactions";
import { KNOWLEDGE_REFERENCES, PROPOSALS } from "./proposals";
import { BACKUPS, DEFAULT_SETTINGS, INTEGRATIONS, PERMISSIONS } from "./system";
import { AUDIT_LOGS } from "./audit";
import { nowIso } from "@/lib/utils";

/**
 * Loads all demo data. Idempotent by design: callers truncate first when a reset is requested.
 * The knowledge documents are the only place where the application writes into knowledge_documents;
 * this simulates the human-managed Obsidian vault being mirrored into the search index.
 */
export function seedDatabase(db: DB = getDb()) {
  const tx = db.transaction(() => {
    const ts = nowIso();

    const insCustomer = db.prepare(`INSERT INTO customers(id, display_name, organization, masked_name, contact_person, status, contact_status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`);
    for (const c of CUSTOMERS) insCustomer.run(c.id, c.displayName, c.organization, c.maskedName, c.contactPerson, c.status, c.contactStatus, c.createdAt, c.createdAt);

    const insDoc = db.prepare(`INSERT INTO knowledge_documents(id, title, category, content, source, tags, verified, verified_by, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`);
    for (const d of KNOWLEDGE_DOCS) insDoc.run(d.id, d.title, d.category, d.content, d.source, JSON.stringify(d.tags), d.verified ? 1 : 0, d.verifiedBy, d.updatedAt);

    const insCase = db.prepare(`INSERT INTO cases(id, customer_id, title, description, status, priority, due_date, assignee, source, proposal_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const c of CASES) insCase.run(c.id, c.customerId, c.title, c.description, c.status, c.priority, c.dueDate, c.assignee, c.source, c.proposalId, c.createdAt, c.createdAt);

    const insTask = db.prepare(`INSERT INTO tasks(id, case_id, title, description, status, priority, due_date, assignee, source, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    for (const t of TASKS) insTask.run(t.id, t.caseId, t.title, t.description, t.status, t.priority, t.dueDate, t.assignee, t.source, t.createdAt, t.createdAt);

    const insInt = db.prepare(`INSERT INTO interactions(id, customer_id, case_id, type, source, subject, content, masked_content, inbox_item_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`);
    for (const i of INTERACTIONS) insInt.run(i.id, i.customerId, i.caseId, i.type, i.source, i.subject, i.content, i.maskedContent, i.inboxItemId, i.createdAt);

    const insInbox = db.prepare(`INSERT INTO inbox_items(id, source, sender, sender_organization, subject, content, received_at, ai_status, proposal_id, interaction_id) VALUES (?,?,?,?,?,?,?,?,?,?)`);
    for (const i of INBOX_ITEMS) insInbox.run(i.id, i.source, i.sender, i.senderOrganization, i.subject, i.content, i.receivedAt, i.aiStatus, i.proposalId, i.interactionId);

    const insRef = db.prepare(`INSERT INTO knowledge_references(id, knowledge_document_id, query, relevance, score, used_by, case_id, proposal_id, created_at) VALUES (?,?,?,?,?,?,?,?,?)`);
    for (const r of KNOWLEDGE_REFERENCES) insRef.run(r.id, r.knowledgeDocumentId, r.query, r.relevance, r.score, r.usedBy, r.caseId, r.proposalId, r.createdAt);

    const insProp = db.prepare(`INSERT INTO ai_proposals(id, source_interaction_id, inbox_item_id, customer, intent, intent_label, summary, case_proposal, task_proposals, missing_information, confidence, knowledge_reference_ids, status, review_note, reviewed_by, reviewed_at, created_case_id, processing_ms, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const p of PROPOSALS) insProp.run(p.id, p.sourceInteractionId, p.inboxItemId, JSON.stringify(p.customer), p.intent, p.intentLabel, p.summary, JSON.stringify(p.caseProposal), JSON.stringify(p.taskProposals), JSON.stringify(p.missingInformation), p.confidence, JSON.stringify(p.knowledgeReferenceIds), p.status, p.reviewNote, p.reviewedBy, p.reviewedAt, p.createdCaseId, p.processingMs, p.createdAt, p.createdAt);

    const insPerm = db.prepare(`INSERT INTO agent_permissions(id, action, permission, approval_required, description) VALUES (?,?,?,?,?)`);
    for (const p of PERMISSIONS) insPerm.run(p.id, p.action, p.permission, p.approvalRequired ? 1 : 0, p.description);

    const insIntg = db.prepare(`INSERT INTO integrations(id, kind, name, status, authentication, last_sync, last_sync_result, records, errors, duplicates, fail_next_sync, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const i of INTEGRATIONS) insIntg.run(i.id, i.kind, i.name, i.status, i.authentication, i.lastSync, i.lastSyncResult, i.records, i.errors, i.duplicates, i.failNextSync ? 1 : 0, i.notes);

    const insBkp = db.prepare(`INSERT INTO backups(id, created_at, status, records, knowledge_documents, label, file_path) VALUES (?,?,?,?,?,?,?)`);
    for (const b of BACKUPS) insBkp.run(b.id, b.createdAt, b.status, b.records, b.knowledgeDocuments, b.label, b.filePath);

    const insSetting = db.prepare(`INSERT INTO app_settings(key, value, updated_at) VALUES (?,?,?)`);
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insSetting.run(k, v, ts);

    const sorted = [...AUDIT_LOGS].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const insAudit = db.prepare(`INSERT INTO audit_logs(id, seq, actor, actor_type, action, resource_type, resource_id, result, reason, metadata, timestamp) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    sorted.forEach((l, idx) => {
      const seq = idx + 1;
      insAudit.run(`LOG-${String(seq).padStart(6, "0")}`, seq, l.actor, l.actorType, l.action, l.resourceType, l.resourceId, l.result, l.reason, JSON.stringify(l.metadata), l.timestamp);
    });

    const insCounter = db.prepare(`INSERT INTO id_counters(prefix, value) VALUES (?,?)`);
    insCounter.run("CUS", CUSTOMERS.length);
    insCounter.run("CASE", CASES.length);
    insCounter.run("TASK", TASKS.length);
    insCounter.run("INT", INTERACTIONS.length);
    insCounter.run("INBOX", INBOX_ITEMS.length);
    insCounter.run("PROP", PROPOSALS.length);
    insCounter.run("REF", KNOWLEDGE_REFERENCES.length);
    insCounter.run("BKP", BACKUPS.length);
  });
  tx();
}

export function resetDatabase(db: DB = getDb()) {
  truncateAll(db);
  seedDatabase(db);
}

/** Seeds on first access so `npm run dev` works with no manual step. */
export function ensureSeeded(db: DB = getDb()) {
  if (countRows(db, "knowledge_documents") === 0) {
    seedDatabase(db);
  }
}
