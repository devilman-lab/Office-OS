import { describe, expect, it } from "vitest";
import { runIntakePipeline } from "@/services/intake.service";
import { approveProposal, getProposalReview } from "@/services/approval.service";
import { runAgentTool } from "@/services/agent.service";
import { askAssistant } from "@/services/assistant.service";
import { getDashboardMetrics } from "@/services/dashboard.service";
import { auditRepository, caseRepository, inboxRepository, interactionRepository, knowledgeRepository, taskRepository } from "@/repositories";

describe("E2E demo flow: Inbox → AI → Knowledge → Proposal → Approval → Case → Task → Audit", () => {
  it("runs the full guided demo story end-to-end", async () => {
    const before = getDashboardMetrics();

    // Inbox → AI Processing
    const result = await runIntakePipeline("INBOX-001");
    expect(result.status).toBe("review_required");
    expect(result.steps.map((s) => s.key)).toEqual(["input_received", "pii_masking", "intent_classification", "entity_extraction", "knowledge_search", "case_analysis", "task_generation", "validation", "human_review_required"]);
    expect(result.steps.every((s) => s.status !== "failed")).toBe(true);

    // PII masking
    expect(result.masking!.masked).not.toContain("山田太郎");
    expect(result.masking!.masked).not.toContain("090-1234-5678");
    expect(result.masking!.masked).toContain("[PERSON_");
    expect(result.masking!.masked).toContain("[EMAIL_001]");

    // Knowledge search with sources
    expect(result.knowledge.length).toBeGreaterThan(0);
    expect(result.knowledge[0].documentId).toBe("KB-001");

    // Proposal
    const proposal = result.proposal!;
    expect(proposal.status).toBe("pending_review");
    expect(proposal.intent).toBe("social_insurance_enrollment");
    expect(proposal.caseProposal.dueDate).not.toBeNull();
    expect(proposal.taskProposals.length).toBeGreaterThanOrEqual(3);
    expect(inboxRepository.findById("INBOX-001")!.aiStatus).toBe("review_required");
    expect(caseRepository.count()).toBe(before.totals.cases); // nothing registered yet

    // Human approval
    const review = getProposalReview(proposal.id);
    expect(review.canApprove).toBe(true);
    const approved = approveProposal(proposal.id, { reviewNote: "確認済み" });
    expect(approved.case.customerId).toBe("CUS-001");
    expect(approved.case.title).toContain("株式会社サンプル商事");
    expect(approved.case.source).toBe("ai");
    expect(approved.tasks.length).toBe(proposal.taskProposals.length);
    expect(taskRepository.listByCase(approved.case.id).length).toBe(approved.tasks.length);
    expect(interactionRepository.findById(proposal.sourceInteractionId)!.caseId).toBe(approved.case.id);
    expect(knowledgeRepository.listReferences({ caseId: approved.case.id }).length).toBeGreaterThan(0);
    expect(inboxRepository.findById("INBOX-001")!.aiStatus).toBe("registered");

    // Audit log trail
    const actions = auditRepository.list({ limit: 100 }).map((l) => l.action);
    for (const a of ["AI_REQUEST", "PII_MASKING", "INTENT_CLASSIFICATION", "KNOWLEDGE_SEARCH", "PROPOSAL_VALIDATION", "PROPOSAL_CREATED", "HUMAN_APPROVAL", "CASE_CREATED", "TASK_CREATED", "KNOWLEDGE_REFERENCE"]) {
      expect(actions).toContain(a);
    }

    // Permission boundary: WRITE_KNOWLEDGE denied + audited
    const denied = await runAgentTool("WRITE_KNOWLEDGE", "KB-001");
    expect(denied.outcome).toBe("denied");
    const deniedLog = auditRepository.list({ action: "WRITE_KNOWLEDGE", result: "denied" });
    expect(deniedLog.length).toBeGreaterThan(0);
    expect(knowledgeRepository.findDocument("KB-001")!.content).toContain("資格取得");

    // Grounded assistant
    const answer = await askAssistant("社会保険の資格取得手続きについて必要な書類を教えてください。");
    expect(answer.grounded).toBe(true);
    expect(answer.citedDocumentIds).toContain("KB-001");

    // Dashboard metrics update
    const after = getDashboardMetrics();
    expect(after.totals.cases).toBe(before.totals.cases + 1);
    expect(after.aiProductivity.proposalsCreated).toBe(before.aiProductivity.proposalsCreated + 1);
    expect(after.operations.unprocessedRequests).toBe(before.operations.unprocessedRequests - 1);
  });
});
