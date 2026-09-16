import { MockAIProvider } from "./mock/mock-ai-provider";
import { OpenAIProvider } from "./openai/openai-provider";
import type { AIProvider } from "./provider";

const globalForAi = globalThis as unknown as { __urizunAi?: AIProvider };

/** Factory. Selected via URIZUN_AI_PROVIDER (mock | openai). A local LLM provider would be added here. */
export function getAIProvider(): AIProvider {
  if (globalForAi.__urizunAi) return globalForAi.__urizunAi;
  const kind = process.env.URIZUN_AI_PROVIDER ?? "mock";
  const provider: AIProvider = kind === "openai" ? new OpenAIProvider() : new MockAIProvider();
  globalForAi.__urizunAi = provider;
  return provider;
}

export function getMockAIProvider(): MockAIProvider | null {
  const p = getAIProvider();
  return p instanceof MockAIProvider ? p : null;
}

export type { AIProvider, MaskedInput, IntentResult, ExtractedEntities, ProposalContext, AnswerContext } from "./provider";
