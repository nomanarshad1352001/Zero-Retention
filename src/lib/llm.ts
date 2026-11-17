import "server-only";
import { generateObject, type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { getEnv } from "@/lib/env";
import { AnalysisSchema, validateAnalysisShape, type Analysis } from "@/lib/schema";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompt";
import { buildMockAnalysis } from "@/lib/mock-analysis";
import type { Tier } from "@/lib/models";

function resolveLanguageModel(modelId: string): LanguageModel {
  const env = getEnv();
  if (env.LLM_PROVIDER === "anthropic") {
    return createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })(modelId);
  }
  return createOpenAI({ apiKey: env.OPENAI_API_KEY })(modelId);
}

export class AnalysisShapeError extends Error {
  constructor(public readonly issues: string[]) {
    super("analysis shape invalid");
  }
}

/**
 * Calls the LLM once and post-validates. Throws AnalysisShapeError on shape
 * failure so the caller can retry exactly once.
 */
async function callOnce(situation: string, modelId: string, tier: Tier, signal?: AbortSignal): Promise<Analysis> {
  const env = getEnv();
  if (env.LLM_PROVIDER === "mock") {
    await new Promise((r) => setTimeout(r, 900)); // simulate latency for the loading state
    return buildMockAnalysis(situation, tier);
  }

  const { object } = await generateObject({
    model: resolveLanguageModel(modelId),
    schema: AnalysisSchema,
    schemaName: "Analysis",
    schemaDescription: "Structured 5x3 analysis with optional UI focus.",
    system: buildSystemPrompt(),
    prompt: buildUserPrompt(situation),
    temperature: 0.3,
    maxRetries: 1,
    abortSignal: signal,
  });

  const shape = validateAnalysisShape(object);
  if (!shape.ok) throw new AnalysisShapeError(shape.errors);
  return shape.value;
}

export async function runAnalysis(situation: string, modelId: string, tier: Tier, signal?: AbortSignal): Promise<Analysis> {
  try {
    return await callOnce(situation, modelId, tier, signal);
  } catch (err) {
    if (err instanceof AnalysisShapeError) {
      // One retry on shape failure; a second failure surfaces as 502 upstream.
      return await callOnce(situation, modelId, tier, signal);
    }
    throw err;
  }
}
