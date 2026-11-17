# project.md — Clarity (zero-retention AI analysis)

Living design document. Read this before touching anything that handles user content.

## 1. Product in one paragraph
A single-page, mobile-first tool at `app.YOURDOMAIN.com`. The user types a situation (≤ 4000 chars). The server adds a hidden master system prompt, calls an LLM with structured output, and returns exactly **5 accordions × 3 subsections** plus a `uiFocus` hint. If `uiFocus.shouldGoFullScreen` is true, the targeted subsection opens in a full-screen, focus-trapped modal first. A one-time Stripe payment (no accounts) upgrades the tab to a stronger model and unlocks an encrypted offline export ("Save to My Phone Vault").

## 2. Invariants (do not break)
1. **No persistence.** No DB, accounts, cookies, `localStorage`, `sessionStorage`, IndexedDB, Cache API, service workers, or server-side storage of content. State lives in `src/lib/session-store.tsx` only.
2. **The master prompt never leaves the server.** Only `src/lib/prompt.ts` (server-only) reads it.
3. **Logs contain no content.** Only `route`, `status`, `ms`, `tier`, and short reason codes.
4. **Bad tokens never error.** `/api/analyze` silently downgrades to `free`.
5. **Shape is enforced in code**, not trusted from the provider: `validateAnalysisShape` runs server-side (after zod) and again client-side.
6. **Generic errors** to the client; never stack traces.
7. **Light theme only**; tokens in `src/app/globals.css` (`--accent` etc.) so a mockup restyle is a token swap.

## 3. Data flow
```
textarea ──dispatch(setSituation)──▶ session-store
Analyze ──▶ api-client.analyze(situation, token?) ──▶ POST /api/analyze (Bearer optional)
  server: readBodyLimited(16KB) → zod → verifyPass → tier → model → runAnalysis
          runAnalysis: generateObject(system, <situation/>, schema, T=0.3) → validateAnalysisShape → retry once → 502
  client: validateAnalysisShape again → dispatch(success) → modalOpen if uiFocus says so
Start over ──▶ dispatch(reset)  (keeps token: it belongs to the tab, not the analysis)
Get a Pass ──▶ POST /api/checkout → Stripe hosted → /success?session_id → POST /api/verify → setToken → router.replace("/")
Vault ──▶ encryptVault({version,createdAt,situation,result}, passcode) → Blob download → URL revoked
/vault ──▶ file + passcode → decryptVault → validateAnalysisShape → render (memory only)
```

## 4. State machine (`session-store.tsx`)
`status: idle | loading | done | error`
- `start` clears result/modal/expanded and sets `loading`.
- `success` sets `done`; if `uiFocus.shouldGoFullScreen && targetSubsectionId`, opens the modal and pre-expands the target accordion; else expands `a1`.
- `closeModal` guarantees the target accordion is in `expanded`.
- `cancel` (AbortController) returns to `idle`.
- `reset` returns to initial state **but keeps `token`/`tokenExpiresAt`**.
- `setToken`/`clearToken`; a timer clears the token at `expiresAt` so `hasValidPass` is simply "token present".
- `beforeunload` warning registered only while a result or token exists.

## 5. Contracts
### `POST /api/analyze`
- Body `{ situation: string(1..4000) }`; > 16 KB ⇒ 413; bad JSON/shape ⇒ 400.
- Header `Authorization: Bearer <jwt>` optional.
- 200 `{ tier: "free"|"paid", result: Analysis }` + `X-Tier`, `Cache-Control: no-store`, `X-Robots-Tag: noindex`.
- 502 on shape failure after one retry, or provider failure. 499 on client abort.

### `POST /api/checkout` → `{ url }` (Stripe hosted Checkout; mock mode returns a relative `/success?...` URL)

### `POST /api/verify` `{ sessionId }` → `{ token, expiresAt }`
- Requires `payment_status === "paid"` and `created` within `PASS_MAX_SESSION_AGE_MINUTES` (410 otherwise; 402 if unpaid/unknown).
- JWT claims: `{ tier:"paid", sid: sha256(sessionId), iat, exp, iss, aud }`, HS256, TTL `JWT_TTL_MINUTES`.
- Never sets a cookie. Replay within the window is a known, documented trade-off.

### `Analysis` (see `src/lib/shape.ts` / `schema.ts`)
```ts
{ uiFocus: { shouldGoFullScreen, targetAccordion|null, targetSubsectionId|null, reason|null },
  accordions: [ { id:"a1".."a5", title, subsections:[ { id:"aN-s1..s3", title, content } ×3 ] } ×5 ] }
```
Ids are canonicalised by the validator (e.g. `A4_S1` → `a4-s1`); `uiFocus` targets must resolve to a real subsection.

### Vault file
`{ v:1, kdf:"PBKDF2-SHA256", iter:600000, salt:b64(16B), iv:b64(12B), ct:b64 }`; plaintext `{ version:1, createdAt, situation, result }`.

## 6. Environment
See `.env.example`. `src/lib/env.ts` validates lazily with zod and throws an aggregated error naming (only) the missing keys. Conditional requirements: provider key for the chosen `LLM_PROVIDER`; Stripe keys when `PAYMENTS_MODE=stripe`. `mock` modes exist for dev/CI and warn loudly in production.

## 7. Testing
- **Unit (Vitest)** `tests/unit/`: shape post-validator (counts, ids, uiFocus), JWT sign/verify/expiry/tamper, tier resolver, crypto round-trip + wrong passcode + tamper + fresh salt/IV.
- **E2E (Playwright, Pixel 7 profile)** `tests/e2e/`: free flow (5×3, `X-Tier: free`, Vault disabled, no cookies/storage), refresh wipes state, urgent → modal → Esc → `a4` expanded, mocked paid flow (`X-Tier: paid`, Vault export downloads, decrypts with the right passcode and fails with the wrong one, refresh ends the pass).
- **Static audit** `scripts/audit-storage.sh`: greps `src/` for prohibited APIs and `.next/static` for secret-looking strings / the prompt.

## 8. Open items / stretch
- Nonce-based CSP (drop `'unsafe-inline'` from `script-src`).
- Optional encrypted "pass file" re-import for paid users.
- Optional Stripe webhook + tiny KV of redeemed session hashes if replay abuse is observed (deliberate deviation from zero-retention).
- Apply the supplied UI mockup by editing tokens in `globals.css`.
