import type { CSSProperties, ReactNode } from "react";
import { THEME_PRESETS, type ThemePresetId } from "@/lib/theme/presets";
import { themeCssVars } from "@/lib/theme/styleTag";

const LABEL: Record<ThemePresetId, string> = {
  bazaar: "Bazaar — default, orange",
  luxe: "Luxe — dark, gold",
  fresh: "Fresh — green",
  tech: "Tech — blue",
};

/**
 * Scopes everything inside it to one theme preset via inline CSS custom
 * properties (same mechanism as the admin ThemePresetPicker's live
 * preview) — lets /_design show every preset side by side without
 * touching the real saved admin setting. The scoped `<dialog>`s rendered
 * inside still inherit these variables correctly even though the browser
 * promotes them to the top layer: that only affects paint order, not the
 * DOM tree custom properties cascade through.
 */
export function PresetPreview({
  presetId,
  children,
}: {
  presetId: ThemePresetId;
  children: ReactNode;
}) {
  const vars = themeCssVars(THEME_PRESETS[presetId]) as CSSProperties;
  return (
    <section
      style={vars}
      className="rounded-theme border border-black/10 bg-page p-6"
      data-preset={presetId}
    >
      <h2 className="font-heading text-xl font-bold text-ink">{LABEL[presetId]}</h2>
      <div className="mt-4 space-y-8">{children}</div>
    </section>
  );
}
