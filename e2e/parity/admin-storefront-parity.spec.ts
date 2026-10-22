import { expect, test } from "@playwright/test";

// Admin -> storefront parity, per the master plan's §2.3: change a value in
// admin, assert the storefront shows it. One test per settings group listed
// in Phase 2's "done when" criterion (settings, menus, products).

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.locator('input[name="identity"]').fill("01700000000");
  await page.locator('input[name="password"]').fill("pass1234");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });
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
  await expect(page.getByText("saved", { exact: false })).toBeVisible({
    timeout: 10_000,
  });

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
  await expect(page.getByText("saved", { exact: false })).toBeVisible({
    timeout: 10_000,
  });

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
