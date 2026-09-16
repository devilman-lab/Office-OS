import { clsx, type ClassValue } from "clsx";
import { dateOnlyInOfficeTz } from "./tz";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** YYYY-MM-DD in the office timezone (Asia/Tokyo), identical on server and client. */
export function toDateOnly(date: Date): string {
  return dateOnlyInOfficeTz(date);
}

export function todayDateOnly(): string {
  return toDateOnly(new Date());
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function truncate(text: string, max = 80): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}
