import localFont from "next/font/local";

/**
 * Self-hosted instead of `next/font/google`, after that loader crashed the
 * build three separate times in one day (2026-10-30) with "Cannot read
 * properties of null" — a different one of the three families each time,
 * which is the signature of Google Fonts' API being transiently
 * unreachable/rate-limited from GitHub's shared runner IPs, not a
 * misconfiguration. `next/font/google` fetches at build time over the
 * network; `next/font/local` reads these files from disk, so the build no
 * longer depends on that call succeeding. See
 * docs/decisions/0032-self-host-fonts.md.
 *
 * Files in ./files are the exact "latin"/"bengali" subset WOFF2s Google's
 * own CSS API serves for these weights — downloaded directly from
 * fonts.gstatic.com, not re-encoded or modified. OFL license text for each
 * family (all three are SIL Open Font License) is kept alongside in
 * ./licenses, matching how Google's own font repo ships them.
 */

export const poppins = localFont({
  src: [
    { path: "./files/poppins-400.woff2", weight: "400", style: "normal" },
    { path: "./files/poppins-500.woff2", weight: "500", style: "normal" },
    { path: "./files/poppins-600.woff2", weight: "600", style: "normal" },
    { path: "./files/poppins-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

// Noto Sans Bengali ships as a single variable font covering its whole
// weight axis — Google's CSS API returns the identical file for the
// 400/500/600/700 @font-face declarations alike, so one `src` entry
// (declared as a weight range) is the faithful equivalent, not a
// shortcut.
export const notoSansBengali = localFont({
  src: [
    {
      path: "./files/noto-sans-bengali-variable.woff2",
      weight: "400 700",
      style: "normal",
    },
  ],
  variable: "--font-noto-bengali",
  display: "swap",
});

// Luxe preset's heading font (src/lib/theme/presets.ts) — an elegant
// serif, used only via the `font-heading` utility, never for body copy.
// Also a single variable file covering both declared weights, same as
// Noto Sans Bengali above.
export const playfairDisplay = localFont({
  src: [
    {
      path: "./files/playfair-display-variable.woff2",
      weight: "600 700",
      style: "normal",
    },
  ],
  variable: "--font-playfair",
  display: "swap",
});

export const fontVariables = `${poppins.variable} ${notoSansBengali.variable} ${playfairDisplay.variable}`;
