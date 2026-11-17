"use client";

import { useId } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

export const MAX_CHARS = 4000;

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  error?: string | null;
}

export function SituationInput({ value, onChange, onSubmit, disabled, error }: Props) {
  const id = useId();
  const count = value.length;
  const over = count > MAX_CHARS;
  const canSubmit = value.trim().length > 0 && !over && !disabled;

  return (
    <form
      className="card p-4 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
    >
      <label htmlFor={id} className="block text-lg font-semibold text-fg">
        What&rsquo;s going on?
      </label>
      <p className="mt-1 text-sm text-fg-muted">
        Describe the situation in your own words. The more context, the better the analysis.
      </p>
      <textarea
        id={id}
        name="situation"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) onSubmit();
        }}
        disabled={disabled}
        rows={8}
        maxLength={MAX_CHARS + 200}
        autoComplete="off"
        autoCorrect="on"
        spellCheck
        data-testid="situation-input"
        aria-describedby={`${id}-count ${error ? `${id}-error` : ""}`}
        aria-invalid={over || !!error}
        placeholder="e.g. My landlord says I have 3 days to move out, I have a lease until June, and I don't know what to do first…"
        className={cn(
          "mt-4 w-full resize-y rounded-xl border bg-surface p-4 text-base leading-relaxed text-fg placeholder:text-fg-subtle",
          "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1",
          over ? "border-danger" : "border-border",
        )}
      />
      <div className="mt-2 flex items-center justify-between text-sm">
        <span id={`${id}-count`} className={cn(over ? "text-danger" : "text-fg-subtle")} aria-live="polite">
          {count.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </span>
        <span className="hidden text-fg-subtle sm:inline">⌘/Ctrl + Enter to analyze</span>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-3 rounded-xl border border-warn-border bg-warn-bg px-3 py-2 text-sm text-warn-fg">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary mt-4 w-full text-base" disabled={!canSubmit} data-testid="analyze-button">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
        Analyze
      </button>
    </form>
  );
}
