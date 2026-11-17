import { z } from "zod";
import { getEnv } from "@/lib/env";
import { retrieveSession } from "@/lib/payments";
import { sha256Hex, signPass } from "@/lib/jwt";
import { errorJson, json, logRequest, readBodyLimited } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({ sessionId: z.string().min(8).max(200) });

/**
 * POST /api/verify
 * Body: { sessionId }. Confirms the Checkout session is paid and recent, then
 * mints a short-lived HS256 pass JWT. Returns { token, expiresAt }. NEVER sets a cookie.
 *
 * KNOWN STATELESS LIMITATION: because we keep no database, a paid session id can
 * be re-submitted within PASS_MAX_SESSION_AGE_MINUTES to mint another token.
 * Mitigations: short age window, short JWT TTL (JWT_TTL_MINUTES), the session id
 * is stripped from the URL/history immediately on the client, and Vercel WAF
 * rate limiting on this route (see README). Accepted trade-off for zero retention.
 */
export async function POST(req: Request): Promise<Response> {
  const startedAt = Date.now();
  const route = "/api/verify";

  let env;
  try {
    env = getEnv();
  } catch {
    logRequest(route, 500, startedAt);
    return errorJson(500, "Server is not configured.");
  }

  const body = await readBodyLimited(req, 4 * 1024);
  if (!body.ok) {
    logRequest(route, 413, startedAt);
    return errorJson(413, "Request too large.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.text);
  } catch {
    logRequest(route, 400, startedAt);
    return errorJson(400, "Invalid request.");
  }
  const input = RequestSchema.safeParse(parsed);
  if (!input.success) {
    logRequest(route, 400, startedAt);
    return errorJson(400, "Invalid request.");
  }

  const session = await retrieveSession(input.data.sessionId);
  if (!session || !session.paid) {
    logRequest(route, 402, startedAt);
    return errorJson(402, "Payment not confirmed.");
  }

  const ageMinutes = (Date.now() / 1000 - session.createdAtSeconds) / 60;
  if (ageMinutes < -5 || ageMinutes > env.PASS_MAX_SESSION_AGE_MINUTES) {
    logRequest(route, 410, startedAt);
    return errorJson(410, "This checkout link has expired.");
  }

  const sid = await sha256Hex(session.id);
  const { token, expiresAt } = await signPass({ tier: "paid", sid }, { secret: env.JWT_SECRET, ttlMinutes: env.JWT_TTL_MINUTES });

  logRequest(route, 200, startedAt);
  return json({ token, expiresAt });
}
