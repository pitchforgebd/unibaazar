import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import {
  MEDIA_VARIANT_WIDTHS,
  splitUploadUrl,
  variantUrl,
} from "@/lib/media/variantPath";
import { uploadsDirectory } from "@/server/admin/uploads";
import { generateImageVariants, type SourceExtension } from "@/server/media/variants";

/**
 * Canonical sources of "real" (in-use) uploaded images, as opposed to
 * globbing `public/uploads/` directly — that folder can accumulate orphaned
 * files (e.g. from a draft that was never saved), and we don't want to burn
 * sharp time regenerating variants nobody will ever request.
 *
 * Known gap, deliberately out of scope for this pass: the general settings
 * logo/favicon (`Setting` table, key "general", stored as a JSON blob) and
 * inline `<img>` tags inside rich-text `Page.body` / `BlogPost.content`
 * HTML are not scanned here. Both can reference `/uploads/...` URLs that
 * this function won't backfill. Extending `collectCanonicalUploadUrls`
 * below (JSON-parse the "general" setting; regex-extract `src="/uploads/…"`
 * from the HTML columns) is the natural next step if that gap matters in
 * practice — flagged for human follow-up rather than guessed at here.
 */
async function collectCanonicalUploadUrls(): Promise<string[]> {
  const [images, variants, banners, sliders, testimonials, seo] = await Promise.all([
    prisma.productImage.findMany({ select: { url: true } }),
    prisma.productVariant.findMany({
      select: { imageUrl: true },
      where: { imageUrl: { not: null } },
    }),
    prisma.banner.findMany({
      select: { imageUrl: true },
      where: { imageUrl: { not: null } },
    }),
    prisma.slider.findMany({
      select: { imageUrl: true },
      where: { imageUrl: { not: null } },
    }),
    prisma.testimonial.findMany({
      select: { imageUrl: true },
      where: { imageUrl: { not: null } },
    }),
    prisma.seoMeta.findMany({
      select: { ogImage: true },
      where: { ogImage: { not: null } },
    }),
  ]);

  const urls = [
    ...images.map((row) => row.url),
    ...variants.map((row) => row.imageUrl),
    ...banners.map((row) => row.imageUrl),
    ...sliders.map((row) => row.imageUrl),
    ...testimonials.map((row) => row.imageUrl),
    ...seo.map((row) => row.ogImage),
  ].filter((url): url is string => Boolean(url));

  // Dedupe, and drop anything that isn't a same-origin /uploads/ path
  // (external image URLs some of these columns also allow).
  return Array.from(new Set(urls)).filter((url) => splitUploadUrl(url) !== null);
}

/** Maps a stored original's extension to the `SourceExtension` union, or null if unrecognized. */
function extensionFromUrl(url: string): SourceExtension | null {
  const split = splitUploadUrl(url);
  if (!split) {
    return null;
  }
  const ext = split.ext.toLowerCase();
  if (ext === "png" || ext === "webp" || ext === "gif") {
    return ext;
  }
  if (ext === "jpg" || ext === "jpeg") {
    return "jpg";
  }
  return null;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function hasAllVariants(url: string, directory: string): Promise<boolean> {
  for (const width of MEDIA_VARIANT_WIDTHS) {
    const filePath = path.join(directory, path.basename(variantUrl(url, width, "webp")));
    if (!(await fileExists(filePath))) {
      return false;
    }
  }
  return true;
}

export type BackfillMediaVariantsOptions = {
  /** Max number of images to actually process (run through sharp) in this call. Default 25. */
  batchSize?: number;
};

export type BackfillMediaVariantsResult = {
  /** Images that had at least one variant generated in this call. */
  processed: number;
  /** Images that already had every variant, or can never have variants (animated GIFs). */
  skipped: number;
  /** Images whose original file couldn't be read or re-encoded. */
  failed: number;
  /** Images still missing variants after this call, left for a future call. */
  remaining: number;
};

/**
 * Finds existing uploaded images (via `collectCanonicalUploadUrls`, not a
 * blind directory glob) that are missing one or more of the pre-generated
 * WebP variants `src/server/media/variants.ts` produces at upload
 * time, and generates the missing ones.
 *
 * For the planned Maintenance-module UI: call this repeatedly (e.g. one
 * click per batch, or a loop with a progress bar) until the result's
 * `remaining` is 0. Each call only processes up to `batchSize` images
 * (default 25) and does so sequentially — never in parallel — because
 * `generateImageVariants` drives `sharp`, which is capped to
 * `sharp.concurrency(1)` for the production host's thread ceiling; batching
 * keeps a single call bounded in wall-clock time instead of running every
 * missing image in one request.
 *
 * Idempotent and safe to call repeatedly / concurrently-by-retry: it only
 * ever reads originals and writes variant files keyed by a deterministic
 * name (see `src/lib/media/variantPath.ts`), so re-running it after a
 * partial run (or a crash mid-batch) just regenerates whatever is still
 * missing and leaves already-complete images untouched.
 */
export async function backfillMediaVariants(
  options: BackfillMediaVariantsOptions = {},
): Promise<BackfillMediaVariantsResult> {
  const batchSize = options.batchSize ?? 25;
  const directory = uploadsDirectory();
  const canonicalUrls = await collectCanonicalUploadUrls();

  const pending: Array<{ url: string; ext: SourceExtension }> = [];
  let skipped = 0;

  for (const url of canonicalUrls) {
    const ext = extensionFromUrl(url);
    // Unrecognized extension, or an animated GIF (never resized — see
    // generateImageVariants) — nothing this function can or should do.
    if (!ext || ext === "gif") {
      skipped += 1;
      continue;
    }
    if (await hasAllVariants(url, directory)) {
      skipped += 1;
      continue;
    }
    pending.push({ url, ext });
  }

  const batch = pending.slice(0, batchSize);
  let processed = 0;
  let failed = 0;

  for (const { url, ext } of batch) {
    try {
      const originalPath = path.join(directory, path.basename(url));
      const bytes = new Uint8Array(await readFile(originalPath));
      // Originals on disk already passed reencodeImage's validation at
      // upload time, so backfill reads them as-is rather than re-running
      // that check against a (possibly now-mismatched) declared MIME type.
      await generateImageVariants(bytes, url, directory, ext);
      processed += 1;
    } catch {
      failed += 1;
    }
  }

  return { processed, skipped, failed, remaining: pending.length - batch.length };
}
