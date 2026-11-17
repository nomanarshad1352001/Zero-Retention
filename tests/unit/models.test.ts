import { describe, expect, it } from "vitest";
import { resolveModelId, tierFromVerification } from "@/lib/models";

const cfg = { free: "gpt-4o-mini", paid: "gpt-4.1" };

describe("tier resolver", () => {
  it("maps free -> MODEL_FREE and paid -> MODEL_PAID", () => {
    expect(resolveModelId("free", cfg)).toBe("gpt-4o-mini");
    expect(resolveModelId("paid", cfg)).toBe("gpt-4.1");
  });
  it("downgrades silently when verification fails", () => {
    expect(tierFromVerification(false)).toBe("free");
    expect(tierFromVerification(true)).toBe("paid");
  });
});
