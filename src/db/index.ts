import { getDb } from "./client";
import { ensureSeeded } from "./seed";

/** Entry point used by services: returns a ready, seeded database. */
export function db() {
  const handle = getDb();
  ensureSeeded(handle);
  return handle;
}

export { getDb, setDb, openDatabase } from "./client";
export { seedDatabase, resetDatabase, ensureSeeded } from "./seed";
