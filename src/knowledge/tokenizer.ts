/**
 * Lightweight Japanese-aware tokenizer used by the local knowledge search.
 * Character bigrams work reasonably for Japanese without a morphological analyser
 * and keep the prototype dependency-free. Production swaps this for embeddings / a real index.
 */

const NOISE_RE = /[\s、。，．,.!！?？「」『』（）()［］\[\]【】:：;；・…‐\-—–〜~*#>|`'"]/g;

export function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(NOISE_RE, "");
}

export function bigrams(text: string): string[] {
  const n = normalize(text);
  if (n.length < 2) return n ? [n] : [];
  const out: string[] = [];
  for (let i = 0; i < n.length - 1; i++) out.push(n.slice(i, i + 2));
  return out;
}

export function termFrequency(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

/** Extracts candidate keywords (runs of kanji/katakana/alphanumerics of length >= 2) for display. */
export function keywords(text: string): string[] {
  const n = text.normalize("NFKC");
  const found = n.match(/[一-龥]{2,}|[ァ-ヶー]{2,}|[a-zA-Z0-9]{2,}/g) ?? [];
  return [...new Set(found)];
}
