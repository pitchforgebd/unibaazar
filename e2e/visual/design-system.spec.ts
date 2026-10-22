import { expect, test } from "@playwright/test";

// Master plan §4.1/§4.4's "done when": every components/ui and
// components/motion primitive gets a visual snapshot. /_design renders
// every primitive in every theme preset on one page (see
// src/components/design/DesignShowcase.tsx), so one full-page screenshot
// covers all of them at once rather than needing a baseline per
// component — consistent with how e2e/visual/homepage.spec.ts kept its
// first real baseline simple.
test("design system showcase renders every primitive, in every preset", async ({
  page,
}) => {
  await page.goto("/_design");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Design system" })).toBeVisible();
  await expect(page).toHaveScreenshot("design-system.png", {
    maxDiffPixelRatio: 0.05,
    fullPage: true,
  });
});
