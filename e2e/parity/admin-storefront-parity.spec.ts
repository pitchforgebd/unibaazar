import { expect, test } from "@playwright/test";

// Admin -> storefront parity, per the master plan's §2.3: change a value in
// admin, assert the storefront shows it. One test per settings group listed
// in Phase 2's "done when" criterion (settings, menus, products), plus the
// Phase 6 settings-group parity pass (theme, checkout, social, system,
// tracking) — see docs/decisions/0017-phase-6-scope-admin-rebuild.md.

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.locator('input[name="identity"]').fill("01700000000");
  await page.locator('input[name="password"]').fill("pass1234");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });
}

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
async function expectSaved(page: import("@playwright/test").Page) {
  await expect(page.getByRole("status").filter({ hasText: /saved/i })).toBeVisible({
    timeout: 20_000,
  });
}

function hexToRgb(hex: string): string {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

test("settings parity: changing the site name updates the storefront header", async ({
  page,
}) => {
  const uniqueName = `UniBaazar Parity ${Date.now()}`;

  await loginAsAdmin(page);
  await page.goto("/admin/settings", { waitUntil: "networkidle" });
  const nameField = page.getByLabel("Site name");
  await nameField.fill(uniqueName);
  await page.getByRole("button", { name: "Save" }).click();
  await expectSaved(page);

  await page.goto("/");
  await expect(page.getByText(uniqueName).first()).toBeVisible({ timeout: 10_000 });
});

test("menus parity: adding a header menu item shows up in the public menu API", async ({
  page,
}) => {
  const uniqueLabel = `Parity Link ${Date.now()}`;

  await loginAsAdmin(page);
  await page.goto("/admin/content/menus", { waitUntil: "networkidle" });
  await page.getByLabel("Menu").selectOption("header");
  await page.getByLabel("Label").fill(uniqueLabel);
  await page.getByLabel("Link").fill("/parity-test-link");
  await page.getByRole("button", { name: "Save link" }).click();
  await expectSaved(page);

  const response = await page.request.get("/api/v1/menus/header");
  expect(response.ok()).toBe(true);
  const body = await response.json();
  const labels = JSON.stringify(body);
  expect(labels).toContain(uniqueLabel);
});

test("products parity: a quick-edited price shows up on the product page", async ({
  page,
}) => {
  const uniquePrice = String(700 + (Date.now() % 100));

  await loginAsAdmin(page);
  await page.goto("/admin/products", { waitUntil: "networkidle" });

  const row = page.locator("tr", { hasText: "Cotton Crew T-Shirt" }).first();
  await row.getByRole("button", { name: "Quick edit" }).click();
  const priceField = row.getByLabel("Price");
  await priceField.fill(uniquePrice);
  await row.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("updated", { exact: false })).toBeVisible({
    timeout: 10_000,
  });

  await page.goto("/product/cotton-crew-tshirt");
  await expect(page.getByText(uniquePrice, { exact: false }).first()).toBeVisible({
    timeout: 10_000,
  });
});

test("theme parity: changing the top bar color recolors the storefront top bar", async ({
  page,
}) => {
  const uniqueColor = `#${Date.now().toString(16).slice(-6).padStart(6, "0")}`;

  await loginAsAdmin(page);
  await page.goto("/admin/settings/theme", { waitUntil: "networkidle" });
  await page.getByLabel("Top bar color").fill(uniqueColor);
  await page.getByRole("button", { name: "Save" }).click();
  await expectSaved(page);

  await page.goto("/");
  const topBar = page
    .locator("p", { hasText: "Free delivery" })
    .locator("xpath=ancestor::div[@style][last()]");
  await expect(topBar).toHaveCSS("background-color", hexToRgb(uniqueColor), {
    timeout: 10_000,
  });

  // Restore the shipped default, for the same reason the checkout test
  // below restores COD. A random top bar colour is almost never
  // AA-contrast-safe against the white text TopBar.tsx renders on it
  // (themeDefaults' #C94607 is chosen to be — see
  // src/server/settings/store.ts), so leaving it behind made
  // `npm run test:a11y` fail on every page for every run after this
  // one. That cost real debugging time in Phases 9, 10 and 11 before
  // Phase 12's repeatable-regression work tracked it back to here.
  await page.goto("/admin/settings/theme", { waitUntil: "networkidle" });
  await page.getByLabel("Top bar color").fill("#C94607");
  await page.getByRole("button", { name: "Save" }).click();
  await expectSaved(page);
});

test("checkout parity: disabling cash on delivery hides it from the storefront checkout", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings/checkout", { waitUntil: "networkidle" });
  await page.getByLabel("Allow cash on delivery").uncheck();
  await page.getByRole("button", { name: "Save" }).click();
  await expectSaved(page);

  await page.goto("/checkout", { waitUntil: "networkidle" });
  await expect(page.getByText("Cash on delivery")).toHaveCount(0);

  // Restore: a disabled COD option would otherwise silently affect any
  // other suite's checkout flow for the rest of this test DB's life.
  await page.goto("/admin/settings/checkout", { waitUntil: "networkidle" });
  await page.getByLabel("Allow cash on delivery").check();
  await page.getByRole("button", { name: "Save" }).click();
  await expectSaved(page);
});

test("social parity: changing the Facebook URL updates the storefront footer link", async ({
  page,
}) => {
  const uniqueUrl = `https://facebook.com/parity-${Date.now()}`;

  await loginAsAdmin(page);
  await page.goto("/admin/settings/social", { waitUntil: "networkidle" });
  await page.getByLabel("Facebook page URL").fill(uniqueUrl);
  await page.getByRole("button", { name: "Save" }).click();
  await expectSaved(page);

  await page.goto("/");
  await expect(page.locator(`a[href="${uniqueUrl}"]`)).toBeVisible({ timeout: 10_000 });
});

test("system parity: changing the cookie banner text updates the storefront banner", async ({
  page,
}) => {
  const uniqueText = `Parity cookie notice ${Date.now()}`;

  await loginAsAdmin(page);
  await page.goto("/admin/settings/system", { waitUntil: "networkidle" });
  await page.getByLabel("Cookie banner text").fill(uniqueText);
  await page.getByRole("button", { name: "Save" }).click();
  await expectSaved(page);

  await page.goto("/");
  await expect(page.getByText(uniqueText)).toBeVisible({ timeout: 10_000 });
});

test("tracking parity: saving a GA4 ID loads its script on the storefront after consent", async ({
  page,
}) => {
  const uniqueId = `G-PARITY${Date.now()}`;

  await loginAsAdmin(page);
  await page.goto("/admin/tracking", { waitUntil: "networkidle" });
  await page.getByLabel("Google Analytics 4 ID").fill(uniqueId);
  await page.getByRole("button", { name: "Save" }).click();
  await expectSaved(page);

  await page.goto("/");
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.locator(`script[src*="${uniqueId}"]`)).toHaveCount(1, {
    timeout: 10_000,
  });
});
