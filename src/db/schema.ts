/** SQLite DDL. Kept in one place so tests and the app share the exact same schema. */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  organization TEXT NOT NULL,
  masked_name TEXT NOT NULL,
  contact_person TEXT,
  status TEXT NOT NULL,
  contact_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  due_date TEXT,
  assignee TEXT NOT NULL,
  source TEXT NOT NULL,
  proposal_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  due_date TEXT,
  assignee TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  case_id TEXT,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  masked_content TEXT NOT NULL,
  inbox_item_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  tags TEXT NOT NULL,
  verified INTEGER NOT NULL,
  verified_by TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_references (
  id TEXT PRIMARY KEY,
  knowledge_document_id TEXT NOT NULL REFERENCES knowledge_documents(id),
  query TEXT NOT NULL,
  relevance TEXT NOT NULL,
  score REAL NOT NULL,
  used_by TEXT NOT NULL,
  case_id TEXT,
  proposal_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_proposals (
  id TEXT PRIMARY KEY,
  source_interaction_id TEXT NOT NULL,
  inbox_item_id TEXT,
  customer TEXT NOT NULL,
  intent TEXT NOT NULL,
  intent_label TEXT NOT NULL,
  summary TEXT NOT NULL,
  case_proposal TEXT NOT NULL,
  task_proposals TEXT NOT NULL,
  missing_information TEXT NOT NULL,
  confidence TEXT NOT NULL,
  knowledge_reference_ids TEXT NOT NULL,
  status TEXT NOT NULL,
  review_note TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_case_id TEXT,
  processing_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  seq INTEGER NOT NULL,
  actor TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  result TEXT NOT NULL,
  reason TEXT,
  metadata TEXT NOT NULL,
  timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_seq ON audit_logs(seq);

CREATE TABLE IF NOT EXISTS agent_permissions (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL UNIQUE,
  permission TEXT NOT NULL,
  approval_required INTEGER NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inbox_items (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  sender TEXT NOT NULL,
  sender_organization TEXT,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  received_at TEXT NOT NULL,
  ai_status TEXT NOT NULL,
  proposal_id TEXT,
  interaction_id TEXT
);

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  authentication TEXT NOT NULL,
  last_sync TEXT,
  last_sync_result TEXT,
  records INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  duplicates INTEGER NOT NULL DEFAULT 0,
  fail_next_sync INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  records INTEGER NOT NULL,
  knowledge_documents INTEGER NOT NULL,
  label TEXT NOT NULL,
  file_path TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS id_counters (
  prefix TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
`;

export const ALL_TABLES = [
  "knowledge_references",
  "ai_proposals",
  "tasks",
  "cases",
  "interactions",
  "inbox_items",
  "customers",
  "knowledge_documents",
  "audit_logs",
  "agent_permissions",
  "integrations",
  "backups",
  "app_settings",
  "id_counters",
] as const;
