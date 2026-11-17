/** Shared helpers for API route handlers (no logging of bodies, ever). */

export const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
};

export function json(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...NO_STORE_HEADERS, ...init.headers },
  });
}

export function errorJson(status: number, message: string, headers?: Record<string, string>): Response {
  return json({ error: message }, { status, headers });
}

/** Read a request body with a hard byte cap (defends against oversize payloads). */
export async function readBodyLimited(req: Request, maxBytes: number): Promise<{ ok: true; text: string } | { ok: false }> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return { ok: false };
  const reader = req.body?.getReader();
  if (!reader) return { ok: true, text: "" };
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return { ok: false };
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(merged) };
}

/** Minimal structured log: status + latency only. Never bodies, prompts, tokens. */
export function logRequest(route: string, status: number, startedAt: number, extra?: Record<string, string | number>) {
  const ms = Date.now() - startedAt;
  console.info(JSON.stringify({ route, status, ms, ...extra }));
}
