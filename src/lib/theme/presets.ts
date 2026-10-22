export type ThemePresetId = "bazaar" | "luxe" | "fresh" | "tech";

export type HeadingFont = "poppins" | "playfair";

export type ThemeTokens = {
  /** Brand accent — buttons, links, active states. */
  primary: string;
  primaryDark: string;
  /** A light tint of primary, for subtle badges/backgrounds — in a dark
   * preset this is a dark tint instead, same role (subtle, low-contrast
   * surface), not literally "light". */
  primaryLight: string;
  /** Flash-sale / deal badges — must read as "urgent" against primary. */
  accent: string;
  /** Highest-contrast text (headings, strong body text). */
  ink: string;
  /** Page background. */
  page: string;
  /** Card/surface background, layered on top of page. */
  card: string;
  /** Default body text color. */
  foreground: string;
  /** De-emphasized text (captions, placeholders). */
  muted: string;
  /** Base corner radius for the whole preset. */
  radius: "sm" | "md" | "lg";
  heading: HeadingFont;
};

export const THEME_PRESET_IDS: ThemePresetId[] = ["bazaar", "luxe", "fresh", "tech"];

export const THEME_PRESETS: Record<ThemePresetId, ThemeTokens> = {
  // Default. Warm orange, light theme — the brand's existing identity.
  bazaar: {
    primary: "#AA3B06",
    primaryDark: "#A33805",
    primaryLight: "#FFF0E8",
    accent: "#D1123B",
    ink: "#000000",
    page: "#F5F5F5",
    card: "#FFFFFF",
    foreground: "#111827",
    muted: "#5B6472",
    radius: "md",
    heading: "poppins",
  },
  // Dark, gold accent — fashion/beauty.
  luxe: {
    primary: "#8F7118",
    primaryDark: "#6B5512",
    primaryLight: "#2B2410",
    accent: "#E5C158",
    ink: "#F5F1E6",
    page: "#121212",
    card: "#1C1B18",
    foreground: "#F5F1E6",
    muted: "#B6AC94",
    radius: "lg",
    heading: "playfair",
  },
  // Green, light theme — grocery.
  fresh: {
    primary: "#227A30",
    primaryDark: "#185C23",
    primaryLight: "#E8F6EA",
    accent: "#B8590A",
    ink: "#0B2E12",
    page: "#F3FBF4",
    card: "#FFFFFF",
    foreground: "#15321B",
    muted: "#4D6657",
    radius: "md",
    heading: "poppins",
  },
  // Cool blue, light theme — electronics.
  tech: {
    primary: "#2563EB",
    primaryDark: "#1E4FC2",
    primaryLight: "#E8EEFC",
    accent: "#B8590A",
    ink: "#0B1220",
    page: "#F3F6FC",
    card: "#FFFFFF",
    foreground: "#111827",
    muted: "#5B6676",
    radius: "sm",
    heading: "poppins",
  },
};

export function resolveThemeTokens(
  presetId: ThemePresetId,
  overrides: Partial<Pick<ThemeTokens, "primary" | "primaryDark">> = {},
): ThemeTokens {
  const base = THEME_PRESETS[presetId];
  return { ...base, ...overrides };
}
