import { expect, test } from "@playwright/test";

// Phase 0 scaffold only: proves the visual-snapshot mechanism works end to end.
// Real baselines (per screen, per theme preset, per locale) are built out in
// Phase 4 once the design system exists — see UNIBAAZAR_V2_MASTER_PLAN.md §Phase 4.
test("homepage renders without a layout crash", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  await expect(page).toHaveScreenshot("homepage.png", {
    maxDiffPixelRatio: 0.05,
    fullPage: false,
  });
});
