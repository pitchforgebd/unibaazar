import {
  MEDIA_VARIANT_WIDTHS,
  roundUpToVariantWidth,
  splitUploadUrl,
  variantUrl,
} from "@/lib/media/variantPath";

/**
 * Custom `next/image` loader, wired up in `next.config.ts`
 * (`images: { loader: "custom", loaderFile: "./src/lib/media/imageLoader.ts" }`).
 *
 * Why custom: Next's built-in image optimizer re-encodes images on demand,
 * at request time, in the server process — exactly the kind of runtime,
 * multi-threaded image work the production host's ~5-OS-thread ceiling
 * can't survive (see ARCHITECTURE.md §12 and `src/server/media/variants.ts`).
 * Instead, every variant is pre-generated at upload time and this loader
 * just maps a requested width onto the nearest pre-generated file — no
 * image processing happens here, ever.
 *
 * AVIF vs WebP tradeoff (read before changing this function):
 * `next/image`'s custom loader API is `({ src, width, quality }) => string`
 * — it returns exactly one URL, with no access to the request's `Accept`
 * header, so it cannot do real content negotiation between AVIF and WebP
 * the way an `<picture>` with multiple `<source>` elements could. Rather
 * than fake negotiation (e.g. sniffing a user-agent string, which is
 * unreliable and adds complexity for little gain), this loader always
 * returns the WebP variant: WebP has near-universal browser support as of
 * 2026 and is still a large win over serving the original PNG/JPEG. AVIF
 * variants are still generated and written to disk by
 * `src/server/media/variants.ts` — they're simply not reachable through
 * `next/image`/this loader. Anywhere in the codebase that wants the extra
 * AVIF saving can hand-author a `<picture>` element with an
 * `<source type="image/avif">` pointing at `variantUrl(url, width, "avif")`
 * and a `<img>`/`next/image` WebP fallback.
 *
 * `quality` is intentionally ignored: variant quality is baked in at
 * generation time (see VARIANT_QUALITY in variants.ts), not chosen per
 * request, since all processing happens once at upload time.
 */
export default function imageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!splitUploadUrl(src)) {
    // Not one of our processed uploads (external URL, data: URI, a static
    // /public asset, …) — nothing to resize, pass it through unchanged.
    return src;
  }

  const targetWidth = roundUpToVariantWidth(width);
  return variantUrl(src, targetWidth, "webp");
}

/** Exported for anything that wants the full grid, e.g. to build a `sizes`-aware `srcSet` by hand. */
export const availableVariantWidths = MEDIA_VARIANT_WIDTHS;
