import { z } from "zod";
import { getEnv } from "@/lib/env";
import { bearerFromHeader, verifyPass } from "@/lib/jwt";
import { resolveModelId, tierFromVerification } from "@/lib/models";
import { runAnalysis, AnalysisShapeError } from "@/lib/llm";
import { errorJson, json, logRequest, readBodyLimited } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

const RequestSchema = z.object({
  situation: z.string().trim().min(1).max(4000),
});

/**
 * POST /api/analyze
 * - Body: { situation: string (1..4000) }
 * - Optional: Authorization: Bearer <pass-jwt>  (invalid/expired => silently "free")
 * - Returns: { tier, result }  + header X-Tier
 * - Logs: route, status, latency, tier. NEVER the body, prompt, or output.
 */
export async function POST(req: Request): Promise<Response> {
  const startedAt = Date.now();
  const route = "/api/analyze";

  let env;
  try {
    env = getEnv();
  } catch {
    logRequest(route, 500, startedAt);
    return errorJson(500, "Server is not configured.");
  }

  const body = await readBodyLimited(req, MAX_BODY_BYTES);
  if (!body.ok) {
    logRequest(route, 413, startedAt);
    return errorJson(413, "Request too large.");
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(body.text);
  } catch {
    logRequest(route, 400, startedAt);
    return errorJson(400, "Invalid request.");
  }
  const input = RequestSchema.safeParse(parsedBody);
  if (!input.success) {
    logRequest(route, 400, startedAt);
    return errorJson(400, "Please enter between 1 and 4000 characters.");
  }

  // Tier: valid pass => paid; anything else => free (never an error).
  const verification = await verifyPass(bearerFromHeader(req.headers.get("authorization")), { secret: env.JWT_SECRET });
  const tier = tierFromVerification(verification.valid);
  const modelId = resolveModelId(tier, { free: env.MODEL_FREE, paid: env.MODEL_PAID });

  try {
    const result = await runAnalysis(input.data.situation, modelId, tier, req.signal);
    logRequest(route, 200, startedAt, { tier });
    return json({ tier, result }, { headers: { "X-Tier": tier } });
  } catch (err) {
    if (err instanceof AnalysisShapeError) {
      logRequest(route, 502, startedAt, { tier, reason: "shape" });
      return errorJson(502, "The analysis could not be structured. Please try again.", { "X-Tier": tier });
    }
    if (err instanceof Error && err.name === "AbortError") {
      logRequest(route, 499, startedAt, { tier, reason: "aborted" });
      return errorJson(499, "Cancelled.");
    }
    logRequest(route, 502, startedAt, { tier, reason: "upstream" });
    return errorJson(502, "The analysis service is temporarily unavailable.", { "X-Tier": tier });
  }
}
