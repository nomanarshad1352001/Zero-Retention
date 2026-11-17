import { SignJWT, jwtVerify, errors as joseErrors } from "jose";

/**
 * Stateless "access pass" tokens (HS256 via jose).
 * Pure functions that take the secret explicitly so they are unit-testable
 * without env. Route handlers pass `getEnv().JWT_SECRET`.
 */

export const PASS_ISSUER = "zero-retention-analyzer";
export const PASS_AUDIENCE = "analyze";

export interface PassClaims {
  tier: "paid";
  /** SHA-256 hash of the Stripe Checkout session id (never the raw id). */
  sid: string;
}

export interface VerifiedPass extends PassClaims {
  iat: number;
  exp: number;
}

function keyFromSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signPass(
  claims: PassClaims,
  opts: { secret: string; ttlMinutes: number; now?: Date },
): Promise<{ token: string; expiresAt: number }> {
  const now = opts.now ?? new Date();
  const iat = Math.floor(now.getTime() / 1000);
  const exp = iat + opts.ttlMinutes * 60;
  const token = await new SignJWT({ tier: claims.tier, sid: claims.sid })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(PASS_ISSUER)
    .setAudience(PASS_AUDIENCE)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(keyFromSecret(opts.secret));
  return { token, expiresAt: exp * 1000 };
}

export type VerifyResult =
  | { valid: true; claims: VerifiedPass }
  | { valid: false; reason: "missing" | "expired" | "invalid" };

/** Never throws. Any failure -> { valid:false } so callers can silently downgrade. */
export async function verifyPass(
  token: string | null | undefined,
  opts: { secret: string; now?: Date },
): Promise<VerifyResult> {
  if (!token) return { valid: false, reason: "missing" };
  try {
    const { payload } = await jwtVerify(token, keyFromSecret(opts.secret), {
      algorithms: ["HS256"],
      issuer: PASS_ISSUER,
      audience: PASS_AUDIENCE,
      currentDate: opts.now,
    });
    if (payload.tier !== "paid" || typeof payload.sid !== "string" || !payload.exp || !payload.iat) {
      return { valid: false, reason: "invalid" };
    }
    return { valid: true, claims: { tier: "paid", sid: payload.sid, iat: payload.iat, exp: payload.exp } };
  } catch (err) {
    if (err instanceof joseErrors.JWTExpired) return { valid: false, reason: "expired" };
    return { valid: false, reason: "invalid" };
  }
}

/** Extract a bearer token from an Authorization header value. */
export function bearerFromHeader(header: string | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? m[1] : null;
}

/** SHA-256 hex digest (Web Crypto; works in Node 20+ and browsers). */
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
