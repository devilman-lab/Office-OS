import { beforeEach } from "vitest";
import { openDatabase, setDb } from "../src/db/client";
import { seedDatabase } from "../src/db/seed";

// Every test starts from a fresh in-memory database seeded with the demo data.
beforeEach(() => {
  const db = openDatabase(":memory:");
  setDb(db, ":memory:");
  seedDatabase(db);
});
