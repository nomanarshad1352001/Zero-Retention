// Deterministic, non-secret environment for unit tests. No real keys, no network.
process.env.LLM_PROVIDER ??= "mock";
process.env.MODEL_FREE ??= "gpt-4o-mini";
process.env.MODEL_PAID ??= "gpt-4.1";
process.env.MASTER_SYSTEM_PROMPT ??= "Test master prompt used only by the unit test suite.";
process.env.PAYMENTS_MODE ??= "mock";
process.env.JWT_SECRET ??= "unit-test-secret-with-at-least-32-characters";
process.env.JWT_TTL_MINUTES ??= "120";
process.env.PASS_MAX_SESSION_AGE_MINUTES ??= "30";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_MARKETING_URL ??= "http://localhost:3000";
