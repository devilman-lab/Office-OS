import { audit } from "@/audit/audit-logger";
import { getDb, resetDatabase } from "@/db";
import { getMockAIProvider } from "@/ai";

/** Restores the seeded demo state (cases, tasks, proposals, audit logs, metrics, inbox). */
export function resetDemoData() {
  const handle = getDb();
  resetDatabase(handle);
  getMockAIProvider()?.forceNextProposalOutput(undefined);
  audit.human("DEMO_RESET", "system", null, "success", "デモデータを初期状態に戻しました", {});
}
