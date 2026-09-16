import { maskPII } from "../src/security/pii-masker";
import { getKnowledgeProvider } from "../src/knowledge";
import { getAIProvider } from "../src/ai";
import { inboxRepository } from "../src/repositories";
import { KNOWN_PERSONS, KNOWN_ORGANIZATIONS } from "../src/db/seed/customers";

async function main() {
  const items = inboxRepository.list();
  for (const item of items) {
    const m = maskPII(item.content, { knownPersons: KNOWN_PERSONS, knownOrganizations: KNOWN_ORGANIZATIONS });
    console.log("=== " + item.id + " " + item.subject);
    console.log(m.masked);
    console.log(m.counts);
    const ai = getAIProvider();
    const input = { maskedText: m.masked, subject: item.subject, source: item.source, receivedAt: item.receivedAt };
    const intent = await ai.classifyIntent(input);
    const ents = await ai.extractEntities(input);
    console.log("intent:", intent.intent, intent.confidence, intent.score, "| dates:", ents.dates.map(d => d.text + "=" + d.iso + "/" + d.role).join(", "));
  }
  const kp = getKnowledgeProvider();
  for (const q of ["社会保険の資格取得手続きについて必要な書類を教えてください。", "在留資格 変更 就労 必要書類 入管", "建設業許可 新規申請 必要書類 要件", "有給休暇は入社後いつから付与されますか", "宇宙旅行の保険について"]) {
    const hits = await kp.search(q);
    console.log("Q:", q, "->", hits.map(h => `${h.document.id}:${h.relevance}:${h.score}`).join(", "));
  }
}
main();
