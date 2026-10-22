/**
 * Naming scheme for pre-generated image variants.
 *
 * This module is intentionally framework-agnostic and free of Node-only
 * imports (no `fs`, no `sharp`): it is imported both by the server-side
 * variant generator (`src/server/media/variants.ts`) and by the custom
 * `next/image` loader (`src/lib/media/imageLoader.ts`), and a custom loader
 * function is bundled and executed in the *browser* as well as on the
 * server. Pulling a server-only dependency in here would break the client
 * bundle, so this file must stay pure and synchronous.
 *
 * Naming scheme (the loader depends on this exactly):
 *   Given an original upload URL like `/uploads/<uuid>.<ext>`, a resized
 *   variant at width `w` in format `f` ("avif" | "webp") lives at:
 *
 *     /uploads/<uuid>-<w>.<f>
 *
 *   i.e. strip the original extension, append `-<width>`, append `.<format>`.
 *   Widths are always one of `MEDIA_VARIANT_WIDTHS` below — the generator
 *   writes exactly these widths for every image it processes (see
 *   `src/server/media/variants.ts` for why every width is always written,
 *   even for small source images), so the loader can compute a variant's
 *   path without ever touching disk.
 */

/**
 * The fixed width grid every processed upload is resized to. Chosen from the
 * actual display sizes in `src/components/store/product/ProductMedia.tsx`
 * (rendered up to ~640 CSS px, object-cover square, so up to ~1280px for 2x
 * displays) plus headroom for wider banner/slider imagery elsewhere in the
 * storefront: 400 (grid thumbnails / mobile), 800 (standard product card /
 * 2x of 400), 1200 (large product view / banners), 1600 (hero banners / 2x
 * of 800, wide desktop slots).
 */
export const MEDIA_VARIANT_WIDTHS = [400, 800, 1200, 1600] as const;

export type MediaVariantWidth = (typeof MEDIA_VARIANT_WIDTHS)[number];

export type MediaVariantFormat = "avif" | "webp";

/**
 * Splits "/uploads/abc123.png" into { base: "/uploads/abc123", ext: "png" }.
 * Returns null for anything that isn't a same-origin /uploads/ path (e.g.
 * external URLs, data: URIs, static /public assets) — those have no
 * generated variants and callers should pass the source through unchanged.
 */
export function splitUploadUrl(src: string): { base: string; ext: string } | null {
  if (!src.startsWith("/uploads/")) {
    return null;
  }
  const dot = src.lastIndexOf(".");
  if (dot <= "/uploads/".length - 1) {
    return null;
  }
  return { base: src.slice(0, dot), ext: src.slice(dot + 1) };
}

/** Rounds a requested width up to the nearest generated width, capping at the largest. */
export function roundUpToVariantWidth(width: number): MediaVariantWidth {
  for (const candidate of MEDIA_VARIANT_WIDTHS) {
    if (width <= candidate) {
      return candidate;
    }
  }
  return MEDIA_VARIANT_WIDTHS[MEDIA_VARIANT_WIDTHS.length - 1];
}

/** Builds the on-disk/public path for one variant of an original upload URL. */
export function variantUrl(
  originalUrl: string,
  width: MediaVariantWidth,
  format: MediaVariantFormat,
): string {
  const split = splitUploadUrl(originalUrl);
  if (!split) {
    throw new Error(`Cannot derive a variant path for non-upload URL: ${originalUrl}`);
  }
  return `${split.base}-${width}.${format}`;
}
