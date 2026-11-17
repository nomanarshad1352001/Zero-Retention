import "server-only";
import { z } from "zod";

/**
 * Server-only environment validation.
 * Evaluated lazily on first access (so `next build` does not need secrets),
 * then cached. Throws a clear, aggregated error if required values are missing.
 */
const EnvSchema = z
  .object({
    LLM_PROVIDER: z.enum(["openai", "anthropic", "mock"]).default("openai"),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    MODEL_FREE: z.string().min(1).default("gpt-4o-mini"),
    MODEL_PAID: z.string().min(1).default("gpt-4.1"),
    MASTER_SYSTEM_PROMPT: z.string().min(20, "MASTER_SYSTEM_PROMPT must be set (min 20 chars)"),

    PAYMENTS_MODE: z.enum(["stripe", "mock"]).default("stripe"),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_PRICE_ID: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),

    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters (use `openssl rand -base64 48`)"),
    JWT_TTL_MINUTES: z.coerce.number().int().positive().default(120),
    PASS_MAX_SESSION_AGE_MINUTES: z.coerce.number().int().positive().default(30),

    NEXT_PUBLIC_APP_URL: z.string().url(),
    NEXT_PUBLIC_MARKETING_URL: z.string().url().optional(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  })
  .superRefine((v, ctx) => {
    if (v.LLM_PROVIDER === "openai" && !v.OPENAI_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["OPENAI_API_KEY"], message: "Required when LLM_PROVIDER=openai" });
    }
    if (v.LLM_PROVIDER === "anthropic" && !v.ANTHROPIC_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["ANTHROPIC_API_KEY"], message: "Required when LLM_PROVIDER=anthropic" });
    }
    if (v.PAYMENTS_MODE === "stripe") {
      if (!v.STRIPE_SECRET_KEY) ctx.addIssue({ code: "custom", path: ["STRIPE_SECRET_KEY"], message: "Required when PAYMENTS_MODE=stripe" });
      if (!v.STRIPE_PRICE_ID) ctx.addIssue({ code: "custom", path: ["STRIPE_PRICE_ID"], message: "Required when PAYMENTS_MODE=stripe" });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`);
    // Only variable NAMES are logged — never values.
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  cached = parsed.data;
  if (cached.NODE_ENV === "production" && (cached.LLM_PROVIDER === "mock" || cached.PAYMENTS_MODE === "mock")) {
    // Mock modes exist for local dev / CI / sandbox previews only. Warn loudly (no values logged).
    console.warn("[env] WARNING: running in production with LLM_PROVIDER/PAYMENTS_MODE=mock. Configure real providers before launch.");
  }
  return cached;
}
