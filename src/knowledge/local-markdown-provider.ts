import type { KnowledgeDocument, KnowledgeHit } from "@/domain/types";
import type { Relevance } from "@/domain/enums";
import { KnowledgeUnavailableError } from "@/domain/errors";
import { knowledgeRepository } from "@/repositories/knowledge.repository";
import { settingsRepository } from "@/repositories/settings.repository";
import { bigrams, keywords, normalize, termFrequency } from "./tokenizer";
import type { KnowledgeProvider, KnowledgeSearchOptions } from "./provider";

export const SETTING_KNOWLEDGE_UNAVAILABLE = "simulate.knowledge_unavailable";

interface IndexedDoc {
  doc: KnowledgeDocument;
  title: Map<string, number>;
  tags: Map<string, number>;
  body: Map<string, number>;
  normalizedBody: string;
}

export const RELEVANCE_THRESHOLDS = { high: 0.38, medium: 0.2, low: 0.1 } as const;

export function relevanceFromScore(score: number): Relevance | null {
  if (score >= RELEVANCE_THRESHOLDS.high) return "high";
  if (score >= RELEVANCE_THRESHOLDS.medium) return "medium";
  if (score >= RELEVANCE_THRESHOLDS.low) return "low";
  return null;
}

/**
 * Local keyword/bigram search over the markdown knowledge base.
 * Returns hits ordered by a normalised score in [0, 1] together with the matched terms and a snippet,
 * so the UI can show *why* a document was retrieved.
 */
export class LocalMarkdownKnowledgeProvider implements KnowledgeProvider {
  readonly name = "Local Markdown (Obsidian vault mirror)";
  readonly mode = "local-markdown" as const;

  private buildIndex(docs: KnowledgeDocument[]): { indexed: IndexedDoc[]; df: Map<string, number> } {
    const indexed: IndexedDoc[] = docs.map((doc) => ({
      doc,
      title: termFrequency(bigrams(doc.title)),
      tags: termFrequency(bigrams(doc.tags.join(" "))),
      body: termFrequency(bigrams(doc.content)),
      normalizedBody: normalize(doc.content),
    }));
    const df = new Map<string, number>();
    for (const d of indexed) {
      const seen = new Set<string>([...d.title.keys(), ...d.tags.keys(), ...d.body.keys()]);
      for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
    }
    return { indexed, df };
  }

  private assertAvailable() {
    if (settingsRepository.getBool(SETTING_KNOWLEDGE_UNAVAILABLE, false)) {
      throw new KnowledgeUnavailableError();
    }
  }

  async search(query: string, options: KnowledgeSearchOptions = {}): Promise<KnowledgeHit[]> {
    this.assertAvailable();
    const limit = options.limit ?? 5;
    let docs = knowledgeRepository.listDocuments();
    if (options.category) docs = docs.filter((d) => d.category === options.category);
    if (options.verifiedOnly) docs = docs.filter((d) => d.verified);
    const { indexed, df } = this.buildIndex(docs);
    const N = Math.max(indexed.length, 1);
    const qTerms = [...new Set(bigrams(query))];
    if (qTerms.length === 0) return [];

    const idf = (t: string) => Math.log(1 + N / ((df.get(t) ?? 0) + 0.5));
    const maxPerTerm = 3 + 2 + 3; // title*3 + tags*2 + body(capped 3)
    const denom = qTerms.reduce((s, t) => s + idf(t) * maxPerTerm, 0) || 1;

    const scored = indexed.map((d) => {
      let raw = 0;
      for (const t of qTerms) {
        const w = idf(t);
        const inTitle = Math.min(d.title.get(t) ?? 0, 1) * 3;
        const inTags = Math.min(d.tags.get(t) ?? 0, 1) * 2;
        const inBody = Math.min(d.body.get(t) ?? 0, 3);
        raw += w * (inTitle + inTags + inBody);
      }
      // scale so that a strong topical match lands in the "high" band
      const score = Math.min(1, (raw / denom) * 2.2);
      return { d, score };
    });

    const qKeywords = keywords(query);
    return scored
      .filter((s) => s.score >= RELEVANCE_THRESHOLDS.low)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ d, score }) => {
        const matchedTerms = [
          ...d.doc.tags.filter((tag) => normalize(query).includes(normalize(tag))),
          ...qKeywords.filter((k) => d.normalizedBody.includes(normalize(k)) || normalize(d.doc.title).includes(normalize(k))),
        ];
        return {
          document: d.doc,
          score: Number(score.toFixed(3)),
          relevance: relevanceFromScore(score) ?? "low",
          matchedTerms: [...new Set(matchedTerms)].slice(0, 6),
          snippet: bestSnippet(d.doc.content, qTerms),
        };
      });
  }

  async getDocument(id: string) {
    this.assertAvailable();
    return knowledgeRepository.findDocument(id);
  }

  async listDocuments() {
    this.assertAvailable();
    return knowledgeRepository.listDocuments();
  }

  async healthCheck() {
    if (settingsRepository.getBool(SETTING_KNOWLEDGE_UNAVAILABLE, false)) {
      return { ok: false, message: "ナレッジソースが利用できません（シミュレーション）" };
    }
    return { ok: true, message: `${knowledgeRepository.countDocuments()} 件のドキュメントを索引済み` };
  }
}

/** Picks the content line with the highest overlap with the query bigrams. */
export function bestSnippet(content: string, qTerms: string[]): string {
  const lines = content
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").replace(/^[-*]\s*/, "").trim())
    .filter((l) => l.length > 6 && !l.startsWith(">"));
  let best = lines[0] ?? "";
  let bestScore = -1;
  for (const line of lines) {
    const tf = termFrequency(bigrams(line));
    let s = 0;
    for (const t of qTerms) if (tf.has(t)) s += 1;
    if (s > bestScore) {
      bestScore = s;
      best = line;
    }
  }
  return best.length > 140 ? best.slice(0, 139) + "…" : best;
}
