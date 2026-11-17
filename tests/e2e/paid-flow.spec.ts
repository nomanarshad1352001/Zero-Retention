import { test, expect } from "@playwright/test";
import { trackCookies } from "./helpers";
import { decryptVault, parseVaultFile } from "../../src/lib/crypto-client";

/**
 * Paid flow with Stripe mocked (PAYMENTS_MODE=mock): /api/checkout returns a
 * /success URL with a mock session id; /api/verify mints a real JWT.
 */
test("paid flow mints an in-memory pass, switches tier, and exports a decryptable vault", async ({ page }) => {
  const cookies = trackCookies(page);
  await page.goto("/");
  await page.getByTestId("buy-pass").click();
  await page.waitForURL("**/");
  await expect(page.getByTestId("pass-active")).toBeVisible();
  expect(page.url()).not.toContain("session_id");

  const analyzeRes = page.waitForResponse((r) => r.url().endsWith("/api/analyze"));
  await page.getByTestId("situation-input").fill("Should I take the new job offer?");
  await page.getByTestId("analyze-button").click();
  const res = await analyzeRes;
  expect(res.headers()["x-tier"]).toBe("paid");
  expect((await res.json()).tier).toBe("paid");
  await expect(page.getByTestId("tier-badge")).toHaveText(/pass/i);

  // Vault export
  const vault = page.getByTestId("vault-button");
  await expect(vault).toBeEnabled();
  await vault.click();
  await page.getByTestId("vault-pass1").fill("correct horse battery");
  await page.getByTestId("vault-pass2").fill("correct horse battery");
  const download = page.waitForEvent("download");
  await page.getByTestId("vault-export").click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^vault-\d{8}-\d{4}\.vault\.json$/);
  const text = (await (await file.createReadStream()).toArray()).join("");
  const parsed = parseVaultFile(text);
  await expect(decryptVault(parsed, "wrong passcode!")).rejects.toThrow();
  const payload = await decryptVault(parsed, "correct horse battery");
  expect(payload.situation).toBe("Should I take the new job offer?");
  await expect(page.getByTestId("vault-success")).toBeVisible();

  await cookies.assertNone();

  // Refresh ends the pass.
  page.on("dialog", (d) => d.accept());
  await page.reload();
  await expect(page.getByTestId("pass-card")).toBeVisible();
  await expect(page.getByTestId("pass-active")).toHaveCount(0);
});
