import { audit } from "@/audit/audit-logger";
import { db } from "@/db";
import { DomainError, DuplicateError, NotFoundError, ValidationError } from "@/domain/errors";
import { ApprovableProposalSchema, ProposalEditSchema, type ProposalEdit } from "@/domain/schemas";
import type { AIProposal, Case, KnowledgeDocument, KnowledgeReference, Task } from "@/domain/types";
import { caseRepository, customerRepository, inboxRepository, interactionRepository, knowledgeRepository, proposalRepository, taskRepository } from "@/repositories";
import { CURRENT_USER } from "@/security/current-user";
import { nowIso } from "@/lib/utils";

export interface ProposalReview {
  proposal: AIProposal;
  interaction: ReturnType<typeof interactionRepository.findById>;
  inboxItem: ReturnType<typeof inboxRepository.findById>;
  customer: ReturnType<typeof customerRepository.findById>;
  references: (KnowledgeReference & { document: KnowledgeDocument | null })[];
  canApprove: boolean;
  blockingIssues: string[];
}

export function getProposalReview(id: string): ProposalReview {
  db();
  const proposal = proposalRepository.findById(id);
  if (!proposal) throw new NotFoundError("AIProposal", id);
  const references = knowledgeRepository.findReferencesByIds(proposal.knowledgeReferenceIds).map((r) => ({ ...r, document: knowledgeRepository.findDocument(r.knowledgeDocumentId) }));
  const check = ApprovableProposalSchema.safeParse({ caseProposal: proposal.caseProposal, taskProposals: proposal.taskProposals });
  const blockingIssues = check.success ? [] : check.error.issues.map((i) => (i.path.join(".") === "caseProposal.dueDate" ? "期限（Due Date）が必要です。" : `${i.path.join(".")}: ${i.message}`));
  return {
    proposal,
    interaction: interactionRepository.findById(proposal.sourceInteractionId),
    inboxItem: proposal.inboxItemId ? inboxRepository.findById(proposal.inboxItemId) : null,
    customer: proposal.customer.customerId ? customerRepository.findById(proposal.customer.customerId) : null,
    references,
    canApprove: proposal.status === "pending_review" && blockingIssues.length === 0,
    blockingIssues,
  };
}

/** Human edits before approval. Re-validated with Zod and re-checked for missing information. */
export function editProposal(id: string, edit: ProposalEdit): AIProposal {
  db();
  const proposal = proposalRepository.findById(id);
  if (!proposal) throw new NotFoundError("AIProposal", id);
  if (proposal.status !== "pending_review") throw new DomainError("NOT_EDITABLE", "確認待ちの提案のみ編集できます。");
  const parsed = ProposalEditSchema.safeParse(edit);
  if (!parsed.success) throw new ValidationError("入力内容に誤りがあります。", parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  const merged = {
    summary: parsed.data.summary ?? proposal.summary,
    caseProposal: { ...proposal.caseProposal, ...(parsed.data.caseProposal ?? {}) },
    taskProposals: parsed.data.taskProposals ?? proposal.taskProposals,
  };
  const missingInformation = proposal.missingInformation.filter((m) => !(m.field === "dueDate" && merged.caseProposal.dueDate));
  const updated = proposalRepository.update(id, { ...merged, missingInformation });
  audit.human("PROPOSAL_EDITED", "ai_proposal", id, "success", "担当者が提案内容を編集", { changedFields: Object.keys(parsed.data) });
  return updated;
}

export interface ApprovalResult {
  proposal: AIProposal;
  case: Case;
  tasks: Task[];
  customerCreated: boolean;
}

/**
 * Approve & Register. The only path by which AI-generated content reaches cases/tasks.
 * - Re-validates the proposal (a case without a due date cannot be registered).
 * - Detects duplicates (same customer + same open case title) unless the reviewer overrides.
 * - Runs in one transaction; every write is audited with the human actor.
 */
export function approveProposal(id: string, options: { reviewNote?: string; allowDuplicate?: boolean } = {}): ApprovalResult {
  const handle = db();
  const proposal = proposalRepository.findById(id);
  if (!proposal) throw new NotFoundError("AIProposal", id);
  if (proposal.status !== "pending_review") throw new DomainError("ALREADY_REVIEWED", "この提案は既に処理済みです。");

  const check = ApprovableProposalSchema.safeParse({ caseProposal: proposal.caseProposal, taskProposals: proposal.taskProposals });
  if (!check.success) {
    audit.human("HUMAN_APPROVAL", "ai_proposal", id, "failed", "必須項目が不足しているため登録できません。", { issues: check.error.issues.map((i) => i.path.join(".")) });
    throw new ValidationError("必須項目が不足しているため登録できません。期限を設定してください。", check.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }

  const inboxItem = proposal.inboxItemId ? inboxRepository.findById(proposal.inboxItemId) : null;
  const existingCustomer = proposal.customer.customerId ? customerRepository.findById(proposal.customer.customerId) : null;

  const tx = handle.transaction((): ApprovalResult => {
    let customer = existingCustomer;
    let customerCreated = false;
    if (!customer) {
      const org = inboxItem?.senderOrganization ?? inboxItem?.sender ?? "未登録の連絡先";
      customer = customerRepository.findByOrganization(org) ?? customerRepository.create({ displayName: org, organization: org, maskedName: proposal.customer.maskedName, contactPerson: inboxItem?.sender ?? null, status: "prospect", contactStatus: "ok" });
      customerCreated = true;
      audit.human("CUSTOMER_CREATED", "customer", customer.id, "success", "承認時に新規顧客を登録", { proposalId: id });
    }
    const title = unmaskOrg(proposal.caseProposal.title, proposal.customer.maskedName, customer.displayName);
    const description = unmaskOrg(proposal.caseProposal.description, proposal.customer.maskedName, customer.displayName);

    const duplicate = caseRepository.findOpenByCustomerAndTitle(customer.id, title);
    if (duplicate && !options.allowDuplicate) {
      audit.human("DUPLICATE_DETECTED", "case", duplicate.id, "warning", "DUPLICATE DETECTED: 同一顧客・同一タイトルの未完了案件が存在します", { proposalId: id });
      throw new DuplicateError(`同じ顧客の未完了案件「${duplicate.title}」（${duplicate.id}）が既に存在します。`, duplicate.id);
    }

    audit.human("HUMAN_APPROVAL", "ai_proposal", id, "success", "承認して登録", { note: options.reviewNote ?? null, allowDuplicate: !!options.allowDuplicate });

    const created = caseRepository.create({
      customerId: customer.id,
      title,
      description,
      status: "new",
      priority: proposal.caseProposal.priority,
      dueDate: proposal.caseProposal.dueDate,
      assignee: proposal.caseProposal.assignee,
      source: "ai",
      proposalId: id,
    });
    audit.human("CASE_CREATED", "case", created.id, "success", "AI提案から案件を登録", { proposalId: id, customerId: customer.id });

    const tasks = proposal.taskProposals.map((t) => {
      const task = taskRepository.create({ caseId: created.id, title: t.title, description: t.description, status: "todo", priority: t.priority, dueDate: t.dueDate, assignee: t.assignee, source: "ai" });
      audit.human("TASK_CREATED", "task", task.id, "success", "AI提案からタスクを登録", { caseId: created.id, proposalId: id });
      return task;
    });

    interactionRepository.link(proposal.sourceInteractionId, { caseId: created.id, customerId: customer.id });
    audit.human("INTERACTION_CREATED", "interaction", proposal.sourceInteractionId, "success", "対応履歴を案件に紐付け", { caseId: created.id });
    knowledgeRepository.linkReferencesToCase(id, created.id);
    for (const refId of proposal.knowledgeReferenceIds) audit.system("KNOWLEDGE_REFERENCE", "knowledge_reference", refId, "success", "案件に参照元を紐付け", { caseId: created.id });

    const updated = proposalRepository.update(id, { status: "approved", reviewNote: options.reviewNote ?? null, reviewedBy: CURRENT_USER.name, reviewedAt: nowIso(), createdCaseId: created.id, customer: { ...proposal.customer, customerId: customer.id, isNew: false } });
    if (inboxItem) inboxRepository.update(inboxItem.id, { aiStatus: "registered" });
    return { proposal: updated, case: created, tasks, customerCreated };
  });
  return tx();
}

export function rejectProposal(id: string, reason: string): AIProposal {
  db();
  const proposal = proposalRepository.findById(id);
  if (!proposal) throw new NotFoundError("AIProposal", id);
  if (proposal.status !== "pending_review") throw new DomainError("ALREADY_REVIEWED", "この提案は既に処理済みです。");
  const updated = proposalRepository.update(id, { status: "rejected", reviewNote: reason || "却下", reviewedBy: CURRENT_USER.name, reviewedAt: nowIso() });
  if (proposal.inboxItemId) inboxRepository.update(proposal.inboxItemId, { aiStatus: "rejected" });
  audit.human("HUMAN_REJECTION", "ai_proposal", id, "success", reason || "却下", {});
  return updated;
}

function unmaskOrg(text: string, maskedName: string, displayName: string): string {
  return text.split(maskedName).join(displayName).replace(/\[ORG(?:ANIZATION)?_\d{3}\]|\[ORG_NEW\]/g, displayName);
}
