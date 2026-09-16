import type { AgentPermission, BackupRecord, Integration } from "@/domain/types";
import { daysAgoIso } from "./helpers";

export const PERMISSIONS: AgentPermission[] = [
  { id: "PERM-01", action: "READ_KNOWLEDGE", permission: "allowed", approvalRequired: false, description: "確認済みナレッジの読み取り" },
  { id: "PERM-02", action: "SEARCH_KNOWLEDGE", permission: "allowed", approvalRequired: false, description: "ナレッジ検索（参照元を記録）" },
  { id: "PERM-03", action: "READ_CASE", permission: "allowed", approvalRequired: false, description: "案件情報の読み取り（匿名化済み）" },
  { id: "PERM-04", action: "READ_INTERACTION", permission: "allowed", approvalRequired: false, description: "対応履歴の読み取り（匿名化済み）" },
  { id: "PERM-05", action: "CREATE_CASE_PROPOSAL", permission: "allowed", approvalRequired: false, description: "案件候補の作成（登録は人間が承認）" },
  { id: "PERM-06", action: "CREATE_TASK_PROPOSAL", permission: "allowed", approvalRequired: false, description: "タスク候補の作成（登録は人間が承認）" },
  { id: "PERM-07", action: "CREATE_CASE", permission: "approval_required", approvalRequired: true, description: "案件の正式登録" },
  { id: "PERM-08", action: "CREATE_TASK", permission: "approval_required", approvalRequired: true, description: "タスクの正式登録" },
  { id: "PERM-09", action: "UPDATE_CUSTOMER", permission: "approval_required", approvalRequired: true, description: "顧客情報の変更" },
  { id: "PERM-10", action: "SEND_EXTERNAL_MESSAGE", permission: "approval_required", approvalRequired: true, description: "顧客・外部へのメッセージ送信" },
  { id: "PERM-11", action: "WRITE_KNOWLEDGE", permission: "denied", approvalRequired: false, description: "ナレッジ正本への書き込み（禁止）" },
  { id: "PERM-12", action: "DELETE_KNOWLEDGE", permission: "denied", approvalRequired: false, description: "ナレッジ正本の削除（禁止）" },
  { id: "PERM-13", action: "DELETE_CASE", permission: "denied", approvalRequired: false, description: "案件の削除（禁止）" },
  { id: "PERM-14", action: "EXPORT_PII", permission: "denied", approvalRequired: false, description: "個人情報のエクスポート（禁止）" },
];

export const INTEGRATIONS: Integration[] = [
  { id: "INTG-gmail", kind: "gmail", name: "Gmail", status: "simulated", authentication: "OAuth 2.0（読み取り専用スコープ想定）— SIMULATED", lastSync: daysAgoIso(0, 9, 15), lastSyncResult: "success", records: 128, errors: 0, duplicates: 2, failNextSync: false, notes: "本番では Gmail API（gmail.readonly）でラベル指定の受信メールのみ取得。" },
  { id: "INTG-lineworks", kind: "line_works", name: "LINE WORKS", status: "simulated", authentication: "Service Account / JWT — SIMULATED", lastSync: daysAgoIso(0, 8, 45), lastSyncResult: "failed", records: 64, errors: 1, duplicates: 0, failNextSync: true, notes: "本番では LINE WORKS Bot / Message API で指定トークルームのメッセージを取得。直近の同期で認証エラーをシミュレート中。" },
  { id: "INTG-notion", kind: "notion", name: "Notion（業務DB）", status: "simulated", authentication: "Internal Integration Token — SIMULATED", lastSync: daysAgoIso(0, 9, 20), lastSyncResult: "success", records: 42, errors: 0, duplicates: 1, failNextSync: false, notes: "本番では Notion API で顧客・案件・タスク・対応履歴 DB と双方向同期。プロトタイプでは SQLite が Notion の代替。" },
  { id: "INTG-obsidian", kind: "obsidian", name: "Obsidian（ナレッジ正本）", status: "simulated", authentication: "ローカル Vault（読み取り専用マウント）— SIMULATED", lastSync: daysAgoIso(0, 7, 0), lastSyncResult: "success", records: 16, errors: 0, duplicates: 0, failNextSync: false, notes: "Markdown ファイルを読み取り専用で索引化。アプリ・AI からの書き込み経路は存在しない。" },
  { id: "INTG-voice", kind: "voice_memo", name: "音声メモ（文字起こし）", status: "simulated", authentication: "ローカル文字起こし（将来: Whisper 等）— SIMULATED", lastSync: daysAgoIso(0, 17, 10), lastSyncResult: "success", records: 9, errors: 0, duplicates: 0, failNextSync: false, notes: "本番では音声ファイルを文字起こしし、匿名化後に Inbox へ投入。" },
];

export const BACKUPS: BackupRecord[] = [
  { id: "BKP-0003", createdAt: daysAgoIso(0, 3, 0), status: "healthy", records: 61, knowledgeDocuments: 16, label: "日次自動バックアップ", filePath: null },
  { id: "BKP-0002", createdAt: daysAgoIso(1, 3, 0), status: "healthy", records: 58, knowledgeDocuments: 16, label: "日次自動バックアップ", filePath: null },
  { id: "BKP-0001", createdAt: daysAgoIso(2, 3, 0), status: "healthy", records: 55, knowledgeDocuments: 16, label: "日次自動バックアップ", filePath: null },
];

export const DEFAULT_SETTINGS: Record<string, string> = {
  "ai.provider": "mock",
  "ai.future_provider": "local-llm",
  "knowledge.provider": "local-markdown",
  "business_db.provider": "sqlite-mock-notion",
  "security.pii_masking": "true",
  "security.knowledge_write_protection": "true",
  "security.permission_enforcement": "true",
  "security.audit_logging": "true",
  "security.approval_workflow": "true",
  "simulate.knowledge_unavailable": "false",
  "demo.started_at": "",
};
