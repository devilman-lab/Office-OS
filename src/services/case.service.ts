import { audit } from "@/audit/audit-logger";
import { db } from "@/db";
import type { CaseStatus, TaskStatus } from "@/domain/enums";
import { NotFoundError } from "@/domain/errors";
import type { AIProposal, AuditLog, Case, Customer, Interaction, KnowledgeDocument, KnowledgeReference, Task } from "@/domain/types";
import { auditRepository, caseRepository, customerRepository, interactionRepository, knowledgeRepository, proposalRepository, taskRepository } from "@/repositories";
import { todayDateOnly, daysBetween } from "@/lib/utils";

export interface CaseListRow extends Case {
  customerName: string;
  openTasks: number;
  totalTasks: number;
  overdue: boolean;
}

export function listCases(filter?: { status?: CaseStatus; q?: string }): CaseListRow[] {
  db();
  const customers = new Map(customerRepository.list().map((c) => [c.id, c.displayName]));
  const tasks = taskRepository.list();
  const today = todayDateOnly();
  return caseRepository
    .list(filter?.status ? { status: filter.status } : undefined)
    .filter((c) => !filter?.q || c.title.includes(filter.q) || c.id.includes(filter.q))
    .map((c) => {
      const ts = tasks.filter((t) => t.caseId === c.id);
      return {
        ...c,
        customerName: customers.get(c.customerId) ?? c.customerId,
        openTasks: ts.filter((t) => t.status === "todo" || t.status === "in_progress").length,
        totalTasks: ts.length,
        overdue: !!c.dueDate && !["completed", "archived"].includes(c.status) && daysBetween(today, c.dueDate) < 0,
      };
    });
}

export interface CaseDetail {
  case: Case;
  customer: Customer | null;
  tasks: Task[];
  interactions: Interaction[];
  references: (KnowledgeReference & { document: KnowledgeDocument | null })[];
  proposal: AIProposal | null;
  auditLogs: AuditLog[];
}

export function getCaseDetail(id: string): CaseDetail {
  db();
  const c = caseRepository.findById(id);
  if (!c) throw new NotFoundError("Case", id);
  const tasks = taskRepository.listByCase(id);
  const proposal = c.proposalId ? proposalRepository.findById(c.proposalId) : proposalRepository.findByCaseId(id);
  const ids = new Set<string>([id, ...tasks.map((t) => t.id), ...(proposal ? [proposal.id] : [])]);
  const auditLogs = auditRepository.list({ limit: 400 }).filter((l) => (l.resourceId && ids.has(l.resourceId)) || l.metadata.caseId === id || l.metadata.proposalId === proposal?.id).slice(0, 60);
  return {
    case: c,
    customer: customerRepository.findById(c.customerId),
    tasks,
    interactions: interactionRepository.listByCase(id),
    references: knowledgeRepository.listReferences({ caseId: id }).map((r) => ({ ...r, document: knowledgeRepository.findDocument(r.knowledgeDocumentId) })),
    proposal,
    auditLogs,
  };
}

export function updateCaseStatus(id: string, status: CaseStatus): Case {
  db();
  const before = caseRepository.findById(id);
  if (!before) throw new NotFoundError("Case", id);
  const updated = caseRepository.update(id, { status });
  audit.human("CASE_UPDATED", "case", id, "success", `ステータスを ${before.status} → ${status} に変更`, { from: before.status, to: status });
  return updated;
}

export function updateTaskStatus(id: string, status: TaskStatus): Task {
  db();
  const before = taskRepository.findById(id);
  if (!before) throw new NotFoundError("Task", id);
  const updated = taskRepository.update(id, { status });
  audit.human("TASK_UPDATED", "task", id, "success", `ステータスを ${before.status} → ${status} に変更`, { caseId: before.caseId, from: before.status, to: status });
  return updated;
}

export interface TaskRow extends Task {
  caseTitle: string;
  customerName: string;
  daysLeft: number | null;
}

export function listTasks(): TaskRow[] {
  db();
  const cases = new Map(caseRepository.list().map((c) => [c.id, c]));
  const customers = new Map(customerRepository.list().map((c) => [c.id, c.displayName]));
  const today = todayDateOnly();
  return taskRepository.list().map((t) => {
    const c = cases.get(t.caseId);
    return { ...t, caseTitle: c?.title ?? t.caseId, customerName: c ? customers.get(c.customerId) ?? "" : "", daysLeft: t.dueDate ? daysBetween(today, t.dueDate) : null };
  });
}

export interface InteractionRow extends Interaction {
  customerName: string | null;
  caseTitle: string | null;
}

export function listInteractions(): InteractionRow[] {
  db();
  const cases = new Map(caseRepository.list().map((c) => [c.id, c.title]));
  const customers = new Map(customerRepository.list().map((c) => [c.id, c.displayName]));
  return interactionRepository.list().map((i) => ({ ...i, customerName: i.customerId ? customers.get(i.customerId) ?? null : null, caseTitle: i.caseId ? cases.get(i.caseId) ?? null : null }));
}
