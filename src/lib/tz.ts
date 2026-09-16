/**
 * All dates are presented in the office's timezone (Asia/Tokyo) regardless of where the code runs
 * (Vercel functions run in UTC; browsers run in the user's zone). Using one fixed zone on both
 * server and client keeps SSR output and hydration identical.
 */
export const OFFICE_TZ = "Asia/Tokyo";

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: OFFICE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export interface TzParts { year: number; month: number; day: number; hour: number; minute: number; second: number }

export function partsInOfficeTz(date: Date): TzParts {
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) if (part.type !== "literal") p[part.type] = part.value;
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour, minute: +p.minute, second: +p.second };
}

/** YYYY-MM-DD in the office timezone. */
export function dateOnlyInOfficeTz(date: Date): string {
  const { year, month, day } = partsInOfficeTz(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Builds an instant for a wall-clock time in the office timezone. */
export function officeTime(dateOnly: string, hour: number, minute: number): Date {
  return new Date(`${dateOnly}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`);
}
