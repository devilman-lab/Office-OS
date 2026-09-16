import { db } from "@/db";
import { KNOWLEDGE_CATEGORIES } from "@/domain/enums";
import type { KnowledgeDocument } from "@/domain/types";
import { knowledgeRepository } from "@/repositories";
import { getKnowledgeProvider } from "@/knowledge";

export interface KnowledgeBrowser {
  categories: { name: string; count: number }[];
  documents: KnowledgeDocument[];
  selected: KnowledgeDocument | null;
  usage: { referenceCount: number; lastUsed: string | null };
  health: { ok: boolean; message: string };
  providerName: string;
}

export async function getKnowledgeBrowser(selectedId?: string, category?: string): Promise<KnowledgeBrowser> {
  db();
  const all = knowledgeRepository.listDocuments();
  const documents = category ? all.filter((d) => d.category === category) : all;
  const selected = selectedId ? knowledgeRepository.findDocument(selectedId) : documents[0] ?? null;
  const refs = selected ? knowledgeRepository.listReferences().filter((r) => r.knowledgeDocumentId === selected.id) : [];
  const provider = getKnowledgeProvider();
  return {
    categories: KNOWLEDGE_CATEGORIES.map((name) => ({ name, count: all.filter((d) => d.category === name).length })),
    documents,
    selected,
    usage: { referenceCount: refs.length, lastUsed: refs[0]?.createdAt ?? null },
    health: await provider.healthCheck(),
    providerName: provider.name,
  };
}
