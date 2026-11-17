import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

export function PrivacyBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-fg-muted",
        className,
      )}
      data-testid="privacy-badge"
    >
      <ShieldCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <span>{compact ? "Nothing is stored." : "Nothing is stored. Closing this tab erases everything."}</span>
    </p>
  );
}
