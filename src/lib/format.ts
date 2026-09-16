import { partsInOfficeTz } from "./tz";

const pad = (n: number) => String(n).padStart(2, "0");

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = partsInOfficeTz(d);
  return `${p.year}/${pad(p.month)}/${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = partsInOfficeTz(d);
  return `${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date.replace(/-/g, "/");
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const p = partsInOfficeTz(d);
  return `${p.year}/${pad(p.month)}/${pad(p.day)}`;
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(1)} 時間`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} 分`;
  return `${(min / 60).toFixed(1)} 時間`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min} 分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 時間前`;
  const d = Math.floor(h / 24);
  return `${d} 日前`;
}
