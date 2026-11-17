import { describe, expect, it } from "vitest";
import { bearerFromHeader, sha256Hex, signPass, verifyPass } from "@/lib/jwt";

const secret = "0123456789abcdef0123456789abcdef0123456789abcdef";

describe("pass JWT", () => {
  it("signs and verifies", async () => {
    const sid = await sha256Hex("cs_test_123");
    const { token, expiresAt } = await signPass({ tier: "paid", sid }, { secret, ttlMinutes: 10 });
    expect(expiresAt).toBeGreaterThan(Date.now());
    const v = await verifyPass(token, { secret });
    expect(v.valid).toBe(true);
    if (v.valid) {
      expect(v.claims.tier).toBe("paid");
      expect(v.claims.sid).toBe(sid);
      expect(v.claims.sid).not.toContain("cs_test");
    }
  });

  it("rejects expired tokens", async () => {
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const { token } = await signPass({ tier: "paid", sid: "x" }, { secret, ttlMinutes: 5, now: past });
    const v = await verifyPass(token, { secret });
    expect(v.valid).toBe(false);
    if (!v.valid) expect(v.reason).toBe("expired");
  });

  it("rejects wrong secret, tampering, and missing", async () => {
    const { token } = await signPass({ tier: "paid", sid: "x" }, { secret, ttlMinutes: 5 });
    expect((await verifyPass(token, { secret: secret + "nope" })).valid).toBe(false);
    expect((await verifyPass(token.slice(0, -3) + "abc", { secret })).valid).toBe(false);
    expect((await verifyPass(null, { secret })).valid).toBe(false);
    expect((await verifyPass("not.a.jwt", { secret })).valid).toBe(false);
  });

  it("parses bearer headers", () => {
    expect(bearerFromHeader("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(bearerFromHeader("bearer x")).toBe("x");
    expect(bearerFromHeader("Basic x")).toBeNull();
    expect(bearerFromHeader(null)).toBeNull();
  });
});
