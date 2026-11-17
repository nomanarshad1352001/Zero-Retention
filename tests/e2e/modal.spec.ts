import { test, expect } from "@playwright/test";
import { runFreeAnalysis } from "./helpers";

test("urgent result opens the full-screen modal, closes, and expands the right accordion", async ({ page }) => {
  // In mock mode the word "urgent" triggers uiFocus.shouldGoFullScreen=true -> a4-s1.
  await page.goto("/");
  await page.getByTestId("situation-input").fill("This is urgent, I need to decide today.");
  await page.getByTestId("analyze-button").click();

  const modal = page.getByTestId("fullscreen-modal");
  await expect(modal).toBeVisible({ timeout: 30_000 });
  await expect(modal).toHaveAttribute("role", "dialog");
  await expect(modal).toHaveAttribute("aria-labelledby", /.+/);
  await expect(page.getByTestId("modal-reason")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();

  const target = page.locator("#acc-a4");
  await expect(target.getByRole("button").first()).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#sub-a4-s1")).toBeVisible();
});
