import { describe, expect, it } from "vitest";
import { AIProposalOutputSchema, ApprovableProposalSchema } from "@/domain/schemas";

const valid = {
  intent: "social_insurance_enrollment",
  intentLabel: "社会保険 資格取得（入社手続き）",
  summary: "テスト用の要約です。",
  caseProposal: { title: "テスト案件", description: "説明", priority: "high", dueDate: "2026-10-03", assignee: "鈴木" },
  taskProposals: [{ title: "タスク1", description: "", priority: "medium", dueDate: "2026-10-01", assignee: "鈴木" }],
  missingInformation: [],
  confidence: "high",
};

describe("AI proposal validation (Zod)", () => {
  it("accepts a well-formed proposal", () => {
    expect(AIProposalOutputSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects output missing title / priority / tasks", () => {
    const bad = { ...valid, caseProposal: { description: "x", dueDate: "来週" }, taskProposals: [] };
    const r = AIProposalOutputSchema.safeParse(bad);
    expect(r.success).toBe(false);
    const paths = r.success ? [] : r.error.issues.map((i) => i.path.join("."));
    expect(paths).toContain("caseProposal.title");
    expect(paths).toContain("caseProposal.priority");
    expect(paths).toContain("caseProposal.dueDate");
    expect(paths).toContain("taskProposals");
  });
  it("allows a null due date at generation time but not at approval time", () => {
    const noDate = { ...valid, caseProposal: { ...valid.caseProposal, dueDate: null } };
    expect(AIProposalOutputSchema.safeParse(noDate).success).toBe(true);
    expect(ApprovableProposalSchema.safeParse({ caseProposal: noDate.caseProposal, taskProposals: noDate.taskProposals }).success).toBe(false);
  });
  it("rejects invalid enum values and date formats", () => {
    expect(AIProposalOutputSchema.safeParse({ ...valid, confidence: "very high" }).success).toBe(false);
    expect(AIProposalOutputSchema.safeParse({ ...valid, caseProposal: { ...valid.caseProposal, dueDate: "10/3" } }).success).toBe(false);
  });
});
