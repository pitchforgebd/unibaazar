import { readFileSync } from "node:fs";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

export const latinFont = "NotoLatin";
export const bengaliFont = "NotoBengali";

const bengaliChar = /[ঀ-৿]/;

let registered = false;

function dataUri(filePath: string): string {
  return `data:font/woff;base64,${readFileSync(filePath).toString("base64")}`;
}

/** @react-pdf/renderer has no per-glyph font fallback, so Latin and Bengali
 * text are registered as separate families — the Noto Sans Bengali "latin"
 * subset has no Bengali glyphs and the "bengali" subset has no Latin/ASCII
 * digit glyphs (common in mixed strings like "৳19,990"). Fonts are read into
 * a Buffer eagerly (rather than registered by file path) because registering
 * by path let @react-pdf/renderer start laying out text before the font's
 * glyph data had fully loaded under Next.js's dev server, silently dropping
 * Bengali glyphs. */
export function ensurePdfFonts(): void {
  if (registered) {
    return;
  }
  const base = path.join(
    process.cwd(),
    "node_modules/@fontsource/noto-sans-bengali/files",
  );
  Font.register({
    family: latinFont,
    src: dataUri(path.join(base, "noto-sans-bengali-latin-400-normal.woff")),
  });
  Font.register({
    family: bengaliFont,
    src: dataUri(path.join(base, "noto-sans-bengali-bengali-400-normal.woff")),
  });
  registered = true;
}

export type TextRun = { text: string; font: string };

/** Splits a string into consecutive-script runs so each run can be rendered
 * with the font that actually has its glyphs (see `ensurePdfFonts`). */
export function splitRuns(value: string): TextRun[] {
  const runs: TextRun[] = [];
  let current = "";
  let currentFont = latinFont;
  for (const char of value) {
    const font = bengaliChar.test(char) ? bengaliFont : latinFont;
    if (current && font !== currentFont) {
      runs.push({ text: current, font: currentFont });
      current = "";
    }
    currentFont = font;
    current += char;
  }
  if (current) {
    runs.push({ text: current, font: currentFont });
  }
  return runs;
}
