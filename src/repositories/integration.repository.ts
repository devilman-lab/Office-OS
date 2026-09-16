import { getDb } from "@/db/client";
import type { BackupRecord, Integration } from "@/domain/types";

type Row = {
  id: string; kind: string; name: string; status: string; authentication: string; last_sync: string | null; last_sync_result: string | null;
  records: number; errors: number; duplicates: number; fail_next_sync: number; notes: string;
};
type BackupRow = { id: string; created_at: string; status: string; records: number; knowledge_documents: number; label: string; file_path: string | null };

function map(r: Row): Integration {
  return {
    id: r.id,
    kind: r.kind as Integration["kind"],
    name: r.name,
    status: r.status as Integration["status"],
    authentication: r.authentication,
    lastSync: r.last_sync,
    lastSyncResult: r.last_sync_result as Integration["lastSyncResult"],
    records: r.records,
    errors: r.errors,
    duplicates: r.duplicates,
    failNextSync: r.fail_next_sync === 1,
    notes: r.notes,
  };
}
function mapBackup(r: BackupRow): BackupRecord {
  return { id: r.id, createdAt: r.created_at, status: r.status as BackupRecord["status"], records: r.records, knowledgeDocuments: r.knowledge_documents, label: r.label, filePath: r.file_path };
}

export const integrationRepository = {
  list(): Integration[] {
    return (getDb().prepare("SELECT * FROM integrations ORDER BY rowid").all() as Row[]).map(map);
  },
  findById(id: string): Integration | null {
    const r = getDb().prepare("SELECT * FROM integrations WHERE id = ?").get(id) as Row | undefined;
    return r ? map(r) : null;
  },
  seed(i: Integration) {
    getDb()
      .prepare(
        `INSERT INTO integrations(id, kind, name, status, authentication, last_sync, last_sync_result, records, errors, duplicates, fail_next_sync, notes)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(i.id, i.kind, i.name, i.status, i.authentication, i.lastSync, i.lastSyncResult, i.records, i.errors, i.duplicates, i.failNextSync ? 1 : 0, i.notes);
  },
  update(id: string, patch: Partial<Omit<Integration, "id" | "kind" | "name">>): Integration {
    const db = getDb();
    const sets: string[] = [];
    const params: unknown[] = [];
    if (patch.status !== undefined) { sets.push("status = ?"); params.push(patch.status); }
    if (patch.lastSync !== undefined) { sets.push("last_sync = ?"); params.push(patch.lastSync); }
    if (patch.lastSyncResult !== undefined) { sets.push("last_sync_result = ?"); params.push(patch.lastSyncResult); }
    if (patch.records !== undefined) { sets.push("records = ?"); params.push(patch.records); }
    if (patch.errors !== undefined) { sets.push("errors = ?"); params.push(patch.errors); }
    if (patch.duplicates !== undefined) { sets.push("duplicates = ?"); params.push(patch.duplicates); }
    if (patch.failNextSync !== undefined) { sets.push("fail_next_sync = ?"); params.push(patch.failNextSync ? 1 : 0); }
    if (patch.notes !== undefined) { sets.push("notes = ?"); params.push(patch.notes); }
    if (sets.length === 0) return this.findById(id)!;
    params.push(id);
    db.prepare(`UPDATE integrations SET ${sets.join(", ")} WHERE id = ?`).run(...params);
    return this.findById(id)!;
  },

  listBackups(): BackupRecord[] {
    return (getDb().prepare("SELECT * FROM backups ORDER BY created_at DESC").all() as BackupRow[]).map(mapBackup);
  },
  createBackup(b: BackupRecord) {
    getDb()
      .prepare("INSERT INTO backups(id, created_at, status, records, knowledge_documents, label, file_path) VALUES (?,?,?,?,?,?,?)")
      .run(b.id, b.createdAt, b.status, b.records, b.knowledgeDocuments, b.label, b.filePath);
  },
};
