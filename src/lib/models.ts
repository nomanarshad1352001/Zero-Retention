export type Tier = "free" | "paid";

export interface ModelConfig {
  free: string;
  paid: string;
}

/** Pure tier -> model-id resolver (unit-tested; no env access here). */
export function resolveModelId(tier: Tier, config: ModelConfig): string {
  return tier === "paid" ? config.paid : config.free;
}

/** Decide tier from a JWT verification outcome. Never throws. */
export function tierFromVerification(valid: boolean): Tier {
  return valid ? "paid" : "free";
}
