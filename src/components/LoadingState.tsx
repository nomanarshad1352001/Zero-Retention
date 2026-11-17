"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Reading your situation carefully…",
  "Nothing you typed is being stored.",
  "Mapping the key factors and people involved…",
  "Weighing options and trade-offs…",
  "Drafting clear next steps…",
  "Almost there — structuring the result.",
];

export function LoadingState({ onCancel }: { onCancel: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="card p-4 sm:p-6" aria-busy="true" aria-live="polite" data-testid="loading-state">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
        </span>
        <p className="text-base font-medium text-fg">{MESSAGES[i]}</p>
      </div>
      <div className="mt-6 space-y-3" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, k) => (
          <div key={k} className="rounded-xl border border-border p-4">
            <div className="skeleton h-5 w-2/3" />
            <div className="skeleton mt-3 h-3 w-full" />
            <div className="skeleton mt-2 h-3 w-5/6" />
          </div>
        ))}
      </div>
      <button type="button" onClick={onCancel} className="btn btn-secondary mt-6 w-full" data-testid="cancel-button">
        Cancel
      </button>
    </section>
  );
}
