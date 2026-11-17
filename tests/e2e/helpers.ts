import { expect, type Page, type Response } from "@playwright/test";

/** Records every response and asserts no Set-Cookie header ever appears. */
export function trackCookies(page: Page) {
  const offenders: string[] = [];
  page.on("response", (res: Response) => {
    const h = res.headers();
    if (h["set-cookie"]) offenders.push(res.url());
  });
  return {
    async assertNone() {
      expect(offenders, "no Set-Cookie headers expected").toEqual([]);
      expect(await page.evaluate(() => document.cookie)).toBe("");
      const storage = await page.evaluate(async () => ({
        local: localStorage.length,
        session: sessionStorage.length,
        idb: (await indexedDB.databases()).length,
        caches: (await caches.keys()).length,
      }));
      expect(storage).toEqual({ local: 0, session: 0, idb: 0, caches: 0 });
    },
  };
}

export async function runFreeAnalysis(page: Page, text = "My team keeps missing deadlines and I am not sure how to raise it.") {
  await page.goto("/");
  await page.getByTestId("situation-input").fill(text);
  await page.getByTestId("analyze-button").click();
  await expect(page.getByTestId("loading-state")).toBeVisible();
  await expect(page.getByTestId("results-accordions")).toBeVisible({ timeout: 30_000 });
}
