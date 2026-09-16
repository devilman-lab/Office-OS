import { z } from "zod";
import { PRIORITIES } from "./enums";

/**
 * Zod schemas used to validate every AI output before it touches the business database.
 * LLM output is treated as untrusted input.
 */

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式である必要があります");

export const CaseProposalSchema = z.object({
  title: z.string().trim().min(3, "案件名は3文字以上で入力してください").max(120),
  description: z.string().trim().min(1).max(2000),
  priority: z.enum(PRIORITIES),
  dueDate: dateOnly.nullable(),
  assignee: z.string().trim().min(1),
});

export const TaskProposalSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000),
  priority: z.enum(PRIORITIES),
  dueDate: dateOnly.nullable(),
  assignee: z.string().trim().min(1),
});

export const MissingInformationSchema = z.object({
  field: z.string(),
  label: z.string(),
  message: z.string(),
  severity: z.enum(["required", "recommended"]),
});

/** The raw structure the AI provider must return for a proposal. */
export const AIProposalOutputSchema = z.object({
  intent: z.string().min(1),
  intentLabel: z.string().min(1),
  summary: z.string().trim().min(5).max(1000),
  caseProposal: CaseProposalSchema,
  taskProposals: z.array(TaskProposalSchema).min(1, "タスク候補が1件以上必要です").max(12),
  missingInformation: z.array(MissingInformationSchema).default([]),
  confidence: z.enum(["high", "medium", "low"]),
});
export type AIProposalOutput = z.infer<typeof AIProposalOutputSchema>;

/** Schema applied at approval time: a case cannot be registered without a due date. */
export const ApprovableProposalSchema = z.object({
  caseProposal: CaseProposalSchema.extend({ dueDate: dateOnly }),
  taskProposals: z.array(TaskProposalSchema).min(1),
});

export const ProposalEditSchema = z.object({
  summary: z.string().trim().min(5).max(1000).optional(),
  caseProposal: CaseProposalSchema.partial().optional(),
  taskProposals: z.array(TaskProposalSchema).min(1).max(12).optional(),
});
export type ProposalEdit = z.infer<typeof ProposalEditSchema>;

export const GroundedAnswerSchema = z.object({
  answer: z.string().min(1),
  grounded: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  citedDocumentIds: z.array(z.string()),
});
export type GroundedAnswerOutput = z.infer<typeof GroundedAnswerSchema>;
