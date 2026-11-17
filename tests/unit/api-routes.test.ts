import { describe, expect, it } from "vitest";
import { POST as analyze } from "@/app/api/analyze/route";
import { POST as checkout } from "@/app/api/checkout/route";
import { POST as verify } from "@/app/api/verify/route";
import { sha256Hex, signPass, verifyPass } from "@/lib/jwt";
import { createMockSessionId } from "@/lib/payments";
import type { Analysis } from "@/lib/shape";

const secret = process.env.JWT_SECRET!;

function analyzeRequest(situation: string, token?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers,
    body: JSON.stringify({ situation }),
  });
}

function verifyRequest(sessionId: string): Request {
  return new Request("http://localhost/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
}

describe("POST /api/analyze", () => {
  it("returns a validated 5x3 analysis on the free tier", async () => {
    const res = await analyze(analyzeRequest("My landlord gave me a 24 hour notice."));
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Tier")).toBe("free");
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    const body = (await res.json()) as { tier: string; result: Analysis };
    expect(body.tier).toBe("free");
    expect(body.result.accordions).toHaveLength(5);
    body.result.accordions.forEach((a) => expect(a.subsections).toHaveLength(3));
  });

  it("uses the paid tier for a valid pass and downgrades silently for an invalid one", async () => {
    const { token } = await signPass(
      { tier: "paid", sid: await sha256Hex("cs_test_abc") },
      { secret, ttlMinutes: 10 },
    );
    const paid = await analyze(analyzeRequest("A time sensitive situation.", token));
    expect(paid.status).toBe(200);
    expect(paid.headers.get("X-Tier")).toBe("paid");

    const free = await analyze(analyzeRequest("A time sensitive situation.", "not.a.jwt"));
    expect(free.status).toBe(200);
    expect(free.headers.get("X-Tier")).toBe("free");
  });

  it("rejects an empty situation", async () => {
    const res = await analyze(analyzeRequest("   "));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/checkout + /api/verify", () => {
  it("creates a stateless checkout handoff and verifies it into a RAM-only JWT", async () => {
    const checkoutRes = await checkout();
    expect(checkoutRes.status).toBe(200);
    const { url } = (await checkoutRes.json()) as { url: string };
    expect(url).toContain("/success?session_id=mock_cs_");

    const sessionId = new URL(url, "http://localhost").searchParams.get("session_id")!;
    const verifyRes = await verify(verifyRequest(sessionId));
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.headers.get("Set-Cookie")).toBeNull();
    const { token, expiresAt } = (await verifyRes.json()) as { token: string; expiresAt: number };
    expect(expiresAt).toBeGreaterThan(Date.now());
    expect((await verifyPass(token, { secret })).valid).toBe(true);
  });

  it("rejects unknown and expired checkout sessions", async () => {
    expect((await verify(verifyRequest("not-a-session"))).status).toBe(402);
    const old = createMockSessionId(Date.now() - 120 * 60 * 1000);
    expect((await verify(verifyRequest(old))).status).toBe(410);
  });
});
