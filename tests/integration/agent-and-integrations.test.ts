import { describe, expect, it } from "vitest";
import { listAgentTools, runAgentTool, runDemoError } from "@/services/agent.service";
import { askAssistant } from "@/services/assistant.service";
import { createBackup, retryIntegration, syncIntegration } from "@/services/integration.service";
import { resetDemoData } from "@/services/demo.service";
import { auditRepository, inboxRepository, integrationRepository, knowledgeRepository, caseRepository } from "@/repositories";
import { runIntakePipeline } from "@/services/intake.service";
import { approveProposal } from "@/services/approval.service";

describe("AI → Knowledge Search / Permission → Denied / Action → Audit Log", () => {
  it("lists tools with permissions from the permission table", () => {
    const tools = listAgentTools();
    expect(tools.find((t) => t.action === "WRITE_KNOWLEDGE")?.permission).toBe("denied");
    expect(tools.find((t) => t.action === "CREATE_CASE")?.permission).toBe("approval_required");
    expect(tools.find((t) => t.action === "SEARCH_KNOWLEDGE")?.permission).toBe("allowed");
  });
  it("denies WRITE_KNOWLEDGE, leaves the document untouched and writes two audit entries", async () => {
    const before = knowledgeRepository.findDocument("KB-001")!.content;
    const denied = auditRepository.count({ result: "denied" });
    const r = await runAgentTool("WRITE_KNOWLEDGE", "KB-001");
    expect(r.outcome).toBe("denied");
    expect(r.title).toBe("ACCESS DENIED");
    expect(r.reason).toContain("not permitted to modify the Knowledge Source");
    expect(knowledgeRepository.findDocument("KB-001")!.content).toBe(before);
    expect(auditRepository.count({ result: "denied" })).toBe(denied + 2);
  });
  it("returns APPROVAL REQUIRED for CREATE_CASE without creating anything", async () => {
    const cases = caseRepository.count();
    const r = await runAgentTool("CREATE_CASE");
    expect(r.outcome).toBe("approval_required");
    expect(caseRepository.count()).toBe(cases);
  });
  it("executes allowed tools and audits them", async () => {
    const r = await runAgentTool("SEARCH_KNOWLEDGE", "資格取得 必要書類");
    expect(r.outcome).toBe("success");
    expect(Array.isArray(r.data) && r.data.length).toBeTruthy();
    const read = await runAgentTool("READ_INTERACTION", "INT-0010");
    expect(read.outcome).toBe("success");
    expect(JSON.stringify(read.data)).not.toContain("グエン");
  });
  it("demonstrates validation failure and knowledge outage through real code paths", async () => {
    const v = await runDemoError("INVALID_AI_OUTPUT");
    expect(v.outcome).toBe("failed");
    expect(Array.isArray(v.data) && v.data.length).toBeGreaterThan(0);
    const k = await runDemoError("KNOWLEDGE_UNAVAILABLE");
    expect(k.title).toBe("KNOWLEDGE UNAVAILABLE");
    const ok = await askAssistant("有給休暇の年5日取得義務の対象者は誰ですか？");
    expect(ok.grounded).toBe(true);
  });
  it("assistant refuses to answer without grounding", async () => {
    const a = await askAssistant("宇宙旅行保険の加入手続きについて教えてください。");
    expect(a.grounded).toBe(false);
    expect(a.confidence).toBe("low");
    expect(a.answer).toContain("担当者による確認が必要です");
    expect(a.citedDocumentIds).toEqual([]);
  });
});

describe("Integrations, backup and demo reset", () => {
  it("imports new records, detects duplicates on re-sync, and handles failure + retry", () => {
    const inbox = inboxRepository.list().length;
    const first = syncIntegration("INTG-gmail");
    expect(first.outcome).toBe("completed");
    expect(inboxRepository.list().length).toBe(inbox + first.newRecords);
    const again = syncIntegration("INTG-gmail");
    expect(again.outcome).toBe("duplicate");
    expect(inboxRepository.list().length).toBe(inbox + first.newRecords);
    const failed = syncIntegration("INTG-lineworks");
    expect(failed.outcome).toBe("failed");
    expect(integrationRepository.findById("INTG-lineworks")?.status).toBe("error");
    const retried = retryIntegration("INTG-lineworks");
    expect(retried.outcome).toBe("completed");
    expect(auditRepository.count({ action: "API_RETRY" })).toBe(1);
  });
  it("creates a backup record", async () => {
    const b = await createBackup("test");
    expect(b.records).toBeGreaterThan(0);
    expect(auditRepository.count({ action: "BACKUP" })).toBeGreaterThan(3);
  });
  it("resets everything back to the seed state", async () => {
    const r = await runIntakePipeline("INBOX-001");
    approveProposal(r.proposal!.id);
    expect(caseRepository.count()).toBe(7);
    resetDemoData();
    expect(caseRepository.count()).toBe(6);
    expect(inboxRepository.findById("INBOX-001")?.aiStatus).toBe("not_processed");
    expect(auditRepository.list({ limit: 1 })[0].action).toBe("DEMO_RESET");
  });
});
