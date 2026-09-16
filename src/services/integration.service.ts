import fs from "node:fs";
import path from "node:path";
import { audit } from "@/audit/audit-logger";
import { db, getDb } from "@/db";
import { nextId, countRows, resolveDbPath } from "@/db/client";
import { NotFoundError } from "@/domain/errors";
import type { BackupRecord, Integration } from "@/domain/types";
import { inboxRepository, integrationRepository, knowledgeRepository, settingsRepository } from "@/repositories";
import { SETTING_KNOWLEDGE_UNAVAILABLE } from "@/knowledge/local-markdown-provider";
import { nowIso } from "@/lib/utils";

export interface SyncResult {
  integration: Integration;
  outcome: "completed" | "failed" | "duplicate";
  title: string;
  message: string;
  newRecords: number;
  duplicates: number;
  nextAction: string | null;
}

/** Mock inbound messages each connector would fetch on sync. Existing subject+sender pairs are treated as duplicates. */
const MOCK_INCOMING: Partial<Record<Integration["kind"], { sender: string; senderOrganization: string | null; subject: string; content: string }[]>> = {
  gmail: [
    { sender: "中村", senderOrganization: "合同会社デモ食品", subject: "新しく雇うパートさんの社会保険について", content: "中村です。来月から週30時間で働くパートさんを1名雇います。社会保険の加入が必要か教えてください。" },
    { sender: "田村 社長", senderOrganization: "有限会社テスト建設", subject: "納税証明書を取得しました", content: "田村です。納税証明書を取得しましたので来週持参します。" },
  ],
  line_works: [
    { sender: "小林（人事）", senderOrganization: "サンプル物流株式会社", subject: "従業員代表の選出が終わりました", content: "小林です。従業員代表の選出が終わりました。就業規則変更の意見書はどのように準備すればよいですか。" },
  ],
  voice_memo: [
    { sender: "鈴木（電話後メモ）", senderOrganization: "株式会社サンプル商事", subject: "音声メモ：賞与支払届の件", content: "サンプル商事の佐々木さんから電話。冬季賞与の支給日が決まったので支払届の準備をお願いしたいとのこと。支給日は12月10日。" },
  ],
};

export function listIntegrations(): Integration[] {
  db();
  return integrationRepository.list();
}

/** Runs a simulated sync. Failures and duplicates are real code paths, not hard-coded UI states. */
export function syncIntegration(id: string): SyncResult {
  db();
  const integration = integrationRepository.findById(id);
  if (!integration) throw new NotFoundError("Integration", id);

  if (integration.failNextSync) {
    const updated = integrationRepository.update(id, { lastSync: nowIso(), lastSyncResult: "failed", errors: integration.errors + 1, status: "error" });
    audit.system("API_ERROR", "integration", id, "failed", "SYNC FAILED: 認証トークンの期限切れ（シミュレーション）", { retryable: true });
    return { integration: updated, outcome: "failed", title: "SYNC FAILED", message: "認証トークンの期限切れにより同期に失敗しました（シミュレーション）。", newRecords: 0, duplicates: 0, nextAction: "「再試行」を押すと再認証して再同期します。連続して失敗する場合は連携設定を確認してください。" };
  }

  if (integration.kind === "obsidian") {
    const docs = knowledgeRepository.countDocuments();
    const updated = integrationRepository.update(id, { lastSync: nowIso(), lastSyncResult: "success", records: docs, status: "simulated" });
    audit.system("API_SYNC", "integration", id, "success", `SYNC COMPLETED: ${docs} documents indexed (read-only)`, { documents: docs });
    return { integration: updated, outcome: "completed", title: "SYNC COMPLETED", message: `${docs} 件のナレッジを読み取り専用で再索引しました。書き込みは行われません。`, newRecords: 0, duplicates: 0, nextAction: null };
  }
  if (integration.kind === "notion") {
    const records = countRows(getDb(), "cases") + countRows(getDb(), "tasks") + countRows(getDb(), "interactions");
    const updated = integrationRepository.update(id, { lastSync: nowIso(), lastSyncResult: "success", records, status: "simulated" });
    audit.system("API_SYNC", "integration", id, "success", `SYNC COMPLETED: ${records} records`, { records });
    return { integration: updated, outcome: "completed", title: "SYNC COMPLETED", message: `業務DB（案件・タスク・対応履歴）${records} 件を同期しました。`, newRecords: 0, duplicates: 0, nextAction: null };
  }

  const incoming = MOCK_INCOMING[integration.kind] ?? [];
  let newRecords = 0;
  let duplicates = 0;
  for (const m of incoming) {
    if (inboxRepository.existsBySubjectAndSender(m.subject, m.sender)) {
      duplicates += 1;
      continue;
    }
    const item = inboxRepository.create({ source: integration.kind === "voice_memo" ? "voice_memo" : integration.kind, sender: m.sender, senderOrganization: m.senderOrganization, subject: m.subject, content: m.content, receivedAt: nowIso(), aiStatus: "not_processed", proposalId: null, interactionId: null });
    audit.system("INBOX_RECEIVED", "inbox_item", item.id, "success", `${integration.name} から受信`, { source: item.source });
    newRecords += 1;
  }
  const outcome: SyncResult["outcome"] = newRecords === 0 && duplicates > 0 ? "duplicate" : "completed";
  const updated = integrationRepository.update(id, { lastSync: nowIso(), lastSyncResult: outcome === "duplicate" ? "duplicate" : "success", records: integration.records + newRecords, duplicates: integration.duplicates + duplicates, status: "simulated" });
  if (duplicates > 0) audit.system("DUPLICATE_DETECTED", "integration", id, "warning", `DUPLICATE DETECTED: ${duplicates} records already exist`, { duplicates });
  audit.system("API_SYNC", "integration", id, "success", `SYNC COMPLETED: ${newRecords} new records`, { newRecords, duplicates });
  return {
    integration: updated,
    outcome,
    title: outcome === "duplicate" ? "DUPLICATE DETECTED" : "SYNC COMPLETED",
    message: outcome === "duplicate" ? `${duplicates} 件は既に Inbox に存在するためスキップしました。重複登録は行われません。` : `${newRecords} 件の新しい依頼を Inbox に取り込みました${duplicates ? `（重複 ${duplicates} 件はスキップ）` : ""}。`,
    newRecords,
    duplicates,
    nextAction: newRecords > 0 ? "Inbox で「AIで整理」を実行できます。" : null,
  };
}

export function retryIntegration(id: string): SyncResult {
  db();
  const integration = integrationRepository.findById(id);
  if (!integration) throw new NotFoundError("Integration", id);
  integrationRepository.update(id, { failNextSync: false });
  audit.system("API_RETRY", "integration", id, "success", "再認証して同期を再試行", {});
  return syncIntegration(id);
}

export function setKnowledgeAvailability(available: boolean) {
  db();
  settingsRepository.set(SETTING_KNOWLEDGE_UNAVAILABLE, available ? "false" : "true");
  integrationRepository.update("INTG-obsidian", { status: available ? "simulated" : "disconnected", lastSyncResult: available ? "success" : "failed" });
  audit.human("SETTINGS_CHANGED", "integration", "INTG-obsidian", "success", available ? "ナレッジソースを再接続" : "ナレッジソースを切断（シミュレーション）", { available });
}

export function isKnowledgeAvailable(): boolean {
  db();
  return !settingsRepository.getBool(SETTING_KNOWLEDGE_UNAVAILABLE, false);
}

/** Creates a real SQLite backup file under data/backups (Obsidian vault backup is the vault owner's process). */
export async function createBackup(label = "手動バックアップ"): Promise<BackupRecord> {
  const handle = db();
  const dir = path.join(path.dirname(resolveDbPath()), "backups");
  fs.mkdirSync(dir, { recursive: true });
  const id = nextId(handle, "BKP");
  const file = path.join(dir, `${id}.db`);
  const records = ["customers", "cases", "tasks", "interactions", "ai_proposals", "knowledge_references"].reduce((s, t) => s + countRows(handle, t), 0);
  const knowledgeDocuments = knowledgeRepository.countDocuments();
  let status: BackupRecord["status"] = "healthy";
  try {
    if (resolveDbPath() !== ":memory:" && handle.name && handle.name !== ":memory:") await handle.backup(file);
  } catch {
    status = "failed";
  }
  const record: BackupRecord = { id, createdAt: nowIso(), status, records, knowledgeDocuments, label, filePath: status === "healthy" ? file : null };
  integrationRepository.createBackup(record);
  audit.system("BACKUP", "backup", id, status === "healthy" ? "success" : "failed", `${label}（${records} records / ${knowledgeDocuments} knowledge documents）`, { file: record.filePath });
  return record;
}

export function listBackups(): BackupRecord[] {
  db();
  return integrationRepository.listBackups();
}
