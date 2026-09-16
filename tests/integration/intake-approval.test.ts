import { describe, expect, it } from "vitest";
import { runIntakePipeline } from "@/services/intake.service";
import { approveProposal, editProposal, getProposalReview, rejectProposal } from "@/services/approval.service";
import { auditRepository, caseRepository, inboxRepository, proposalRepository, settingsRepository, taskRepository } from "@/repositories";
import { getMockAIProvider } from "@/ai";
import { SETTING_KNOWLEDGE_UNAVAILABLE } from "@/knowledge/local-markdown-provider";
import { DuplicateError, ValidationError } from "@/domain/errors";

describe("Inbox → AI Proposal", () => {
  it("creates a pending proposal, an interaction and knowledge references without touching cases", async () => {
    const cases = caseRepository.count();
    const r = await runIntakePipeline("INBOX-002");
    expect(r.status).toBe("review_required");
    expect(r.intent?.intent).toBe("social_insurance_loss");
    expect(r.proposal?.status).toBe("pending_review");
    expect(r.proposal?.knowledgeReferenceIds.length).toBeGreaterThan(0);
    expect(r.proposal?.sourceInteractionId).toMatch(/^INT-/);
    expect(caseRepository.count()).toBe(cases);
    expect(inboxRepository.findById("INBOX-002")?.proposalId).toBe(r.proposal?.id);
  });

  it("flags missing required information when no date can be extracted", async () => {
    const r = await runIntakePipeline("INBOX-003");
    expect(r.proposal?.missingInformation.some((m) => m.field === "dueDate" && m.severity === "required")).toBe(true);
    expect(r.steps.find((s) => s.key === "validation")?.status).toBe("warning");
    const review = getProposalReview(r.proposal!.id);
    expect(review.canApprove).toBe(false);
    expect(() => approveProposal(r.proposal!.id)).toThrow(ValidationError);
  });

  it("rejects invalid AI output at the validation gate and stores nothing", async () => {
    getMockAIProvider()!.forceNextProposalOutput({ intent: "x", caseProposal: { description: "no title" }, taskProposals: [] });
    const proposals = proposalRepository.count();
    const r = await runIntakePipeline("INBOX-004");
    expect(r.status).toBe("failed");
    expect(r.error?.code).toBe("AI_VALIDATION_FAILED");
    expect(r.steps.find((s) => s.key === "validation")?.status).toBe("failed");
    expect(r.steps.find((s) => s.key === "human_review_required")?.status).toBe("skipped");
    expect(proposalRepository.count()).toBe(proposals);
    expect(inboxRepository.findById("INBOX-004")?.aiStatus).toBe("failed");
    expect(auditRepository.count({ action: "AI_VALIDATION_FAILED" })).toBeGreaterThan(0);
  });

  it("stops with an actionable error when the knowledge source is unavailable", async () => {
    settingsRepository.set(SETTING_KNOWLEDGE_UNAVAILABLE, "true");
    const r = await runIntakePipeline("INBOX-005");
    expect(r.status).toBe("failed");
    expect(r.error?.code).toBe("KNOWLEDGE_UNAVAILABLE");
    expect(r.error?.nextAction).toContain("Obsidian");
    expect(auditRepository.count({ action: "KNOWLEDGE_UNAVAILABLE" })).toBe(1);
  });
});

describe("Proposal → Approval → Case → Task", () => {
  it("registers case, tasks, links interaction and references, and audits with the human actor", async () => {
    const r = await runIntakePipeline("INBOX-001");
    const res = approveProposal(r.proposal!.id, { reviewNote: "ok" });
    expect(res.case.status).toBe("new");
    expect(res.case.proposalId).toBe(r.proposal!.id);
    expect(taskRepository.listByCase(res.case.id).every((t) => t.source === "ai" && t.status === "todo")).toBe(true);
    expect(proposalRepository.findById(r.proposal!.id)?.status).toBe("approved");
    expect(proposalRepository.findById(r.proposal!.id)?.createdCaseId).toBe(res.case.id);
    const approvalLog = auditRepository.list({ action: "HUMAN_APPROVAL", limit: 1 })[0];
    expect(approvalLog.actorType).toBe("human");
    expect(auditRepository.list({ action: "TASK_CREATED" }).filter((l) => l.metadata.caseId === res.case.id).length).toBe(res.tasks.length);
  });

  it("allows editing before approval and clears the missing due date", async () => {
    const r = await runIntakePipeline("INBOX-003");
    const edited = editProposal(r.proposal!.id, { caseProposal: { dueDate: "2026-12-01" } });
    expect(edited.caseProposal.dueDate).toBe("2026-12-01");
    expect(edited.missingInformation.some((m) => m.field === "dueDate")).toBe(false);
    expect(getProposalReview(r.proposal!.id).canApprove).toBe(true);
    expect(() => editProposal(r.proposal!.id, { caseProposal: { dueDate: "来週" } })).toThrow(ValidationError);
  });

  it("detects duplicate open cases and allows an explicit override", async () => {
    const first = await runIntakePipeline("INBOX-001");
    approveProposal(first.proposal!.id);
    inboxRepository.update("INBOX-001", { aiStatus: "not_processed", proposalId: null, interactionId: null });
    const second = await runIntakePipeline("INBOX-001");
    expect(() => approveProposal(second.proposal!.id)).toThrow(DuplicateError);
    expect(auditRepository.count({ action: "DUPLICATE_DETECTED" })).toBeGreaterThan(0);
    expect(proposalRepository.findById(second.proposal!.id)?.status).toBe("pending_review");
    const res = approveProposal(second.proposal!.id, { allowDuplicate: true });
    expect(res.case.id).not.toBe(first.proposal!.id);
  });

  it("rejects a proposal and marks the inbox item", async () => {
    const r = await runIntakePipeline("INBOX-008");
    expect(r.intent?.intent).toBe("other");
    expect(r.proposal?.confidence).toBe("low");
    rejectProposal(r.proposal!.id, "案件化不要");
    expect(inboxRepository.findById("INBOX-008")?.aiStatus).toBe("rejected");
    expect(auditRepository.count({ action: "HUMAN_REJECTION" })).toBe(2);
  });
});
