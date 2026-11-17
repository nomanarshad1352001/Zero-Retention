import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("ai", () => ({ generateObject: vi.fn() }));

describe("runAnalysis", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.LLM_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "unit-test-key";
  });

  it("retries exactly once when the provider returns the wrong 5x3 shape", async () => {
    const { generateObject } = await import("ai");
    const { buildMockAnalysis } = await import("@/lib/mock-analysis");
    const valid = buildMockAnalysis("A calm situation", "free");
    const invalid = structuredClone(valid);
    invalid.accordions.pop();

    vi.mocked(generateObject)
      .mockResolvedValueOnce({ object: invalid } as never)
      .mockResolvedValueOnce({ object: valid } as never);

    const { runAnalysis } = await import("@/lib/llm");
    const result = await runAnalysis("A calm situation", "gpt-4o-mini", "free");

    expect(generateObject).toHaveBeenCalledTimes(2);
    expect(result.accordions).toHaveLength(5);
  });

  it("propagates upstream errors without retrying", async () => {
    const { generateObject } = await import("ai");
    vi.mocked(generateObject).mockRejectedValueOnce(new Error("provider down"));

    const { runAnalysis } = await import("@/lib/llm");
    await expect(runAnalysis("A calm situation", "gpt-4o-mini", "free")).rejects.toThrow("provider down");
    expect(generateObject).toHaveBeenCalledTimes(1);
  });
});
