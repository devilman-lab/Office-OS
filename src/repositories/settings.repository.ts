import { getDb } from "@/db/client";
import { nowIso } from "@/lib/utils";

export const settingsRepository = {
  get(key: string, fallback = ""): string {
    const r = getDb().prepare("SELECT value FROM app_settings WHERE key = ?").get(key) as { value: string } | undefined;
    return r?.value ?? fallback;
  },
  getBool(key: string, fallback = false): boolean {
    const v = this.get(key, fallback ? "true" : "false");
    return v === "true";
  },
  set(key: string, value: string) {
    getDb()
      .prepare("INSERT INTO app_settings(key, value, updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
      .run(key, value, nowIso());
  },
  all(): Record<string, string> {
    const rows = getDb().prepare("SELECT key, value FROM app_settings").all() as { key: string; value: string }[];
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
};
