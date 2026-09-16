import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { getDb, setDb, openDatabase, type DB } from "./client";
import { ensureSeeded, seedDatabase } from "./seed";

/**
 * Snapshot persistence for serverless hosting (Vercel).
 *
 * Serverless functions have no shared writable disk and may run on several instances, so the
 * SQLite database is kept in memory and its serialized image is stored in Vercel Blob:
 *   - prepareDb(): before handling a request, fetch the latest snapshot if it changed.
 *   - persistDb(): after a mutation, upload the new snapshot.
 * The repositories keep their synchronous better-sqlite3 API; only the request boundary is async.
 *
 * Locally (no BLOB_READ_WRITE_TOKEN) the file database is used directly and these calls are no-ops,
 * except when URIZUN_SNAPSHOT_STORE=file is set, which exercises the same logic against data/snapshot/.
 */

interface SnapshotMeta { fingerprint: string; url: string }
interface SnapshotStore {
  head(): Promise<SnapshotMeta | null>;
  get(meta: SnapshotMeta): Promise<Buffer>;
  put(buffer: Buffer): Promise<SnapshotMeta>;
}

const BLOB_PATH = "urizun-os/snapshot.db";

class VercelBlobStore implements SnapshotStore {
  async head(): Promise<SnapshotMeta | null> {
    const { head, BlobNotFoundError } = await import("@vercel/blob");
    try {
      const meta = await head(BLOB_PATH);
      return { fingerprint: `${new Date(meta.uploadedAt).getTime()}-${meta.size}`, url: meta.url };
    } catch (err) {
      if (err instanceof BlobNotFoundError) return null;
      throw err;
    }
  }
  async get(meta: SnapshotMeta): Promise<Buffer> {
    // The fingerprint in the query string defeats CDN caching of older versions.
    const res = await fetch(`${meta.url}?v=${encodeURIComponent(meta.fingerprint)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`snapshot download failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  async put(buffer: Buffer): Promise<SnapshotMeta> {
    const { put } = await import("@vercel/blob");
    const blob = await put(BLOB_PATH, buffer, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/octet-stream" });
    const meta = await this.head();
    return meta ?? { fingerprint: String(Date.now()), url: blob.url };
  }
}

class LocalFileStore implements SnapshotStore {
  private file = path.resolve(/*turbopackIgnore: true*/ process.cwd(), "data/snapshot/snapshot.db");
  async head() {
    if (!fs.existsSync(this.file)) return null;
    const st = fs.statSync(this.file);
    return { fingerprint: `${st.mtimeMs}-${st.size}`, url: this.file };
  }
  async get(meta: SnapshotMeta) { return fs.readFileSync(meta.url); }
  async put(buffer: Buffer) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, buffer);
    return (await this.head())!;
  }
}

export type StorageMode = "local-file" | "vercel-blob" | "ephemeral-tmp" | "snapshot-file";

export function storageMode(): StorageMode {
  if (process.env.URIZUN_SNAPSHOT_STORE === "file") return "snapshot-file";
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) return "ephemeral-tmp";
  return "local-file";
}

function store(): SnapshotStore | null {
  const mode = storageMode();
  if (mode === "vercel-blob") return new VercelBlobStore();
  if (mode === "snapshot-file") return new LocalFileStore();
  return null;
}

const state = globalThis as unknown as { __urizunSnapshotFp?: string | null };

/** Makes sure the process holds the latest database before a request reads or writes it. */
export async function prepareDb(): Promise<DB> {
  const s = store();
  if (!s) {
    const handle = getDb();
    ensureSeeded(handle);
    return handle;
  }
  const meta = await s.head();
  if (!meta) {
    const fresh = openDatabase(":memory:");
    seedDatabase(fresh);
    setDb(fresh, "snapshot");
    state.__urizunSnapshotFp = null;
    await persistDb();
    return fresh;
  }
  if (meta.fingerprint !== state.__urizunSnapshotFp) {
    const buffer = await s.get(meta);
    const loaded = new Database(buffer);
    loaded.pragma("foreign_keys = ON");
    setDb(loaded, "snapshot");
    state.__urizunSnapshotFp = meta.fingerprint;
  }
  return getDb();
}

/** Uploads the current database image after a mutation. No-op for the local file database. */
export async function persistDb(): Promise<void> {
  const s = store();
  if (!s) return;
  const meta = await s.put(getDb().serialize());
  state.__urizunSnapshotFp = meta.fingerprint;
}
