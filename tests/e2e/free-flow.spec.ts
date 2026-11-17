import { test, expect } from "@playwright/test";
import { runFreeAnalysis, trackCookies } from "./helpers";

test("free flow renders exactly 5 accordions x 3 subsections with no cookies/storage", async ({ page }) => {
  const cookies = trackCookies(page);
  const analyzeRes = page.waitForResponse((r) => r.url().endsWith("/api/analyze"));
  await runFreeAnalysis(page);

  const res = await analyzeRes;
  expect(res.status()).toBe(200);
  expect(res.headers()["x-tier"]).toBe("free");
  expect(res.headers()["cache-control"]).toContain("no-store");

  await expect(page.getByTestId("accordion")).toHaveCount(5);
  // Expand everything and count subsections.
  const triggers = page.getByTestId("accordion").getByRole("button", { expanded: false });
  while ((await triggers.count()) > 0) await triggers.first().click();
  await expect(page.getByTestId("subsection")).toHaveCount(15);

  await expect(page.getByTestId("tier-badge")).toHaveText(/free/i);
  await expect(page.getByTestId("vault-button")).toBeDisabled();
  await cookies.assertNone();
});

test("refresh wipes input, output and state", async ({ page }) => {
  await runFreeAnalysis(page);
  page.on("dialog", (d) => d.accept()); // beforeunload prompt
  await page.reload();
  await expect(page.getByTestId("situation-input")).toHaveValue("");
  await expect(page.getByTestId("results-accordions")).toHaveCount(0);
});
