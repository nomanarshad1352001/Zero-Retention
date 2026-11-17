# ClearBrief — Zero-Retention AI Situation Analysis (`app.YOURDOMAIN.com`)

A mobile-first, zero-retention Next.js App Router app that runs on a dedicated subdomain alongside an existing marketing site.

1. A user types a situation (1–4,000 characters).
2. `POST /api/analyze` attaches a server-only `MASTER_SYSTEM_PROMPT`, calls the Vercel AI SDK `generateObject` at temperature `0.3`, and post-validates the result.
3. The UI renders **5 accordions × 3 subsections** (15 sections).
4. If `uiFocus.shouldGoFullScreen` is true, the flagged subsection opens in a focus-trapped full-screen modal, then dismisses back to the accordion list.
5. Paid users get a stateless one-time Stripe Checkout, a short-lived in-memory JWT, the stronger `MODEL_PAID`, and **Save to My Phone Vault** (client-side AES-256-GCM export).

---

## Privacy invariants

- **No database, no accounts, no stored rows.** No user data or AI output is written to disk on the server.
- **No browser persistence.** No `localStorage`, `sessionStorage`, `IndexedDB`, cookies, Cache API, or service workers. All state lives in `src/lib/session-store.tsx` and dies on refresh/tab close.
- **No content logging.** `src/lib/http.ts#logRequest` emits only route/status/latency and an optional tier. Bodies, prompts, outputs, tokens, and session IDs are never logged.
- **No analytics/replay scripts.** CSP allows only `'self'` and Stripe hosts.
- **Provider ZDR:** enable Zero Data Retention in your OpenAI/Anthropic account before launch.

---

## Project structure

```text
src/
  app/
    layout.tsx                    # Root layout, in-memory SessionProvider, security headers
    page.tsx                      # Single-page entry -> AnalyzerApp
    privacy/page.tsx              # Static privacy disclosure
    success/page.tsx + SuccessClient.tsx  # Stripe return -> /api/verify -> RAM JWT -> replace("/")
    vault/page.tsx                # Offline vault/pass-file decryptor view
    api/analyze/route.ts          # POST /api/analyze (16 KB cap, JWT tier, AI SDK, 5x3 validation + 1 retry)
    api/checkout/route.ts         # POST /api/checkout (stateless Stripe Checkout Session)
    api/verify/route.ts           # POST /api/verify (paid + age check -> HS256 JWT, never a cookie)
    api/health/route.ts           # GET /api/health
  components/
    AnalyzerApp.tsx               # Single-page controller (input -> loading -> results)
    AppHeader.tsx, PrivacyBadge.tsx, SituationInput.tsx, LoadingState.tsx
    ResultsAccordions.tsx, FullScreenModal.tsx
    PassCard.tsx, VaultButton.tsx, VaultOpener.tsx
  lib/
    env.ts                        # Lazy, Zod-validated server env (server-only)
    schema.ts                     # Zod structured-output contract used by generateObject
    shape.ts                      # Zod-free 5x3 + uiFocus post-validator shared with browser
    llm.ts                        # Provider resolution, generateObject, one shape retry
    models.ts                     # Tier -> model id, silent downgrade
    prompt.ts                     # Server-only master prompt loader + <situation> delimiter guard
    jwt.ts                        # jose HS256 sign/verify, SHA-256 session hash
    payments.ts                   # Stripe session create/retrieve (or local mock)
    crypto-client.ts              # Browser Web Crypto PBKDF2 + AES-256-GCM vault
    api-client.ts                 # Fetch helpers (credentials: "omit", cache: "no-store")
    session-store.tsx             # React Context + useReducer: 100% of state in RAM
    http.ts                       # Byte-capped body reader, no-store responses, safe logger
    mock-analysis.ts              # Deterministic local/E2E analyzer
    cn.ts                         # Tiny clsx helper
docs/proposal-answers.md          # Answers to the client's screening questions
scripts/audit-storage.sh          # Greps for prohibited APIs / leaked secrets
tests/unit/                       # Vitest: shape, JWT, models, crypto, API routes, retry
tests/e2e/                        # Playwright mobile flows: free, urgent modal, paid+vault
next.config.ts                    # CSP, Referrer-Policy, Permissions-Policy, no-store headers
.env.example                      # Env template with a clearly labelled STUB prompt
```

---

## Local development

Requires Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
# generate JWT_SECRET: openssl rand -base64 48
npm run dev
```

| Variable | Required | Notes |
| --- | --- | --- |
| `LLM_PROVIDER` | Yes | `openai`, `anthropic`, or `mock` (local/CI only) |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | Conditional | Required for the chosen real provider |
| `MODEL_FREE` / `MODEL_PAID` | Yes | Model IDs per tier, e.g. `gpt-4o-mini` / `gpt-4.1` |
| `MASTER_SYSTEM_PROMPT` | Yes | **Replace the stub in `.env.example` before launch** |
| `PAYMENTS_MODE` | Yes | `stripe` or `mock` (local/CI only) |
| `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` | If `stripe` | One-time access-pass price |
| `STRIPE_WEBHOOK_SECRET` | No | Present for future webhook use; the stateless verify flow does not need it |
| `JWT_SECRET` | Yes | 32+ random bytes, base64 (`openssl rand -base64 48`) |
| `JWT_TTL_MINUTES` | Yes | Pass lifetime (default `120`) |
| `PASS_MAX_SESSION_AGE_MINUTES` | Yes | Max accepted Checkout session age (default `30`) |
| `NEXT_PUBLIC_APP_URL` | Yes | App origin, e.g. `https://app.yourdomain.com` |
| `NEXT_PUBLIC_MARKETING_URL` | No | Root marketing site URL |

`mock` modes let you exercise the whole UI, urgent modal, pass flow, and vault offline. They are **only** for local dev/CI/previews: `env.ts` warns in production, but you must ensure they are never set in Production or Preview.

E2E starts its own production build on `http://localhost:3100` (set `E2E_PORT` to change it) and refuses to reuse an already-running server, so a dev server for another project cannot be picked up by mistake. To point the suite at an already-deployed instance instead, set `E2E_BASE_URL`.

### Validate

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e          # after `npx playwright install chromium`; uses port 3100 by default
npm run audit:storage     # requires bash
# Prove no prompt/secret leakage into client bundles:
grep -rnE "STUB PROMPT|MASTER_SYSTEM_PROMPT|OPENAI_API_KEY|STRIPE_SECRET_KEY|JWT_SECRET" .next/static || echo "Clean"
```

---

## Stateless Stripe & known trade-off

No customer records, no database, no cookies. `POST /api/verify` confirms payment with Stripe and returns a signed HS256 JWT in the JSON body; only a SHA-256 hash of the Checkout session ID is embedded in the JWT.

Because redeemed session IDs are not stored, a caller holding a valid paid `session_id` can mint another token within `PASS_MAX_SESSION_AGE_MINUTES`. Mitigations: short verification window, short JWT TTL, immediate `session_id` URL scrubbing on `/success`, hashed `sid`, and Vercel Firewall rate limiting. This is an accepted trade-off of zero retention.

The pass lives only in this tab: refreshing ends it. An optional encrypted pass file can be exported/imported via `/vault` for users who want resilience without browser storage.

---

## Phone Vault format (`vault-YYYYMMDD-HHmm.vault.json`)

- KDF: PBKDF2-SHA256, 600,000 iterations, random 16-byte salt.
- Cipher: AES-256-GCM, random 12-byte IV (authenticated; wrong passcode fails cleanly).
- Plaintext: `{ version, createdAt, situation, result }`.
- File: `{ v, kdf, iter, salt, iv, ct }` (base64).
- Passcode inputs: min 8 chars, strength hint, non-recovery warning; state zeroed after use; object URL revoked immediately.

---

## Vercel Firewall (manual, no database)

Add per-IP rules in **Vercel → Project → Firewall → Configure Rules**:

1. `POST /api/analyze` — `15 requests / 10 minutes` per IP → 429.
2. `POST /api/verify` — `5 requests / 15 minutes` per IP → 429.
3. `POST /api/checkout` — `8 requests / 15 minutes` per IP → 429.

---

## Deployment & GoDaddy DNS handoff

```bash
vercel link
# Add every variable from .env.example to Production and Preview in
# Vercel → Project → Settings → Environment Variables
vercel --prod
```

Then, in GoDaddy → Domain Portfolio → `yourdomain.com` → DNS:

- **Type:** `CNAME`
- **Name / Host:** `app`
- **Value / Points to:** the exact target shown in Vercel → Project → Settings → Domains (commonly `cname.vercel-dns.com`)
- **TTL:** 600 seconds

Keep the root domain pointing at the existing marketing site; link its CTA to `https://app.yourdomain.com`. Vercel provisions SSL automatically.

### Go-live checklist

- [ ] Real `MASTER_SYSTEM_PROMPT` replaced in Production env vars.
- [ ] `LLM_PROVIDER` and `PAYMENTS_MODE` are **not** `mock` in Production/Preview.
- [ ] Fresh `JWT_SECRET`, real Stripe live key + Price ID.
- [ ] Organization-level Zero Data Retention enabled with the LLM provider.
- [ ] Vercel Firewall rules enabled on `/api/analyze`, `/api/verify`, `/api/checkout`.
- [ ] Full Stripe **test-mode** purchase verified on the live subdomain: `X-Tier: paid`, encrypted `.vault.json` export and re-open, DevTools → Application shows empty storage/cookies.
- [ ] One live purchase completed and refunded.
