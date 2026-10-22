"use client";

import { ButtonsAndFormsSection } from "@/components/design/ButtonsAndFormsSection";
import { MotionSection } from "@/components/design/MotionSection";
import { OverlaysSection } from "@/components/design/OverlaysSection";
import { PresetPreview } from "@/components/design/PresetPreview";
import { ToastStack } from "@/components/ui/toast/ToastStack";
import { THEME_PRESET_IDS } from "@/lib/theme/presets";

/**
 * Dev-only showcase for every components/ui and components/motion
 * primitive, in every theme preset (master plan §4.1/§4.4's "done when":
 * a visual snapshot and an axe pass per primitive, and no-rebuild preset
 * switching). Blocked in production at the route level — see
 * src/app/[locale]/_design/page.tsx.
 *
 * ToastStack is mounted exactly once, outside every preset's scoped
 * wrapper below, because it's backed by one shared Zustand queue — four
 * scoped instances would all render the same pushed toast four times over.
 * It keeps the page's own (unscoped) theme regardless of which preset's
 * "push a toast" button triggered it; demonstrating per-preset *toast*
 * styling isn't covered here.
 */
export function DesignShowcase() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Design system — /_design</h1>
        <p className="mt-1 text-sm text-muted">
          Every components/ui and components/motion primitive, in every theme preset.
          Dev-only — not reachable in production.
        </p>
      </div>
      <ToastStack regionLabel="Notifications" dismissLabel="Dismiss" />
      {THEME_PRESET_IDS.map((presetId) => (
        <PresetPreview key={presetId} presetId={presetId}>
          <ButtonsAndFormsSection />
          <OverlaysSection presetId={presetId} />
          <MotionSection />
        </PresetPreview>
      ))}
    </div>
  );
}
