import { describe, expect, it } from "vitest";
import { containsLikelyPII, maskPII, unmask } from "@/security/pii-masker";

describe("PII masking", () => {
  it("masks persons, organizations, phones, emails and addresses with stable tokens", () => {
    const text = "山田太郎さんから株式会社サンプル商事への入社手続きについて相談がありました。連絡先は 090-1234-5678、yamada@example.com、住所は東京都千代田区丸の内1-1-1 です。山田太郎さんは10月1日入社です。";
    const r = maskPII(text);
    expect(r.masked).not.toContain("山田太郎");
    expect(r.masked).not.toContain("株式会社サンプル商事");
    expect(r.masked).not.toContain("090-1234-5678");
    expect(r.masked).not.toContain("yamada@example.com");
    expect(r.masked).not.toContain("東京都千代田区");
    expect(r.masked).toContain("[PERSON_001]さんから[ORGANIZATION_001]への入社手続き");
    expect(r.masked.split("[PERSON_001]").length - 1).toBe(2);
    expect(r.counts).toEqual({ PERSON: 1, ORGANIZATION: 1, PHONE: 1, EMAIL: 1, ADDRESS: 1 });
    expect(containsLikelyPII(r.masked)).toBe(false);
  });

  it("uses the known-name dictionary and skips generic words", () => {
    const r = maskPII("担当者様、佐々木です。各位ご確認ください。", { knownPersons: ["佐々木"] });
    expect(r.masked).toContain("[PERSON_001]です");
    expect(r.masked).toContain("担当者様");
    expect(r.masked).toContain("各位");
  });

  it("round-trips through unmask for authorised display", () => {
    const original = "中村さんの連絡先は 03-1111-2222 です。";
    const r = maskPII(original);
    expect(unmask(r.masked, r.entities)).toBe(original);
  });

  it("never re-masks existing tokens", () => {
    const r = maskPII("[PERSON_001]さんと[EMAIL_001]");
    expect(r.masked).toBe("[PERSON_001]さんと[EMAIL_001]");
    expect(r.entities.length).toBe(0);
  });
});
