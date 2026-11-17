import { getEnv } from "@/lib/env";
import { createMockSessionId, getStripe } from "@/lib/payments";
import { errorJson, json, logRequest } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/checkout
 * Creates a hosted Stripe Checkout Session (mode: payment, one access pass).
 * We collect and store nothing of our own. Returns { url } for a client redirect.
 */
export async function POST(): Promise<Response> {
  const startedAt = Date.now();
  const route = "/api/checkout";

  let env;
  try {
    env = getEnv();
  } catch {
    logRequest(route, 500, startedAt);
    return errorJson(500, "Server is not configured.");
  }

  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  if (env.PAYMENTS_MODE === "mock") {
    // Local/dev only: skip Stripe and bounce straight to /success with a mock session id.
    // Relative URL so the mock flow works on any local/preview host.
    const url = `/success?session_id=${encodeURIComponent(createMockSessionId())}&mock=1`;
    logRequest(route, 200, startedAt, { mode: "mock" });
    return json({ url });
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/`,
      // No customer, no metadata, no email prefill: Stripe handles receipts under its own terms.
      allow_promotion_codes: false,
    });
    if (!session.url) throw new Error("no url");
    logRequest(route, 200, startedAt, { mode: "stripe" });
    return json({ url: session.url });
  } catch {
    logRequest(route, 502, startedAt, { mode: "stripe" });
    return errorJson(502, "Checkout is temporarily unavailable.");
  }
}
