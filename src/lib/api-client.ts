"use client";

import type { Analysis } from "@/lib/shape";
import { validateAnalysisShape } from "@/lib/shape";
import type { Tier } from "@/lib/models";

/** Client-side fetchers. Responses are returned to React state only — never cached or stored. */

export async function analyze(
  situation: string,
  token: string | null,
  signal: AbortSignal,
): Promise<{ tier: Tier; result: Analysis }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers,
    body: JSON.stringify({ situation }),
    signal,
    cache: "no-store",
    credentials: "omit",
  });
  const data = (await res.json().catch(() => null)) as { tier?: Tier; result?: unknown; error?: string } | null;
  if (!res.ok || !data) throw new Error(data?.error ?? "Something went wrong. Please try again.");
  const shape = validateAnalysisShape(data.result);
  if (!shape.ok) throw new Error("The analysis came back malformed. Please try again.");
  return { tier: data.tier === "paid" ? "paid" : "free", result: shape.value };
}

export async function startCheckout(): Promise<string> {
  const res = await fetch("/api/checkout", { method: "POST", cache: "no-store", credentials: "omit" });
  const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !data?.url) throw new Error(data?.error ?? "Checkout is unavailable right now.");
  return data.url;
}

export async function verifySession(sessionId: string): Promise<{ token: string; expiresAt: number }> {
  const res = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
    cache: "no-store",
    credentials: "omit",
  });
  const data = (await res.json().catch(() => null)) as { token?: string; expiresAt?: number; error?: string } | null;
  if (!res.ok || !data?.token || !data.expiresAt) throw new Error(data?.error ?? "We could not confirm your pass.");
  return { token: data.token, expiresAt: data.expiresAt };
}
