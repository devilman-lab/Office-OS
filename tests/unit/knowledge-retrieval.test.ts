import { describe, expect, it } from "vitest";
import { getKnowledgeProvider } from "@/knowledge";
import { settingsRepository } from "@/repositories";
import { SETTING_KNOWLEDGE_UNAVAILABLE } from "@/knowledge/local-markdown-provider";
import { KnowledgeUnavailableError } from "@/domain/errors";

describe("Knowledge retrieval", () => {
  it("returns the enrollment procedure document first for the demo question", async () => {
    const hits = await getKnowledgeProvider().search("社会保険の資格取得手続きについて必要な書類を教えてください。");
    expect(hits[0].document.id).toBe("KB-001");
    expect(hits[0].relevance).toBe("high");
    expect(hits[0].document.verified).toBe(true);
    expect(hits[0].matchedTerms.length).toBeGreaterThan(0);
  });
  it("returns nothing for an off-topic question instead of guessing", async () => {
    const hits = await getKnowledgeProvider().search("宇宙旅行の保険について");
    expect(hits).toEqual([]);
  });
  it("filters by category and verified status", async () => {
    const hits = await getKnowledgeProvider().search("入社 期限", { category: "過去案件" });
    expect(hits.every((h) => h.document.category === "過去案件")).toBe(true);
    const verified = await getKnowledgeProvider().search("入社 期限", { verifiedOnly: true });
    expect(verified.every((h) => h.document.verified)).toBe(true);
  });
  it("throws KnowledgeUnavailableError when the source is disconnected", async () => {
    settingsRepository.set(SETTING_KNOWLEDGE_UNAVAILABLE, "true");
    await expect(getKnowledgeProvider().search("資格取得")).rejects.toBeInstanceOf(KnowledgeUnavailableError);
  });
});
