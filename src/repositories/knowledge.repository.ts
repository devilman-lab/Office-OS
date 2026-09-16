import { getDb, nextId } from "@/db/client";
import type { KnowledgeDocument, KnowledgeReference } from "@/domain/types";
import { nowIso, safeJsonParse } from "@/lib/utils";

type DocRow = {
  id: string; title: string; category: string; content: string; source: string; tags: string;
  verified: number; verified_by: string | null; updated_at: string;
};
type RefRow = {
  id: string; knowledge_document_id: string; query: string; relevance: string; score: number; used_by: string;
  case_id: string | null; proposal_id: string | null; created_at: string;
};

function mapDoc(r: DocRow): KnowledgeDocument {
  return {
    id: r.id,
    title: r.title,
    category: r.category as KnowledgeDocument["category"],
    content: r.content,
    source: r.source,
    tags: safeJsonParse<string[]>(r.tags, []),
    verified: r.verified === 1,
    verifiedBy: r.verified_by,
    updatedAt: r.updated_at,
  };
}
function mapRef(r: RefRow): KnowledgeReference {
  return {
    id: r.id,
    knowledgeDocumentId: r.knowledge_document_id,
    query: r.query,
    relevance: r.relevance as KnowledgeReference["relevance"],
    score: r.score,
    usedBy: r.used_by,
    caseId: r.case_id,
    proposalId: r.proposal_id,
    createdAt: r.created_at,
  };
}

/**
 * Knowledge documents are READ ONLY for the application at runtime.
 * The only write path is the seed loader (simulating a human-managed Obsidian vault sync).
 * There is intentionally no `update`/`delete` method here.
 */
export const knowledgeRepository = {
  listDocuments(): KnowledgeDocument[] {
    return (getDb().prepare("SELECT * FROM knowledge_documents ORDER BY category, title").all() as DocRow[]).map(mapDoc);
  },
  findDocument(id: string): KnowledgeDocument | null {
    const r = getDb().prepare("SELECT * FROM knowledge_documents WHERE id = ?").get(id) as DocRow | undefined;
    return r ? mapDoc(r) : null;
  },
  searchDocuments(q: string): KnowledgeDocument[] {
    const like = `%${q}%`;
    return (getDb().prepare("SELECT * FROM knowledge_documents WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? LIMIT 10").all(like, like, like) as DocRow[]).map(mapDoc);
  },
  countDocuments(): number {
    return (getDb().prepare("SELECT COUNT(*) c FROM knowledge_documents").get() as { c: number }).c;
  },
  /** Seed-only write path. Not exposed to AI or UI. */
  seedDocument(doc: KnowledgeDocument) {
    getDb()
      .prepare(
        `INSERT INTO knowledge_documents(id, title, category, content, source, tags, verified, verified_by, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
      )
      .run(doc.id, doc.title, doc.category, doc.content, doc.source, JSON.stringify(doc.tags), doc.verified ? 1 : 0, doc.verifiedBy, doc.updatedAt);
  },

  listReferences(filter?: { caseId?: string; proposalId?: string; usedBy?: string }): KnowledgeReference[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter?.caseId) { where.push("case_id = ?"); params.push(filter.caseId); }
    if (filter?.proposalId) { where.push("proposal_id = ?"); params.push(filter.proposalId); }
    if (filter?.usedBy) { where.push("used_by = ?"); params.push(filter.usedBy); }
    const sql = `SELECT * FROM knowledge_references ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC`;
    return (getDb().prepare(sql).all(...params) as RefRow[]).map(mapRef);
  },
  findReferencesByIds(ids: string[]): KnowledgeReference[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    return (getDb().prepare(`SELECT * FROM knowledge_references WHERE id IN (${placeholders})`).all(...ids) as RefRow[]).map(mapRef);
  },
  createReference(input: Omit<KnowledgeReference, "id" | "createdAt"> & { id?: string; createdAt?: string }): KnowledgeReference {
    const db = getDb();
    const id = input.id ?? nextId(db, "REF");
    const ts = input.createdAt ?? nowIso();
    db.prepare(
      `INSERT INTO knowledge_references(id, knowledge_document_id, query, relevance, score, used_by, case_id, proposal_id, created_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
    ).run(id, input.knowledgeDocumentId, input.query, input.relevance, input.score, input.usedBy, input.caseId, input.proposalId, ts);
    const r = db.prepare("SELECT * FROM knowledge_references WHERE id = ?").get(id) as RefRow;
    return mapRef(r);
  },
  linkReferencesToCase(proposalId: string, caseId: string) {
    getDb().prepare("UPDATE knowledge_references SET case_id = ? WHERE proposal_id = ?").run(caseId, proposalId);
  },
  countReferences(): number {
    return (getDb().prepare("SELECT COUNT(*) c FROM knowledge_references").get() as { c: number }).c;
  },
};
