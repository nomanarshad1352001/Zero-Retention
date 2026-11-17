import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SessionProvider } from "@/lib/session-store";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Clarity — private situation analysis",
  description: "A zero-retention AI analysis tool. Nothing is stored; closing the tab erases everything.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f7f9",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <SessionProvider>
          <AppHeader />
          <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">{children}</main>
          <footer className="mx-auto max-w-2xl px-4 pb-8 pt-4 text-center text-xs text-fg-subtle">
            Informational only — not professional advice. No accounts, no database, no tracking.
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
