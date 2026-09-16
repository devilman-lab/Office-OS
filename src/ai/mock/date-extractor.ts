import type { ExtractedDate } from "../provider";
import { addDays, toDateOnly } from "@/lib/utils";

const FULL_RE = /(\d{4})年\s?(\d{1,2})月\s?(\d{1,2})日/g;
const SLASH_RE = /(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/g;
const MD_RE = /(?<!\d)(\d{1,2})月\s?(\d{1,2})日/g;

function roleFromContext(text: string, index: number): ExtractedDate["role"] {
  const before = text.slice(Math.max(0, index - 20), index);
  const after = text.slice(index, index + 40);
  if (/(期限|締切|施行|希望日|提出期限|申請期限)/.test(before)) return "deadline";
  if (/(退職|退社|離職|支給|出産|異動|最終出勤)/.test(before)) return "event";
  if (/(入社|着任|勤務開始|採用|開始)/.test(before + after)) return "start";
  if (/(まで|締切|期限|期日|提出|施行|有効期限|申請期限)/.test(after)) return "deadline";
  if (/(退職|退社|離職|支給|出産|異動|最終)/.test(after)) return "event";
  return "unknown";
}

function build(y: number, m: number, d: number): string | null {
  const dt = new Date(y, m - 1, d);
  if (dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return toDateOnly(dt);
}

/** Extracts explicit and relative dates from Japanese text. Month/day without a year is resolved to the nearest future occurrence. */
export function extractDates(text: string, referenceIso: string): ExtractedDate[] {
  const normalized = text.normalize("NFKC");
  const ref = new Date(referenceIso);
  const results: ExtractedDate[] = [];
  const seen = new Set<string>();
  const push = (t: string, iso: string | null, role: ExtractedDate["role"]) => {
    if (!iso || seen.has(t)) return;
    seen.add(t);
    results.push({ text: t, iso, role });
  };

  for (const m of normalized.matchAll(FULL_RE)) push(m[0], build(+m[1], +m[2], +m[3]), roleFromContext(normalized, m.index ?? 0));
  for (const m of normalized.matchAll(SLASH_RE)) push(m[0], build(+m[1], +m[2], +m[3]), roleFromContext(normalized, m.index ?? 0));
  for (const m of normalized.matchAll(MD_RE)) {
    const preceded = normalized.slice(Math.max(0, (m.index ?? 0) - 5), m.index ?? 0);
    if (/\d{4}年\s?$/.test(preceded)) continue; // already captured with year
    let year = ref.getFullYear();
    const month = +m[1];
    if (month < ref.getMonth() + 1 - 1) year += 1; // treat clearly-past months as next year
    push(m[0], build(year, month, +m[2]), roleFromContext(normalized, m.index ?? 0));
  }

  const relative: [RegExp, () => Date][] = [
    [/今月末/, () => new Date(ref.getFullYear(), ref.getMonth() + 1, 0)],
    [/来月末/, () => new Date(ref.getFullYear(), ref.getMonth() + 2, 0)],
    [/来月(?:初め|上旬|1日)/, () => new Date(ref.getFullYear(), ref.getMonth() + 1, 1)],
    [/来週/, () => addDays(ref, 7)],
    [/明日/, () => addDays(ref, 1)],
  ];
  for (const [re, fn] of relative) {
    const m = normalized.match(re);
    if (m) push(m[0], toDateOnly(fn()), roleFromContext(normalized, m.index ?? 0));
  }
  return results;
}
