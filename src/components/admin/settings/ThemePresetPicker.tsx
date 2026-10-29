"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { buttonClass } from "@/components/ui/controls";
import { THEME_PRESET_IDS, THEME_PRESETS, type ThemePresetId } from "@/lib/theme/presets";
import { themeCssVars } from "@/lib/theme/styleTag";
import type { ActionResult } from "@/server/admin/result";
import type { ThemeSettings } from "@/server/settings/store";

const PRESET_LABEL: Record<ThemePresetId, string> = {
  bazaar: "Bazaar (default, orange)",
  luxe: "Luxe (dark, gold)",
  fresh: "Fresh (green)",
  tech: "Tech (blue)",
};

/**
 * "Switching a preset re-skins the whole storefront through CSS
 * variables, with no rebuild" (master plan §4.1) — this picks the preset
 * and shows it live (scoped to the preview card only, via themeCssVars'
 * inline style) before the admin applies it for real. Applying re-saves
 * the full ThemeSettings object (preserving the other, unrelated fields
 * SettingsForm on this same page manages) through the same themeAction.
 */
export function ThemePresetPicker({
  current,
  action,
}: {
  current: ThemeSettings;
  action: (values: Record<string, string | boolean>) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [previewId, setPreviewId] = useState<ThemePresetId>(current.presetId);
  const [appliedId, setAppliedId] = useState<ThemePresetId>(current.presetId);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const previewTokens = THEME_PRESETS[previewId];
  const previewVars = themeCssVars(previewTokens);
  const previewStyle = previewVars as CSSProperties;
  const previewHeadingFont = previewVars["--font-heading"];

  async function apply(): Promise<void> {
    setPending(true);
    setMessage("");
    const result = await action({
      primary: current.primary,
      font: current.font,
      showTopBar: current.showTopBar,
      showChat: current.showChat,
      presetId: previewId,
    });
    setPending(false);
    setMessage(result.message);
    if (result.ok) {
      setAppliedId(previewId);
      // SettingsForm below initializes its own state from `current` only
      // once, at mount — without a refresh (which remounts it via the
      // `key={values.presetId}` on the page), saving that other form next
      // would silently resubmit the stale pre-apply presetId and revert
      // this change.
      router.refresh();
    }
  }

  return (
    <div className="space-y-4 rounded-theme bg-card p-4 shadow-soft">
      <div>
        <h2 className="font-semibold text-ink">Theme preset</h2>
        <p className="text-sm text-muted">
          Pick a preset to preview it below, then apply it — the storefront updates within
          seconds, no deploy needed.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {THEME_PRESET_IDS.map((id) => {
          const tokens = THEME_PRESETS[id];
          const selected = previewId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPreviewId(id)}
              aria-pressed={selected}
              className={`rounded-theme border p-3 text-left transition-colors duration-fast ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                selected ? "border-primary ring-2 ring-primary/30" : "border-muted"
              }`}
            >
              <span className="flex gap-1">
                <span
                  className="h-5 w-5 rounded-full"
                  style={{ backgroundColor: tokens.primary }}
                />
                <span
                  className="h-5 w-5 rounded-full"
                  style={{ backgroundColor: tokens.accent }}
                />
                <span
                  className="h-5 w-5 rounded-full border border-muted"
                  style={{ backgroundColor: tokens.page }}
                />
              </span>
              <span className="mt-2 block text-xs font-semibold text-ink">
                {PRESET_LABEL[id]}
              </span>
              {appliedId === id ? (
                <span className="mt-1 block text-xs text-primary">Currently live</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        style={previewStyle}
        className="rounded-theme border border-muted p-4"
        data-testid="theme-preview"
      >
        <div
          className="rounded-theme bg-card p-4"
          style={{ backgroundColor: previewTokens.card }}
        >
          <p
            className="font-heading text-lg font-bold"
            style={{ color: previewTokens.ink, fontFamily: previewHeadingFont }}
          >
            Shop the look
          </p>
          <p className="mt-1 text-sm" style={{ color: previewTokens.foreground }}>
            A live preview of this preset&apos;s colors, radius, and heading font.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className={buttonClass("primary")}
              style={{
                backgroundColor: previewTokens.primary,
                borderRadius:
                  previewTokens.radius === "sm"
                    ? "6px"
                    : previewTokens.radius === "lg"
                      ? "16px"
                      : "10px",
              }}
            >
              Add to cart
            </button>
            <span
              className="rounded-full px-2 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: previewTokens.accent }}
            >
              -20% deal
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          isLoading={pending}
          loadingLabel="Applying…"
          onClick={() => void apply()}
          disabled={previewId === appliedId}
        >
          {previewId === appliedId ? "Already live" : "Apply this theme"}
        </Button>
        {message ? (
          <p role="status" className="text-sm text-foreground">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
