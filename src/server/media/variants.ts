import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  MEDIA_VARIANT_WIDTHS,
  variantUrl,
  type MediaVariantFormat,
} from "@/lib/media/variantPath";

/**
 * NON-NEGOTIABLE: cap libvips' internal thread pool to 1 OS thread.
 *
 * `sharp` uses libvips, which is multi-threaded by default (it will happily
 * spawn one worker thread per CPU core it detects). The production host has
 * a hard ~5-OS-thread ceiling per process (see ARCHITECTURE.md §12) and
 * reliably crashes any process that exceeds it. This call must run exactly
 * once, at module load, unconditionally — not behind a feature flag or an
 * env check that could be skipped — because every other safeguard in this
 * module (sequential loops instead of `Promise.all`, small backfill
 * batches) only bounds *how many* sharp operations run concurrently, not
 * how many OS threads a single operation uses internally. This is the one
 * line that actually enforces the thread ceiling; everything else is
 * defense in depth.
 */
sharp.concurrency(1);

/** Output quality per format, baked in at generation time (see imageLoader.ts for why). */
const VARIANT_QUALITY: Record<MediaVariantFormat, number> = {
  webp: 75,
  avif: 60,
};

export type GeneratedVariant = {
  url: string;
  width: number;
  format: MediaVariantFormat;
};

/** Extensions produced by `reencodeImage`/`extension()` in src/server/admin/uploads.ts. */
export type SourceExtension = "png" | "jpg" | "webp" | "gif";

/**
 * Generates resized AVIF + WebP variants for one already-validated,
 * already-re-encoded image buffer, and writes them to `uploadsDir`.
 *
 * Design note on sizing: every width in `MEDIA_VARIANT_WIDTHS` is always
 * generated, for every image, using sharp's `withoutEnlargement: true`
 * (so a source smaller than a given target width is never scaled up —
 * the output simply keeps the source's own dimensions for that slot
 * instead of being skipped). This looks wasteful for a small source image
 * (it produces a few near-duplicate files), but it's a deliberate
 * trade-off: `next/image`'s custom loader (`src/lib/media/imageLoader.ts`)
 * runs synchronously, with no filesystem access, in both the browser and
 * the server — it cannot check which variant widths happen to exist for a
 * given image. Always writing the full fixed grid is what makes the
 * loader's width -> filename mapping deterministic. The extra disk cost
 * is a handful of small files per upload, which is negligible for this
 * app's image volume.
 *
 * Animated GIFs are skipped entirely (returns `[]`): resizing a GIF with
 * sharp without `{ animated: true }` flattens it to its first frame, and
 * wiring up full animated-AVIF/WebP re-encoding is out of scope for this
 * pipeline — GIF uploads keep working exactly as before (single
 * re-encoded original, served as-is, never passed to `next/image` at a
 * resized width).
 */
export async function generateImageVariants(
  cleaned: Uint8Array,
  originalUrl: string,
  uploadsDir: string,
  sourceExt: SourceExtension,
): Promise<GeneratedVariant[]> {
  if (sourceExt === "gif") {
    return [];
  }

  const source = Buffer.from(cleaned);
  const variants: GeneratedVariant[] = [];

  // Sequential, not Promise.all: keeps at most one decode/encode pass in
  // flight at a time, on top of the libvips-level concurrency(1) cap above.
  for (const width of MEDIA_VARIANT_WIDTHS) {
    for (const format of ["avif", "webp"] as const) {
      const buffer = await sharp(source)
        .resize({ width, withoutEnlargement: true })
        .toFormat(format, { quality: VARIANT_QUALITY[format] })
        .toBuffer();
      const url = variantUrl(originalUrl, width, format);
      await writeFile(path.join(uploadsDir, path.basename(url)), buffer);
      variants.push({ url, width, format });
    }
  }

  return variants;
}
