import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a production build in mock mode (LLM_PROVIDER=mock, PAYMENTS_MODE=mock)
 * so no external keys are needed. A dedicated port avoids colliding with another
 * local dev server, and we never reuse an unrelated server already on that port.
 * See README for the real Stripe test-mode run.
 */
const port = Number(process.env.E2E_PORT ?? 3100);
const origin = `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? origin,
    ...devices["Pixel 7"],
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run build && npm run start -- -p ${port}`,
        url: `${origin}/api/health`,
        reuseExistingServer: false,
        timeout: 240_000,
        env: {
          LLM_PROVIDER: "mock",
          PAYMENTS_MODE: "mock",
          MODEL_FREE: "mock-free",
          MODEL_PAID: "mock-paid",
          MASTER_SYSTEM_PROMPT: "E2E-only test prompt used by the Playwright suite.",
          JWT_SECRET: "e2e-only-secret-with-at-least-32-characters",
          JWT_TTL_MINUTES: "120",
          PASS_MAX_SESSION_AGE_MINUTES: "30",
          NEXT_PUBLIC_APP_URL: origin,
        },
      },
});
