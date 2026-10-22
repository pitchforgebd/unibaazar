import type { ThemeTokens } from "@/lib/theme/presets";

function hexToChannels(hex: string): string {
  const normalized = hex.replace("#", "");
  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `${r} ${g} ${b}`;
}

const RADIUS_PX: Record<ThemeTokens["radius"], string> = {
  sm: "6px",
  md: "10px",
  lg: "16px",
};

const HEADING_FONT_VAR: Record<ThemeTokens["heading"], string> = {
  poppins: "var(--font-poppins)",
  playfair: "var(--font-playfair)",
};

/**
 * The tokens as a plain object of CSS custom properties — usable directly
 * as an inline `style` prop (cast `as React.CSSProperties` at the call
 * site, since custom properties aren't in that type) to scope a live
 * preview (a swatch picker, the /_design showcase) to one preset without
 * touching the page-level `:root` variables everything else reads from.
 * CSS custom properties cascade, so setting these on a wrapper element
 * overrides them for every descendant using `bg-primary`/`text-ink`/etc.
 */
export function themeCssVars(tokens: ThemeTokens): Record<string, string> {
  return {
    "--color-primary": hexToChannels(tokens.primary),
    "--color-primary-dark": hexToChannels(tokens.primaryDark),
    "--color-primary-light": hexToChannels(tokens.primaryLight),
    "--color-accent": hexToChannels(tokens.accent),
    "--color-ink": hexToChannels(tokens.ink),
    "--color-page": hexToChannels(tokens.page),
    "--color-card": hexToChannels(tokens.card),
    "--color-foreground": hexToChannels(tokens.foreground),
    "--color-muted": hexToChannels(tokens.muted),
    "--radius-theme": RADIUS_PX[tokens.radius],
    "--font-heading": HEADING_FONT_VAR[tokens.heading],
  };
}

/**
 * Renders the active theme as a `:root{...}` CSS string — the whole
 * mechanism behind "switching a preset re-skins the storefront through CSS
 * variables, with no rebuild" (master plan §4.1): this runs per request in
 * the root layout, not at build time, so a saved admin theme change is
 * live on the very next page load. Channels are space-separated r/g/b
 * (not a hex string) so Tailwind's `rgb(var(--color-x) / <alpha-value>)`
 * color definitions can still support opacity modifiers like `bg-primary/10`.
 */
export function themeStyleTag(tokens: ThemeTokens): string {
  const vars = themeCssVars(tokens);
  const declarations = Object.entries(vars)
    .map(([name, value]) => `${name}: ${value};`)
    .join("");
  return `:root{${declarations}}`;
}
