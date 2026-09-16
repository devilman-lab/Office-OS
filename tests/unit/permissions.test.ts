import { describe, expect, it } from "vitest";
import { checkAgentPermission, enforceAgentPermission } from "@/security/permissions";
import { ApprovalRequiredError, PermissionDeniedError } from "@/domain/errors";
import { auditRepository } from "@/repositories";

describe("Agent permission enforcement", () => {
  it("allows read/search/proposal tools", () => {
    expect(checkAgentPermission("SEARCH_KNOWLEDGE").permission).toBe("allowed");
    expect(checkAgentPermission("CREATE_CASE_PROPOSAL").permission).toBe("allowed");
    expect(() => enforceAgentPermission("READ_KNOWLEDGE")).not.toThrow();
  });

  it("requires approval for case creation and external messages", () => {
    expect(() => enforceAgentPermission("CREATE_CASE")).toThrow(ApprovalRequiredError);
    expect(() => enforceAgentPermission("SEND_EXTERNAL_MESSAGE")).toThrow(ApprovalRequiredError);
  });

  it("denies knowledge writes and records the check in the audit log", () => {
    const before = auditRepository.count({ action: "PERMISSION_CHECK", result: "denied" });
    expect(() => enforceAgentPermission("WRITE_KNOWLEDGE")).toThrow(PermissionDeniedError);
    expect(() => enforceAgentPermission("DELETE_KNOWLEDGE")).toThrow(PermissionDeniedError);
    expect(auditRepository.count({ action: "PERMISSION_CHECK", result: "denied" })).toBe(before + 2);
    const last = auditRepository.list({ action: "PERMISSION_CHECK", limit: 1 })[0];
    expect(last.reason).toContain("not permitted");
  });

  it("denies unknown actions by default", () => {
    expect(checkAgentPermission("FORMAT_DISK" as never).permission).toBe("denied");
  });
});
