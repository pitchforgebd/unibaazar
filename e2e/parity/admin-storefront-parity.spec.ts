import sharp from "sharp";
import { expect, expectSaved, test } from "./admin-session";

// Admin -> storefront parity, per the master plan's §2.3: change a value in
// admin, assert the storefront shows it. One test per settings group listed
// in Phase 2's "done when" criterion (settings, menus, products), plus the
// Phase 6 settings-group parity pass (theme, checkout, social, system,
// tracking) — see docs/decisions/0017-phase-6-scope-admin-rebuild.md.

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

  await page.goto("/admin/settings/system", { waitUntil: "networkidle" });
  await page.getByLabel("Cookie banner text").fill(uniqueText);
  await page.getByRole("button", { name: "Save" }).click();
  await expectSaved(page);

  await page.goto("/");
  await expect(page.getByText(uniqueText)).toBeVisible({ timeout: 10_000 });
});

test("category image parity: a large uploaded category photo shows in the homepage ribbon", async ({
  page,
}) => {
  const stamp = Date.now();
  const name = `Parity Category ${stamp}`;
  // A ~3000px noisy JPEG, several MB: bigger than the old 1 MB server-action
  // body limit, so this also covers the in-browser shrink + raised limits.
  const side = 3000;
  const noise = Buffer.alloc(side * side * 3);
  for (let i = 0; i < noise.length; i += 1) {
    noise[i] = (i * 2654435761) & 0xff;
  }
  const photo = await sharp(noise, { raw: { width: side, height: side, channels: 3 } })
    .jpeg({ quality: 92 })
    .toBuffer();
  expect(photo.length).toBeGreaterThan(2 * 1024 * 1024);

  await page.goto("/admin/categories", { waitUntil: "networkidle" });
  await page.getByLabel("Name").fill(name);
  const form = page.locator("form").filter({ hasText: "Add category" });
  await page.getByLabel("Image", { exact: true }).setInputFiles({
    name: "big-photo.jpg",
    mimeType: "image/jpeg",
    buffer: photo,
  });
  await expect(form.locator('img[src^="/uploads/"]')).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Save category" }).click();
  await expect(page.getByText("Category saved.")).toBeVisible({ timeout: 20_000 });

  await page.goto("/", { waitUntil: "networkidle" });
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const tileImage = page.locator(`a[href$="/category/${slug}"] img`).first();
  await expect(tileImage).toHaveAttribute("src", /\/uploads\/.+-\d+\.webp/, {
    timeout: 10_000,
  });
  const src = await tileImage.getAttribute("src");
  const response = await page.request.get(src!);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/webp");
});

test("description parity: rich text shows as formatting on the product page, never as raw tags", async ({
  page,
}) => {
  const marker = `Rich ${Date.now()}`;
  await page.goto("/admin/products", { waitUntil: "networkidle" });
  await page
    .locator("tr", { hasText: "Kids School Bag" })
    .first()
    .getByRole("link", { name: "Edit" })
    .click();
  await expect(page.getByRole("heading", { name: "Edit product" })).toBeVisible();

  const shortField = page
    .locator("div.block")
    .filter({ has: page.getByText("Short description", { exact: true }) });
  await shortField.getByRole("button", { name: "HTML" }).click();
  await shortField
    .locator("textarea")
    .fill(
      `<p>${marker} <strong>bold</strong></p><ul><li>First point</li></ul><script>window.__pwned = true</script>`,
    );
  await shortField.getByRole("button", { name: "Visual" }).click();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("Product saved.", { exact: false })).toBeVisible({
    timeout: 20_000,
  });

  await page.goto("/product/kids-school-bag", { waitUntil: "networkidle" });
  const bold = page.locator("strong", { hasText: "bold" }).first();
  await expect(bold).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("li", { hasText: "First point" }).first()).toBeVisible();
  await expect(page.getByText("<p>", { exact: false })).toHaveCount(0);
  expect(await page.evaluate(() => "__pwned" in window)).toBe(false);
});

test("category edit: clicking Edit on another row loads that category into the form", async ({
  page,
}) => {
  await page.goto("/admin/categories", { waitUntil: "networkidle" });
  const rows = page.locator("tbody tr");
  const names: string[] = [];
  for (const index of [0, 1]) {
    names.push((await rows.nth(index).locator("p").first().innerText()).trim());
  }
  expect(names[0]).not.toBe(names[1]);

  for (const [index, name] of names.entries()) {
    await rows.nth(index).getByRole("link", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit category" })).toBeVisible();
    await expect(page.getByLabel("Name")).toHaveValue(name);
  }
});
