"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Lock, Sparkles } from "lucide-react";
import { startCheckout } from "@/lib/api-client";
import { cn } from "@/lib/cn";

interface Props {
  hasPass: boolean;
  expiresAt: number | null;
  compact?: boolean;
  className?: string;
}

export function PassCard({ hasPass, expiresAt, compact = false, className }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Clock tick (updates once a minute) so "minutes remaining" is derived, not computed in render.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!hasPass || !expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    const first = setTimeout(() => setNow(Date.now()), 0);
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, [hasPass, expiresAt]);
  const mins = hasPass && expiresAt && now ? Math.max(0, Math.round((expiresAt - now) / 60000)) : null;

  async function buy() {
    setBusy(true);
    setError(null);
    try {
      const url = await startCheckout();
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout is unavailable right now.");
      setBusy(false);
    }
  }

  if (hasPass) {
    return (
      <section className={cn("card border-accent/40 bg-accent-soft/40 p-4", className)} data-testid="pass-active" aria-label="Pass active">
        <div className="flex items-start gap-3">
          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold text-fg">Pass active — stronger model &amp; Vault unlocked</p>
            <p className="mt-1 text-fg-muted">
              Your pass lives in this tab{mins !== null ? ` for about ${mins} min` : ""}. <strong>Refreshing will end it.</strong>
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("card p-4 sm:p-5", className)} data-testid="pass-card" aria-labelledby="pass-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong" aria-hidden="true">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h2 id="pass-title" className="text-base font-semibold text-fg">
            {compact ? "Unlock the Pass" : "Free vs. Pass"}
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm text-fg-muted">
            <li>
              <strong className="text-fg">Free:</strong> fast model, full 5-section analysis, nothing stored.
            </li>
            <li>
              <strong className="text-fg">Pass:</strong> stronger reasoning model + encrypted{" "}
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Save to My Phone Vault
              </span>{" "}
              export.
            </li>
            <li>No account. One-time payment via Stripe. The pass lives only in this tab.</li>
          </ul>
          {error ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <button type="button" onClick={buy} disabled={busy} className="btn btn-primary mt-4 w-full sm:w-auto" data-testid="buy-pass">
            {busy ? "Opening checkout…" : "Get a Pass"}
          </button>
        </div>
      </div>
    </section>
  );
}
