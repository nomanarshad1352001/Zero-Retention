import Link from "next/link";
import { PrivacyBadge } from "@/components/PrivacyBadge";

export function AppHeader() {
  const marketing = process.env.NEXT_PUBLIC_MARKETING_URL;
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 tap" aria-label="Home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7l7-4z" />
              <path d="M9.5 12l1.8 1.8L15 10" />
            </svg>
          </span>
          <span className="text-base font-semibold tracking-tight text-fg">Clarity</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm" aria-label="Secondary">
          <Link href="/vault" className="btn btn-ghost px-3 text-sm">
            Open a vault
          </Link>
          <Link href="/privacy" className="btn btn-ghost px-3 text-sm">
            Privacy
          </Link>
          {marketing ? (
            <a href={marketing} className="btn btn-ghost hidden px-3 text-sm sm:inline-flex" rel="noreferrer">
              Main site
            </a>
          ) : null}
        </nav>
      </div>
      <div className="mx-auto max-w-2xl px-4 pb-3 sm:hidden">
        <PrivacyBadge compact className="w-full justify-center" />
      </div>
    </header>
  );
}
