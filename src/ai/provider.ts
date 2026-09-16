import type { KnowledgeHit } from "@/domain/types";
import type { Confidence } from "@/domain/enums";

/** Input to the AI layer is ALWAYS masked text. The provider never sees raw PII. */
export interface MaskedInput {
  maskedText: string;
  subject: string;
  source: string;
  receivedAt: string;
}

export interface IntentResult {
  intent: string;
  label: string;
  confidence: Confidence;
  score: number;
  rationale: string;
  alternatives: { intent: string; label: string; score: number }[];
}

export interface ExtractedDate {
  text: string;
  iso: string;
  role: "start" | "deadline" | "event" | "unknown";
}

export interface ExtractedEntities {
  dates: ExtractedDate[];
  persons: string[];
  organizations: string[];
  keywords: string[];
  headcount: number | null;
}

export interface ProposalContext {
  input: MaskedInput;
  intent: IntentResult;
  entities: ExtractedEntities;
  knowledge: KnowledgeHit[];
  assigneeCandidates: readonly string[];
}

export interface AnswerContext {
  question: string;
  knowledge: KnowledgeHit[];
}

/**
 * AI Service abstraction. The rest of the system depends only on this contract.
 *   Mock AI (prototype) → OpenAI / other hosted LLM → Local LLM (Ollama, vLLM, ...)
 * Provider outputs are *untrusted* and validated with Zod by the application layer.
 */
export interface AIProvider {
  readonly name: string;
  readonly kind: "mock" | "openai" | "local";
  readonly trainingOptOut: boolean;
  classifyIntent(input: MaskedInput): Promise<IntentResult>;
  extractEntities(input: MaskedInput): Promise<ExtractedEntities>;
  /** Returns the raw (unvalidated) proposal structure. */
  generateProposal(ctx: ProposalContext): Promise<unknown>;
  /** Returns the raw (unvalidated) grounded answer structure. */
  answerQuestion(ctx: AnswerContext): Promise<unknown>;
}
