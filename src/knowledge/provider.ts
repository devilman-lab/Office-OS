import type { KnowledgeDocument, KnowledgeHit } from "@/domain/types";

export interface KnowledgeSearchOptions {
  limit?: number;
  category?: string;
  verifiedOnly?: boolean;
}

/**
 * Knowledge Service abstraction.
 * Prototype: LocalMarkdownKnowledgeProvider (bigram scoring over SQLite-backed markdown).
 * Production: VectorKnowledgeProvider (embeddings + vector DB / hybrid search) implementing the same contract.
 *
 * Deliberately has no write methods: the knowledge source is immutable from the application and the AI.
 */
export interface KnowledgeProvider {
  readonly name: string;
  readonly mode: "local-markdown" | "vector" | "hybrid";
  search(query: string, options?: KnowledgeSearchOptions): Promise<KnowledgeHit[]>;
  getDocument(id: string): Promise<KnowledgeDocument | null>;
  listDocuments(): Promise<KnowledgeDocument[]>;
  healthCheck(): Promise<{ ok: boolean; message: string }>;
}
