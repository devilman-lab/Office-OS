"use server";

import { revalidatePath } from "next/cache";
import { toErrorInfo } from "@/domain/errors";
import type { AgentAction, CaseStatus, TaskStatus } from "@/domain/enums";
import type { ProposalEdit } from "@/domain/schemas";
import { runIntakePipeline } from "@/services/intake.service";
import { approveProposal, editProposal, rejectProposal } from "@/services/approval.service";
import { askAssistant } from "@/services/assistant.service";
import { runAgentTool, runDemoError, type DemoErrorKind } from "@/services/agent.service";
import { updateCaseStatus, updateTaskStatus } from "@/services/case.service";
import { createBackup, retryIntegration, setKnowledgeAvailability, syncIntegration } from "@/services/integration.service";
import { resetDemoData } from "@/services/demo.service";
import { globalSearch } from "@/services/search.service";
import { settingsRepository } from "@/repositories";
import { audit } from "@/audit/audit-logger";
import { db } from "@/db";
import { prepareDb, persistDb } from "@/db/snapshot";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string; details?: unknown } };

async function wrap<T>(fn: () => Promise<T> | T, revalidate = true, persist = true): Promise<ActionResult<T>> {
  try {
    await prepareDb();
    const data = await fn();
    if (persist) await persistDb();
    if (revalidate) revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (err) {
    const info = toErrorInfo(err);
    if (info.code === "UNEXPECTED") console.error(err);
    return { ok: false, error: info };
  }
}

/* ---- Inbox / pipeline ---- */
export async function runPipelineAction(inboxItemId: string) {
  return wrap(() => runIntakePipeline(inboxItemId));
}

/* ---- Approvals ---- */
export async function approveProposalAction(id: string, options: { reviewNote?: string; allowDuplicate?: boolean }) {
  return wrap(() => approveProposal(id, options));
}
export async function rejectProposalAction(id: string, reason: string) {
  return wrap(() => rejectProposal(id, reason));
}
export async function editProposalAction(id: string, edit: ProposalEdit) {
  return wrap(() => editProposal(id, edit));
}

/* ---- Assistant / Agent ---- */
export async function askAssistantAction(question: string) {
  return wrap(() => askAssistant(question), false);
}
export async function runAgentToolAction(action: AgentAction, input?: string) {
  return wrap(() => runAgentTool(action, input));
}
export async function runDemoErrorAction(kind: DemoErrorKind) {
  return wrap(() => runDemoError(kind));
}

/* ---- Cases / Tasks ---- */
export async function updateCaseStatusAction(id: string, status: CaseStatus) {
  return wrap(() => updateCaseStatus(id, status));
}
export async function updateTaskStatusAction(id: string, status: TaskStatus) {
  return wrap(() => updateTaskStatus(id, status));
}

/* ---- Integrations / Backup / Settings ---- */
export async function syncIntegrationAction(id: string) {
  return wrap(() => syncIntegration(id));
}
export async function retryIntegrationAction(id: string) {
  return wrap(() => retryIntegration(id));
}
export async function createBackupAction(label?: string) {
  return wrap(() => createBackup(label));
}
export async function setKnowledgeAvailabilityAction(available: boolean) {
  return wrap(() => setKnowledgeAvailability(available));
}
export async function setSettingAction(key: string, value: string) {
  return wrap(() => {
    db();
    settingsRepository.set(key, value);
    audit.human("SETTINGS_CHANGED", "settings", key, "success", `${key} = ${value}`, {});
    return { key, value };
  });
}

/* ---- Demo ---- */
export async function resetDemoAction() {
  return wrap(() => resetDemoData());
}

/* ---- Search ---- */
export async function globalSearchAction(q: string) {
  return wrap(() => globalSearch(q), false, false);
}
