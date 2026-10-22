/** WCAG 2.2 relative luminance / contrast ratio — pure, no DOM. Used to
 * verify every theme preset's text-on-background pairs meet AA (4.5:1 for
 * normal text) automatically in CI, per the master plan's §4.1 requirement,
 * rather than relying on eyeballing a palette. */

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const value = parseInt(normalized, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function channelLuminance(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA) + 0.05;
  const lumB = relativeLuminance(hexB) + 0.05;
  return lumA > lumB ? lumA / lumB : lumB / lumA;
}

export const WCAG_AA_NORMAL_TEXT = 4.5;
export const WCAG_AA_LARGE_TEXT = 3;

export function meetsAA(
  hexForeground: string,
  hexBackground: string,
  large = false,
): boolean {
  return (
    contrastRatio(hexForeground, hexBackground) >=
    (large ? WCAG_AA_LARGE_TEXT : WCAG_AA_NORMAL_TEXT)
  );
}
