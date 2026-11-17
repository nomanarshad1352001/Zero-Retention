import Link from "next/link";

export const metadata = { title: "Privacy — Clarity" };

const provider = process.env.LLM_PROVIDER === "anthropic" ? "Anthropic" : process.env.LLM_PROVIDER === "mock" ? "no external provider (mock mode)" : "OpenAI";

export default function PrivacyPage() {
  return (
    <article className="card space-y-6 p-5 sm:p-8">
      <header>
        <h1 className="text-2xl font-semibold text-fg">What we store (nothing) and what we don&rsquo;t</h1>
        <p className="mt-2 text-fg-muted">Plain-language, exhaustive, and true for every page on this app.</p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-fg">Stored by this app</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-fg-muted">
          <li>
            <strong className="text-fg">Nothing.</strong> There is no database and there are no user accounts.
          </li>
          <li>Your text, the analysis, and any pass token exist only in this tab&rsquo;s memory. Refreshing or closing the tab erases them.</li>
          <li>No cookies, no localStorage, no sessionStorage, no IndexedDB, no cache of API responses, no service worker.</li>
          <li>No analytics, session replay, or third-party scripts other than Stripe&rsquo;s hosted checkout (on Stripe&rsquo;s own domain).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-fg">What leaves your device</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-fg-muted">
          <li>
            <strong className="text-fg">Your situation text</strong> is sent to our server and forwarded to the AI provider ({provider}) under their API terms, so the model can produce the analysis. We recommend — and configure — the provider account&rsquo;s zero-data-retention option where available. We do not log the text or the result; our server logs contain only status codes and timing.
          </li>
          <li>
            <strong className="text-fg">Payments</strong> are handled entirely by Stripe Checkout. We never see card details, and we do not collect your name or email. When you return from Stripe, we check once that the payment succeeded and hand your browser a short-lived pass token. That token is never written to a cookie or storage.
          </li>
          <li>
            <strong className="text-fg">Vault files</strong> are encrypted in your browser with a passcode only you know (PBKDF2-SHA-256 → AES-256-GCM) and downloaded directly to your device. They never touch our servers.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-fg">Things to know</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-fg-muted">
          <li>Because nothing is stored, we cannot recover an analysis, a pass, or a vault passcode.</li>
          <li>Our hosting provider keeps standard infrastructure logs (IP address, timestamps, status codes) for security and abuse prevention; these never include what you typed.</li>
          <li>The analysis is informational and not professional advice.</li>
        </ul>
      </section>

      <Link href="/" className="btn btn-secondary">
        Back to the app
      </Link>
    </article>
  );
}
