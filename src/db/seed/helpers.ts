import { addDays, toDateOnly } from "@/lib/utils";

export const NOW = new Date();

export function daysAgoIso(days: number, hour = 10, minute = 0): string {
  const d = addDays(NOW, -days);
  d.setHours(hour, minute, Math.floor(Math.random() * 0), 0);
  return d.toISOString();
}

export function daysAheadDate(days: number): string {
  return toDateOnly(addDays(NOW, days));
}

export function daysAgoDate(days: number): string {
  return toDateOnly(addDays(NOW, -days));
}

/** Japanese "M月D日" for a date N days ahead — used inside natural-language seed text. */
export function jpDateAhead(days: number): string {
  const d = addDays(NOW, days);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export const DEMO_NOTICE = "> DEMO SAMPLE KNOWLEDGE — 本文書はデモ用のサンプルです。法令・制度の正確性を保証するものではなく、実際の業務判断には使用しないでください。";
