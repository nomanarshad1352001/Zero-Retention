import { NO_STORE_HEADERS } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Liveness probe. Intentionally touches no database — this app stores nothing. */
export async function GET() {
  return Response.json({ ok: true, storage: "none" }, { headers: NO_STORE_HEADERS });
}
