import { describe, expect, it } from "vitest";
import { contrastRatio, WCAG_AA_NORMAL_TEXT } from "@/lib/theme/contrast";
import { THEME_PRESET_IDS, THEME_PRESETS } from "@/lib/theme/presets";
import tailwindConfig from "../../../tailwind.config";

// Text-on-surface pairings components/ui relies on beyond the ones
// presets.test.ts already covers (ink/page, white/primary, …). If a new
// preset breaks one, the fix is in the preset or the component's pairing —
// not in loosening this test.
const success = tailwindConfig.theme.extend.colors.success;

describe("components/ui token pairings — WCAG AA in every preset", () => {
  THEME_PRESET_IDS.forEach((id) => {
    const tokens = THEME_PRESETS[id];

    it(`${id}: Badge accent (card text on accent)`, () => {
      expect(contrastRatio(tokens.card, tokens.accent)).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT,
      );
    });

    it(`${id}: Badge primary (ink text on peach)`, () => {
      expect(contrastRatio(tokens.ink, tokens.primaryLight)).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT,
      );
    });

    it(`${id}: inverted surfaces — Toast/Tooltip (page text on ink)`, () => {
      expect(contrastRatio(tokens.page, tokens.ink)).toBeGreaterThanOrEqual(
        WCAG_AA_NORMAL_TEXT,
      );
    });
  });

  it("Badge success (white on the fixed success color)", () => {
    expect(contrastRatio("#FFFFFF", success)).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT);
  });
});
