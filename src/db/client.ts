import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { ALL_TABLES, SCHEMA_SQL } from "./schema";

/**
 * Single SQLite connection for the process.
 * - In Next.js dev the module can be re-evaluated on HMR, so the handle is cached on globalThis.
 * - Tests use an in-memory database via `openDatabase(":memory:")`.
 */
export type DB = Database.Database;

const globalForDb = globalThis as unknown as { __urizunDb?: DB; __urizunDbPath?: string; __urizunDbForced?: boolean };

/**
 * Local: ./data/urizun-os.db (git-ignored).
 * Vercel / serverless: the deployment bundle is read-only, so the database lives in /tmp.
 * It is seeded automatically on cold start; demo state is per server instance and ephemeral.
 */
export function resolveDbPath(): string {
  const serverless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
  const configured = process.env.URIZUN_DB_PATH || (serverless ? "/tmp/urizun-os.db" : "./data/urizun-os.db");
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), configured);
}

export function openDatabase(file: string): DB {
  if (file !== ":memory:") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

export function getDb(): DB {
  if (globalForDb.__urizunDb && globalForDb.__urizunDbForced) return globalForDb.__urizunDb;
  const file = resolveDbPath();
  if (globalForDb.__urizunDb && globalForDb.__urizunDbPath === file) {
    return globalForDb.__urizunDb;
  }
  const db = openDatabase(file);
  globalForDb.__urizunDb = db;
  globalForDb.__urizunDbPath = file;
  return db;
}

/** Allow tests / scripts to inject a database handle. */
export function setDb(db: DB, label = ":memory:") {
  globalForDb.__urizunDb = db;
  globalForDb.__urizunDbPath = label;
  globalForDb.__urizunDbForced = true;
}

export function truncateAll(db: DB) {
  db.pragma("foreign_keys = OFF");
  const tx = db.transaction(() => {
    for (const table of ALL_TABLES) db.prepare(`DELETE FROM ${table}`).run();
  });
  tx();
  db.pragma("foreign_keys = ON");
}

export function nextId(db: DB, prefix: string, width = 4): string {
  const row = db.prepare("SELECT value FROM id_counters WHERE prefix = ?").get(prefix) as { value: number } | undefined;
  const next = (row?.value ?? 0) + 1;
  db.prepare("INSERT INTO id_counters(prefix, value) VALUES(?, ?) ON CONFLICT(prefix) DO UPDATE SET value = excluded.value").run(prefix, next);
  return `${prefix}-${String(next).padStart(width, "0")}`;
}

export function countRows(db: DB, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number };
  return row.c;
}
