import { getDb } from "../src/db/client";
import { resetDatabase } from "../src/db/seed";

const db = getDb();
resetDatabase(db);
console.log("Database reset and seeded:", process.env.URIZUN_DB_PATH ?? "./data/urizun-os.db");
