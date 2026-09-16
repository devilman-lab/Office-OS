import { describe, expect, it } from "vitest";
import { audit } from "@/audit/audit-logger";
import { auditRepository } from "@/repositories";

describe("Audit logging", () => {
  it("appends sequential, queryable entries with actor and metadata", () => {
    const before = auditRepository.count();
    const a = audit.ai("AI_REQUEST", "inbox_item", "INBOX-001", "success", "test", { foo: 1 });
    const b = audit.human("HUMAN_APPROVAL", "ai_proposal", "PROP-0001", "success", "ok");
    expect(auditRepository.count()).toBe(before + 2);
    expect(a.actor).toBe("ai-assistant");
    expect(b.actor).toBe("佐藤（所長）");
    expect(Number(b.id.replace("LOG-", ""))).toBe(Number(a.id.replace("LOG-", "")) + 1);
    expect(auditRepository.list({ resourceId: "INBOX-001", limit: 5 })[0].metadata).toEqual({ foo: 1 });
    expect(auditRepository.list({ action: "HUMAN_APPROVAL", limit: 1 })[0].id).toBe(b.id);
  });
  it("filters by result", () => {
    audit.ai("WRITE_KNOWLEDGE", "knowledge", "KB-001", "denied", "read-only");
    expect(auditRepository.list({ result: "denied" }).some((l) => l.resourceId === "KB-001")).toBe(true);
  });
});
