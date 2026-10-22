import { describe, expect, it } from "vitest";
import { THEME_PRESETS } from "@/lib/theme/presets";
import { themeStyleTag } from "@/lib/theme/styleTag";

describe("themeStyleTag", () => {
  it("converts hex colors to space-separated rgb channels", () => {
    const css = themeStyleTag(THEME_PRESETS.bazaar);
    expect(css).toContain("--color-primary: 170 59 6;"); // #AA3B06
  });

  it("includes every token the Tailwind config expects", () => {
    const css = themeStyleTag(THEME_PRESETS.luxe);
    [
      "--color-primary:",
      "--color-primary-dark:",
      "--color-primary-light:",
      "--color-accent:",
      "--color-ink:",
      "--color-page:",
      "--color-card:",
      "--color-foreground:",
      "--color-muted:",
      "--radius-theme:",
      "--font-heading:",
    ].forEach((token) => expect(css).toContain(token));
  });

  it("wraps everything in a single :root rule", () => {
    const css = themeStyleTag(THEME_PRESETS.fresh);
    expect(css.startsWith(":root{")).toBe(true);
    expect(css.endsWith("}")).toBe(true);
  });
});
