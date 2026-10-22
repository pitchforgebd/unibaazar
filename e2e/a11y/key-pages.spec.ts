import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  { name: "home", path: "/" },
  { name: "shop", path: "/shop" },
  { name: "product", path: "/product/cotton-crew-tshirt" },
  { name: "login", path: "/login" },
  { name: "cart", path: "/cart" },
  // The Phase 4 design-system showcase (master plan §4.1/§4.4's "done
  // when": every primitive gets an axe pass) — dev-only, but test:a11y
  // runs against a dev-mode build so it's reachable here.
  { name: "design-system", path: "/_design" },
];

for (const { name, path } of PAGES) {
  test(`${name} page has no critical axe violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
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
