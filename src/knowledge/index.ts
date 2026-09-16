import { LocalMarkdownKnowledgeProvider } from "./local-markdown-provider";
import type { KnowledgeProvider } from "./provider";

let cached: KnowledgeProvider | null = null;

/**
 * Factory for the knowledge provider. Selected via URIZUN_KNOWLEDGE_PROVIDER.
 * Only "local-markdown" ships with the prototype; "vector" is documented as the production path.
 */
export function getKnowledgeProvider(): KnowledgeProvider {
  if (cached) return cached;
  const kind = process.env.URIZUN_KNOWLEDGE_PROVIDER ?? "local-markdown";
  switch (kind) {
    case "local-markdown":
    default:
      cached = new LocalMarkdownKnowledgeProvider();
      return cached;
  }
}

export type { KnowledgeProvider } from "./provider";
