import type { MaskedEntity, MaskingResult } from "@/domain/types";

/**
 * Rule-based PII masking used before any text reaches the AI layer.
 *
 * Prototype scope: deterministic regex + dictionary rules (persons, organizations, phone, email, address).
 * Production: replace/augment with an NER model or a dedicated PII detection service behind the same interface.
 * The original → token mapping is kept in memory for the request only; the AI layer receives the masked text.
 */

export interface MaskingOptions {
  knownPersons?: string[];
  knownOrganizations?: string[];
}

type EntityType = MaskedEntity["type"];

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_RE = /(?:\+81[-\d]{9,13}|0\d{1,4}[-‐−ー–]\d{1,4}[-‐−ー–]\d{3,4}|0\d{9,10})/g;
const ADDRESS_RE =
  /(?:〒\s?\d{3}[-‐]?\d{4}\s*)?(?:北海道|東京都|京都府|大阪府|[一-龥]{2,3}県)[一-龥ぁ-んァ-ヶ]{1,12}(?:[0-9０-９]{1,4}(?:[-‐−ー][0-9０-９]{1,4}){0,2})(?:[ 　]?[一-龥ァ-ヶ0-9０-９]{0,12}(?:ビル|マンション|号室|階|号)[0-9０-９]{0,4})?/g;
const ORG_PREFIX_RE = /(?:株式会社|有限会社|合同会社|一般社団法人|医療法人|社会福祉法人)[一-龥ァ-ヶA-Za-z0-9ー・]{1,20}/g;
const ORG_SUFFIX_RE = /[一-龥ァ-ヶA-Za-z0-9ー]{1,15}(?:株式会社|有限会社|合同会社)/g;
const PERSON_KANJI_RE = /([一-龥]{1,3}[ 　]?[一-龥]{1,3})(?=(?:さん|様|さま|氏|殿))/g;
const PERSON_KANA_RE = /([ァ-ヶー]{2,8}(?:[ 　・][ァ-ヶー]{2,8})?)(?=(?:さん|様|さま|氏))/g;

const PERSON_STOPWORDS = new Set([
  "担当者", "担当", "御中", "各位", "皆", "皆様", "御", "関係者", "責任者", "代表者", "従業員", "社員", "利用者", "申請者", "本人", "先生", "所長", "社長", "パート", "アルバイト", "スタッフ", "メンバー", "オーナー", "ドライバー",
]);

class TokenRegistry {
  private map = new Map<string, MaskedEntity>();
  private counters: Record<EntityType, number> = { PERSON: 0, ORGANIZATION: 0, PHONE: 0, EMAIL: 0, ADDRESS: 0 };

  tokenFor(type: EntityType, original: string): string {
    const key = `${type}:${original}`;
    const existing = this.map.get(key);
    if (existing) return existing.token;
    this.counters[type] += 1;
    const token = `[${type}_${String(this.counters[type]).padStart(3, "0")}]`;
    this.map.set(key, { type, token, original });
    return token;
  }
  entities(): MaskedEntity[] {
    return [...this.map.values()];
  }
  counts() {
    return { ...this.counters };
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceKnown(text: string, values: string[], type: EntityType, registry: TokenRegistry): string {
  const sorted = [...new Set(values.filter((v) => v && v.trim().length >= 2))].sort((a, b) => b.length - a.length);
  let out = text;
  for (const value of sorted) {
    const re = new RegExp(escapeRegExp(value), "g");
    if (re.test(out)) {
      const token = registry.tokenFor(type, value);
      out = out.replace(new RegExp(escapeRegExp(value), "g"), token);
    }
  }
  return out;
}

function replacePattern(text: string, re: RegExp, type: EntityType, registry: TokenRegistry, filter?: (m: string) => boolean): string {
  return text.replace(re, (m: string) => {
    if (m.includes("[") || m.includes("]")) return m; // never re-mask tokens
    if (filter && !filter(m)) return m;
    return registry.tokenFor(type, m);
  });
}

export function maskPII(text: string, options: MaskingOptions = {}): MaskingResult {
  const registry = new TokenRegistry();
  let out = text;

  out = replacePattern(out, EMAIL_RE, "EMAIL", registry);
  out = replacePattern(out, PHONE_RE, "PHONE", registry);
  out = replacePattern(out, ADDRESS_RE, "ADDRESS", registry);

  out = replaceKnown(out, options.knownOrganizations ?? [], "ORGANIZATION", registry);
  out = replacePattern(out, ORG_PREFIX_RE, "ORGANIZATION", registry);
  out = replacePattern(out, ORG_SUFFIX_RE, "ORGANIZATION", registry);

  out = replaceKnown(out, options.knownPersons ?? [], "PERSON", registry);
  const personFilter = (m: string) => {
    const compact = m.replace(/[ 　]/g, "");
    if (PERSON_STOPWORDS.has(compact)) return false;
    if (/(?:者|部|課|係|長|社|店|室)$/.test(compact) && compact.length <= 3) return false;
    return true;
  };
  out = replacePattern(out, PERSON_KANJI_RE, "PERSON", registry, personFilter);
  out = replacePattern(out, PERSON_KANA_RE, "PERSON", registry, personFilter);

  return { original: text, masked: out, entities: registry.entities(), counts: registry.counts() };
}

/** Restores tokens back to original values for display to authorised humans only. Never used on the AI path. */
export function unmask(masked: string, entities: MaskedEntity[]): string {
  let out = masked;
  for (const e of entities) out = out.split(e.token).join(e.original);
  return out;
}

/** True when the text still contains anything that looks like unmasked PII (defensive check before AI calls). */
export function containsLikelyPII(text: string): boolean {
  return new RegExp(EMAIL_RE.source).test(text) || new RegExp(PHONE_RE.source).test(text);
}
