import { expect, test, type Page } from "@playwright/test";

// RBAC E2E, per Phase 6's "done when" bar (ADR 0017): each staff role
// should see only the admin sections its permissions grant, and get the
// module's own "access required" denial on everything else — not a crash,
// not a silent pass-through. The grant matrix mirrors
// src/server/security/permissions.ts's roleGrants exactly; if that file
// changes, this test's MODULES/roles table should change with it.

const STAFF_ROLES = ["manager", "staff", "content-editor", "accountant"] as const;
const ROLE_PHONES: Record<(typeof STAFF_ROLES)[number], string> = {
  manager: "01700000001",
  staff: "01700000002",
  "content-editor": "01700000003",
  accountant: "01700000004",
};

// One representative page per permission (inventory/marketing also gate on
// catalog.manage, same as products — covered once here rather than 3x).
const MODULES = [
  { permission: "catalog.manage", path: "/admin/products" },
  { permission: "orders.manage", path: "/admin/orders" },
  { permission: "customers.manage", path: "/admin/customers" },
  { permission: "content.manage", path: "/admin/content" },
  { permission: "reports.view", path: "/admin/reports" },
  { permission: "settings.manage", path: "/admin/settings" },
  { permission: "users.manage", path: "/admin/users" },
] as const;

// Mirrors src/server/security/permissions.ts's roleGrants.
const GRANTS: Record<(typeof STAFF_ROLES)[number], readonly string[]> = {
  manager: ["catalog.manage", "orders.manage", "customers.manage", "reports.view"],
  staff: ["orders.manage"],
  "content-editor": ["catalog.manage", "content.manage"],
  accountant: ["reports.view"],
};

const DENIED_TEXT = "This staff role cannot";

async function loginAs(page: Page, phone: string): Promise<void> {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.locator('input[name="identity"]').fill(phone);
  await page.locator('input[name="password"]').fill("pass1234");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 20_000 });
}

for (const role of STAFF_ROLES) {
  test(`${role} sees exactly the modules its role grants`, async ({ page }) => {
    await loginAs(page, ROLE_PHONES[role]);
    const grants = GRANTS[role];

    for (const mod of MODULES) {
      await page.goto(mod.path, { waitUntil: "networkidle" });
      const allowed = grants.includes(mod.permission);
      const deniedVisible = await page
        .getByText(DENIED_TEXT, { exact: false })
        .isVisible()
        .catch(() => false);

      if (allowed) {
        expect(
          deniedVisible,
          `${role} has ${mod.permission} but ${mod.path} shows the denial screen`,
        ).toBe(false);
      } else {
        expect(
          deniedVisible,
          `${role} lacks ${mod.permission} but ${mod.path} did not show the denial screen`,
        ).toBe(true);
      }
    }
  });
}

test("a customer account cannot reach any admin screen", async ({ page }) => {
  // The seeded storefront customer (Rahim Ahmed) — not a staff role at all,
  // so every admin access guard should refuse it, and the dashboard itself
  // (the only page with no permission check, just an isStaffRole() check)
  // should not render real data for it either.
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.locator('input[name="identity"]').fill("01711111111");
  await page.locator('input[name="password"]').fill("pass1234");
  await page.getByRole("button", { name: "Login" }).click();
  // A customer logging in does not land on /admin.
  await expect(page).not.toHaveURL(/\/admin/, { timeout: 20_000 });

  // Navigating to /admin directly must not show real admin content: either
  // a denial screen, a login redirect, or the admin error boundary — never
  // dashboard data (which would mean the isStaffRole() guard is bypassed).
  await page.goto("/admin", { waitUntil: "networkidle" });
  await expect(page.getByText("Top products", { exact: false })).not.toBeVisible();
});

test("an unauthenticated visitor is redirected to login from an admin page", async ({
  page,
}) => {
  await page.goto("/admin/orders", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
});
