"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/session-store";
import { verifySession } from "@/lib/api-client";

/**
 * Stripe returns here with ?session_id=... We exchange it for a pass JWT,
 * keep the token ONLY in React memory, then router.replace("/") so the
 * session id is stripped from the URL and history.
 */
export function SuccessClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { dispatch } = useSession();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const sessionId = params.get("session_id");
    if (!sessionId) {
      router.replace("/");
      return;
    }
    (async () => {
      try {
        const { token, expiresAt } = await verifySession(sessionId);
        dispatch({ type: "setToken", token, expiresAt });
        dispatch({ type: "setPassNotice", message: "Pass activated. It lives in this tab only — refreshing will end it." });
        router.replace("/");
      } catch (e) {
        setError(e instanceof Error ? e.message : "We could not confirm your pass.");
      }
    })();
  }, [params, router, dispatch]);

  return (
    <section className="card p-6 text-center" aria-live="polite">
      {error ? (
        <>
          <h1 className="text-xl font-semibold text-fg">We couldn&rsquo;t confirm your pass</h1>
          <p className="mt-2 text-sm text-fg-muted">{error}</p>
          <p className="mt-2 text-sm text-fg-muted">
            If you were charged, Stripe has emailed you a receipt; reply to it for help.
          </p>
          <button type="button" className="btn btn-primary mt-5" onClick={() => router.replace("/")}>
            Back to the app
          </button>
        </>
      ) : (
        <>
          <h1 className="text-xl font-semibold text-fg">Confirming your pass…</h1>
          <p className="mt-2 text-sm text-fg-muted">Your pass lives in this tab. Refreshing will end it.</p>
        </>
      )}
    </section>
  );
}
