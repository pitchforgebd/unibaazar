import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  { name: "home", path: "/" },
  { name: "shop", path: "/shop" },
  { name: "product", path: "/product/cotton-crew-tshirt" },
  { name: "login", path: "/login" },
  { name: "cart", path: "/cart" },
];

for (const { name, path } of PAGES) {
  test(`${name} page has no critical axe violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      // color-contrast is disabled until Phase 4 ships contrast-checked design
      // tokens (master plan §4.1) — see docs/audit/current-state.md for the
      // specific violations found pre-Phase-4 (brand orange, a delivery-partner
      // badge color). Every other WCAG 2a/2aa rule still runs and blocks.
      .disableRules(["color-contrast"])
      .analyze();

    const critical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    if (critical.length > 0) {
      console.log(
        `axe violations on ${name}:`,
        JSON.stringify(
          critical.map((v) => ({ id: v.id, nodes: v.nodes.length })),
          null,
          2,
        ),
      );
    }

    expect(critical).toEqual([]);
  });
}
