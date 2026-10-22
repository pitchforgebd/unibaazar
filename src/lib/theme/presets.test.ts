import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  meetsAA,
  relativeLuminance,
  WCAG_AA_NORMAL_TEXT,
} from "@/lib/theme/contrast";
import { THEME_PRESET_IDS, THEME_PRESETS } from "@/lib/theme/presets";

describe("contrast", () => {
  it("black has zero luminance and white has full luminance", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("black on white is the maximum 21:1 ratio", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
  });

  it("is symmetric regardless of argument order", () => {
    expect(contrastRatio("#F95B09", "#FFFFFF")).toBeCloseTo(
      contrastRatio("#FFFFFF", "#F95B09"),
      5,
    );
  });

  it("meetsAA is false just under 4.5:1 and true at or above it", () => {
    expect(meetsAA("#777777", "#FFFFFF")).toBe(
      contrastRatio("#777777", "#FFFFFF") >= WCAG_AA_NORMAL_TEXT,
    );
  });
});

describe("theme presets — WCAG AA contrast (master plan §4.1)", () => {
  THEME_PRESET_IDS.forEach((id) => {
    const tokens = THEME_PRESETS[id];

    it(`${id}: ink on page meets AA (${WCAG_AA_NORMAL_TEXT}:1)`, () => {
      expect(contrastRatio(tokens.ink, tokens.page)).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT,
      );
    });

    it(`${id}: ink on card meets AA`, () => {
      expect(contrastRatio(tokens.ink, tokens.card)).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT,
      );
    });

    it(`${id}: foreground on page meets AA`, () => {
      expect(contrastRatio(tokens.foreground, tokens.page)).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT,
      );
    });

    it(`${id}: foreground on card meets AA`, () => {
      expect(contrastRatio(tokens.foreground, tokens.card)).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT,
      );
    });

    it(`${id}: white text on primary meets AA (the common button-label pairing)`, () => {
      expect(contrastRatio("#FFFFFF", tokens.primary)).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT,
      );
    });

    it(`${id}: white text on primaryDark meets AA`, () => {
      expect(contrastRatio("#FFFFFF", tokens.primaryDark)).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT,
      );
    });
  });
});
