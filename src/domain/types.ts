import type {
  ActorType,
  AgentAction,
  AuditAction,
  AuditResult,
  CaseStatus,
  Confidence,
  ContactStatus,
  CustomerStatus,
  InboxAiStatus,
  InteractionType,
  KnowledgeCategory,
  Permission,
  Priority,
  ProposalStatus,
  Relevance,
  Source,
  TaskStatus,
} from "./enums";

export interface Customer {
  id: string;
  displayName: string;
  organization: string;
  maskedName: string;
  contactPerson: string | null;
  status: CustomerStatus;
  contactStatus: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Case {
  id: string;
  customerId: string;
  title: string;
  description: string;
  status: CaseStatus;
  priority: Priority;
  dueDate: string | null;
  assignee: string;
  source: Source;
  proposalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  caseId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  assignee: string;
  source: Source;
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  id: string;
  customerId: string | null;
  caseId: string | null;
  type: InteractionType;
  source: Source;
  subject: string;
  content: string;
  maskedContent: string;
  inboxItemId: string | null;
  createdAt: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  source: string;
  tags: string[];
  verified: boolean;
  verifiedBy: string | null;
  updatedAt: string;
}

export interface KnowledgeReference {
  id: string;
  knowledgeDocumentId: string;
  query: string;
  relevance: Relevance;
  score: number;
  usedBy: string;
  caseId: string | null;
  proposalId: string | null;
  createdAt: string;
}

export interface MissingInformation {
  field: string;
  label: string;
  message: string;
  severity: "required" | "recommended";
}

export interface CaseProposal {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  assignee: string;
}

export interface TaskProposal {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  assignee: string;
}

export interface ProposalCustomer {
  customerId: string | null;
  maskedName: string;
  matchedOrganization: string | null;
  isNew: boolean;
}

export interface AIProposal {
  id: string;
  sourceInteractionId: string;
  inboxItemId: string | null;
  customer: ProposalCustomer;
  intent: string;
  intentLabel: string;
  summary: string;
  caseProposal: CaseProposal;
  taskProposals: TaskProposal[];
  missingInformation: MissingInformation[];
  confidence: Confidence;
  knowledgeReferenceIds: string[];
  status: ProposalStatus;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdCaseId: string | null;
  processingMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  actorType: ActorType;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  result: AuditResult;
  reason: string | null;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface AgentPermission {
  id: string;
  action: AgentAction;
  permission: Permission;
  approvalRequired: boolean;
  description: string;
}

export interface InboxItem {
  id: string;
  source: Source;
  sender: string;
  senderOrganization: string | null;
  subject: string;
  content: string;
  receivedAt: string;
  aiStatus: InboxAiStatus;
  proposalId: string | null;
  interactionId: string | null;
}

export type IntegrationKind = "gmail" | "line_works" | "notion" | "obsidian" | "voice_memo";
export type IntegrationStatus = "simulated" | "disconnected" | "error";

export interface Integration {
  id: string;
  kind: IntegrationKind;
  name: string;
  status: IntegrationStatus;
  authentication: string;
  lastSync: string | null;
  lastSyncResult: "success" | "failed" | "duplicate" | null;
  records: number;
  errors: number;
  duplicates: number;
  failNextSync: boolean;
  notes: string;
}

export interface BackupRecord {
  id: string;
  createdAt: string;
  status: "healthy" | "failed";
  records: number;
  knowledgeDocuments: number;
  label: string;
  filePath: string | null;
}

export interface AppSetting {
  key: string;
  value: string;
  updatedAt: string;
}

export interface MaskedEntity {
  type: "PERSON" | "ORGANIZATION" | "PHONE" | "EMAIL" | "ADDRESS";
  token: string;
  original: string;
}

export interface MaskingResult {
  original: string;
  masked: string;
  entities: MaskedEntity[];
  counts: Record<MaskedEntity["type"], number>;
}

export interface KnowledgeHit {
  document: KnowledgeDocument;
  score: number;
  relevance: Relevance;
  matchedTerms: string[];
  snippet: string;
}
