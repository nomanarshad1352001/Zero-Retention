import "server-only";
import Stripe from "stripe";
import { getEnv } from "@/lib/env";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const env = getEnv();
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured");
  if (!stripeClient) stripeClient = new Stripe(env.STRIPE_SECRET_KEY, { typescript: true });
  return stripeClient;
}

/** Mock session ids look like `mock_cs_<unix-seconds>_<random>`; only honoured when PAYMENTS_MODE=mock. */
export const MOCK_SESSION_PREFIX = "mock_cs_";

export function createMockSessionId(now = Date.now()): string {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return `${MOCK_SESSION_PREFIX}${Math.floor(now / 1000)}_${rand}`;
}

export interface SessionSummary {
  id: string;
  paid: boolean;
  createdAtSeconds: number;
}

/** Normalised view of a Checkout session, from Stripe or from the mock. */
export async function retrieveSession(sessionId: string): Promise<SessionSummary | null> {
  const env = getEnv();
  if (env.PAYMENTS_MODE === "mock") {
    const m = new RegExp(`^${MOCK_SESSION_PREFIX}(\\d{9,11})_[a-f0-9]{16}$`).exec(sessionId);
    if (!m) return null;
    return { id: sessionId, paid: true, createdAtSeconds: Number(m[1]) };
  }
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return null;
  try {
    const s = await getStripe().checkout.sessions.retrieve(sessionId);
    return { id: s.id, paid: s.payment_status === "paid", createdAtSeconds: s.created };
  } catch {
    return null;
  }
}
