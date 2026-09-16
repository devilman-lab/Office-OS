import { addDays, toDateOnly } from "@/lib/utils";
import { officeTime, partsInOfficeTz } from "@/lib/tz";

export const NOW = new Date();

/** ISO instant for a wall-clock time (Asia/Tokyo) N days ago. */
export function daysAgoIso(days: number, hour = 10, minute = 0): string {
  return officeTime(toDateOnly(addDays(NOW, -days)), hour, minute).toISOString();
}

export function daysAheadDate(days: number): string {
  return toDateOnly(addDays(NOW, days));
}

export function daysAgoDate(days: number): string {
  return toDateOnly(addDays(NOW, -days));
}

/** Japanese "M月D日" for a date N days ahead — used inside natural-language seed text. */
export function jpDateAhead(days: number): string {
  const p = partsInOfficeTz(addDays(NOW, days));
  return `${p.month}月${p.day}日`;
}

export const DEMO_NOTICE = "> DEMO SAMPLE KNOWLEDGE — 本文書はデモ用のサンプルです。法令・制度の正確性を保証するものではなく、実際の業務判断には使用しないでください。";
