import type { AIProvider, AnswerContext, ExtractedEntities, IntentResult, MaskedInput, ProposalContext } from "../provider";

/**
 * Placeholder for a hosted LLM provider. Not wired in the prototype (no network calls are made).
 * Production notes:
 *  - Use an enterprise/API tier with a contractual "no training on inputs" guarantee.
 *  - Send only masked text; request JSON output and validate with the same Zod schemas.
 *  - Log request/response ids into the audit log.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
export class OpenAIProvider implements AIProvider {
  readonly name = "OpenAI (not configured in prototype)";
  readonly kind = "openai" as const;
  readonly trainingOptOut = true;

  private unavailable(): never {
    throw new Error("外部 LLM プロバイダはこのプロトタイプでは構成されていません（URIZUN_AI_PROVIDER=mock を使用してください）。");
  }
  async classifyIntent(_input: MaskedInput): Promise<IntentResult> { return this.unavailable(); }
  async extractEntities(_input: MaskedInput): Promise<ExtractedEntities> { return this.unavailable(); }
  async generateProposal(_ctx: ProposalContext): Promise<unknown> { return this.unavailable(); }
  async answerQuestion(_ctx: AnswerContext): Promise<unknown> { return this.unavailable(); }
}
