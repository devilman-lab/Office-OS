/**
 * Domain enumerations shared across all layers.
 * Labels are Japanese UI strings; keys are stable identifiers stored in the DB.
 */

export const CASE_STATUSES = ["new", "review", "in_progress", "waiting", "completed", "archived"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];
export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  new: "新規",
  review: "確認中",
  in_progress: "対応中",
  waiting: "待ち",
  completed: "完了",
  archived: "アーカイブ",
};

export const TASK_STATUSES = ["todo", "in_progress", "done", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "未着手",
  in_progress: "対応中",
  done: "完了",
  cancelled: "取消",
};

export const PRIORITIES = ["high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABEL: Record<Priority, string> = { high: "高", medium: "中", low: "低" };

export const SOURCES = ["gmail", "line_works", "voice_memo", "phone_memo", "meeting_note", "manual", "ai"] as const;
export type Source = (typeof SOURCES)[number];
export const SOURCE_LABEL: Record<Source, string> = {
  gmail: "Gmail",
  line_works: "LINE WORKS",
  voice_memo: "音声メモ",
  phone_memo: "電話メモ",
  meeting_note: "面談記録",
  manual: "手動登録",
  ai: "AI提案",
};

export const INTERACTION_TYPES = ["email", "phone", "meeting", "voice_memo", "note", "line_works"] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];
export const INTERACTION_TYPE_LABEL: Record<InteractionType, string> = {
  email: "メール",
  phone: "電話",
  meeting: "面談",
  voice_memo: "音声メモ",
  note: "メモ",
  line_works: "LINE WORKS",
};

export const CUSTOMER_STATUSES = ["active", "prospect", "inactive"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];
export const CUSTOMER_STATUS_LABEL: Record<CustomerStatus, string> = {
  active: "顧問先",
  prospect: "見込み",
  inactive: "休止",
};

export const CONTACT_STATUSES = ["ok", "pending_reply", "no_contact"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];
export const CONTACT_STATUS_LABEL: Record<ContactStatus, string> = {
  ok: "連絡可",
  pending_reply: "返信待ち",
  no_contact: "未連絡",
};

export const PROPOSAL_STATUSES = ["pending_review", "approved", "rejected"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  pending_review: "確認待ち",
  approved: "承認済み",
  rejected: "却下",
};

export const INBOX_AI_STATUSES = ["not_processed", "processing", "review_required", "registered", "rejected", "failed"] as const;
export type InboxAiStatus = (typeof INBOX_AI_STATUSES)[number];
export const INBOX_AI_STATUS_LABEL: Record<InboxAiStatus, string> = {
  not_processed: "未処理",
  processing: "AI処理中",
  review_required: "確認が必要です",
  registered: "登録済み",
  rejected: "却下済み",
  failed: "処理失敗",
};

export const CONFIDENCES = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCES)[number];
export const CONFIDENCE_LABEL: Record<Confidence, string> = { high: "High", medium: "Medium", low: "Low" };

export const PERMISSIONS = ["allowed", "approval_required", "denied"] as const;
export type Permission = (typeof PERMISSIONS)[number];
export const PERMISSION_LABEL: Record<Permission, string> = {
  allowed: "ALLOWED",
  approval_required: "APPROVAL REQUIRED",
  denied: "DENIED",
};

export const AUDIT_RESULTS = ["success", "denied", "failed", "warning"] as const;
export type AuditResult = (typeof AUDIT_RESULTS)[number];

export const ACTOR_TYPES = ["human", "ai", "system"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const KNOWLEDGE_CATEGORIES = ["社会保険", "労務", "行政書士業務", "事務所ルール", "FAQ", "過去案件"] as const;
export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number];

export const RELEVANCES = ["high", "medium", "low"] as const;
export type Relevance = (typeof RELEVANCES)[number];

/** Tool actions available to the AI agent. Permission is looked up in agent_permissions. */
export const AGENT_ACTIONS = [
  "READ_KNOWLEDGE",
  "SEARCH_KNOWLEDGE",
  "READ_CASE",
  "READ_INTERACTION",
  "CREATE_CASE_PROPOSAL",
  "CREATE_TASK_PROPOSAL",
  "CREATE_CASE",
  "CREATE_TASK",
  "UPDATE_CUSTOMER",
  "SEND_EXTERNAL_MESSAGE",
  "WRITE_KNOWLEDGE",
  "DELETE_KNOWLEDGE",
  "DELETE_CASE",
  "EXPORT_PII",
] as const;
export type AgentAction = (typeof AGENT_ACTIONS)[number];

/** Audit action vocabulary. Kept as a union so logs stay queryable. */
export const AUDIT_ACTIONS = [
  "INBOX_RECEIVED",
  "AI_REQUEST",
  "PII_MASKING",
  "INTENT_CLASSIFICATION",
  "ENTITY_EXTRACTION",
  "KNOWLEDGE_SEARCH",
  "KNOWLEDGE_REFERENCE",
  "KNOWLEDGE_UNAVAILABLE",
  "CASE_ANALYSIS",
  "TASK_GENERATION",
  "PROPOSAL_VALIDATION",
  "AI_VALIDATION_FAILED",
  "PROPOSAL_CREATED",
  "PROPOSAL_EDITED",
  "HUMAN_APPROVAL",
  "HUMAN_REJECTION",
  "CASE_CREATED",
  "TASK_CREATED",
  "TASK_UPDATED",
  "CASE_UPDATED",
  "INTERACTION_CREATED",
  "CUSTOMER_CREATED",
  "DUPLICATE_DETECTED",
  "PERMISSION_CHECK",
  "WRITE_KNOWLEDGE",
  "DELETE_KNOWLEDGE",
  "AI_ANSWER",
  "AGENT_TOOL_CALL",
  "API_SYNC",
  "API_ERROR",
  "API_RETRY",
  "BACKUP",
  "RESTORE_POINT",
  "DEMO_RESET",
  "SETTINGS_CHANGED",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
