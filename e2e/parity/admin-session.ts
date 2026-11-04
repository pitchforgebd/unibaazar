import path from "node:path";
import { test as base, expect, type Page } from "@playwright/test";

async function loginAsAdmin(page: Page) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.locator('input[name="identity"]').fill("01700000000");
  await page.locator('input[name="password"]').fill("pass1234");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });
}

/**
 * Logs in once per worker and reuses that session for every test it runs.
 * Logging in per test hit the real per-account login limit (8 per 15
 * minutes, src/server/security/guard.ts) as soon as the suite grew a 9th
 * test — the limiter is right, the suite was just spending its budget.
 */
export const test = base.extend<object, { adminStorageState: string }>({
  storageState: ({ adminStorageState }, provide) => provide(adminStorageState),
  adminStorageState: [
    async ({ browser }, provide, workerInfo) => {
      const file = path.join(
        workerInfo.project.outputDir,
        `.auth/admin-${workerInfo.parallelIndex}.json`,
      );
      // A worker-scoped page doesn't inherit the project's `use` options.
      const page = await browser.newPage({
        storageState: undefined,
        baseURL: workerInfo.project.use.baseURL,
      });
      await loginAsAdmin(page);
      await page.context().storageState({ path: file });
      await page.close();
      await provide(file);
    },
    { scope: "worker" },
  ],
});

/**
 * Waits for a settings form's own success status.
 *
 * This replaced `getByText("saved", { exact: false })`, which was wrong twice
 * over. It matched page body copy as well as the status — the social settings
 * page's intro ends "…keep the saved value" — so on that page it either
 * resolved to two elements and failed strict mode, or, when the status hadn't
 * rendered yet, matched the intro and passed while asserting nothing about the
 * save. Scoping to `role="status"` excludes body copy, and filtering on the
 * word keeps the submit button's own "Saving…" spinner label out of it.
 *
 * 20s rather than 10s because these are real server actions that revalidate
 * storefront tags: with four workers competing, one save was still showing
 * "Saving…" when a 10s budget expired even though the write had already
 * landed in the database.
 */
export async function expectSaved(page: Page) {
  await expect(page.getByRole("status").filter({ hasText: /saved/i })).toBeVisible({
    timeout: 20_000,
  });
}

export { expect };
