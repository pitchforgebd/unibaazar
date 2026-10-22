import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { THEME_PRESETS } from "@/lib/theme/presets";
import { themeStyleTag } from "@/lib/theme/styleTag";

// src/styles/globals.css hand-maintains a static `:root` fallback (used by
// admin, which never re-skins with storefront presets) that's supposed to
// mirror THEME_PRESETS.bazaar exactly. There's no build step wiring them
// together, so this test is the only thing that catches the two drifting
// apart after someone edits the Bazaar preset's values without touching
// the CSS file too.
describe("globals.css's static :root fallback", () => {
  it("matches THEME_PRESETS.bazaar's generated variables", () => {
    const css = readFileSync(join(__dirname, "../../styles/globals.css"), "utf-8");
    const expected = themeStyleTag(THEME_PRESETS.bazaar);
    // themeStyleTag() returns ":root{--a: 1 2 3;--b: ...}" — check each
    // declaration appears in globals.css, regardless of surrounding
    // whitespace/formatting.
    const declarations = expected
      .replace(/^:root\{/, "")
      .replace(/\}$/, "")
      .split(";")
      .filter(Boolean);
    const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    declarations.forEach((declaration) => {
      const [name, value] = declaration.split(":").map((part) => part.trim());
      expect(css).toMatch(new RegExp(`${escapeRegex(name!)}:\\s*${escapeRegex(value!)}`));
    });
  });
});
