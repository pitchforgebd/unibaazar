import { writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MEDIA_VARIANT_WIDTHS, variantUrl } from "@/lib/media/variantPath";

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

/** WebP quality, baked in at generation time (see imageLoader.ts for why). */
const WEBP_QUALITY = 78;

const LARGEST_WIDTH = MEDIA_VARIANT_WIDTHS[MEDIA_VARIANT_WIDTHS.length - 1];

export type GeneratedVariant = {
  url: string;
  width: number;
  format: "webp";
};

/** Extensions produced by `reencodeImage`/`extension()` in src/server/admin/uploads.ts. */
export type SourceExtension = "png" | "jpg" | "webp" | "gif";

/**
 * Generates resized WebP variants for one already-validated, already
 * re-encoded image buffer, and writes them to `uploadsDir`.
 *
 * The source is decoded exactly once: auto-rotated from its EXIF
 * orientation (otherwise phone photos come out sideways, because the
 * encoded variants carry no orientation tag), shrunk to the largest grid
 * width, and kept as raw pixels that every width is then encoded from —
 * instead of re-decoding a multi-megabyte JPEG once per width.
 *
 * Every width in `MEDIA_VARIANT_WIDTHS` is always written, using
 * `withoutEnlargement` (a source smaller than a slot keeps its own size
 * rather than being skipped): `next/image`'s custom loader
 * (`src/lib/media/imageLoader.ts`) runs synchronously with no filesystem
 * access, so it can only map width -> filename if the full grid exists.
 *
 * Animated GIFs are skipped entirely (returns `[]`): resizing one without
 * `{ animated: true }` flattens it to its first frame, so GIF uploads keep
 * their single re-encoded original, served as-is.
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

  const { data, info } = await sharp(Buffer.from(cleaned))
    .rotate()
    .resize({ width: LARGEST_WIDTH, withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw = { width: info.width, height: info.height, channels: info.channels };

  const variants: GeneratedVariant[] = [];
  // Sequential, not Promise.all: keeps at most one encode in flight at a
  // time, on top of the libvips-level concurrency(1) cap above.
  for (const width of MEDIA_VARIANT_WIDTHS) {
    const buffer = await sharp(data, { raw })
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    const url = variantUrl(originalUrl, width, "webp");
    await writeFile(path.join(uploadsDir, path.basename(url)), buffer);
    variants.push({ url, width, format: "webp" });
  }

  return variants;
}
