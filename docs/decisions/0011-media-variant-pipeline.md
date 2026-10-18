# 0011: Media variant pipeline — sizing grid, format split, and backfill scope

## Context

Phase 2's media pipeline slice (master plan: "uploads are validated, re-encoded,
and resized at upload time to AVIF/WebP in several widths with sharp
concurrency 1... a custom `next/image` loader serves the variants... add a
backfill job") hit three design points the plan leaves to judgment.

## Decision

**1. Always write every configured width, never skip one.** `next/image`'s
custom loader API (`({ src, width, quality }) => string`) runs synchronously,
with no filesystem access, in both the browser and the server — it cannot
check which variant widths happen to exist for a given image. The alternative
(skip generating a width when the source is smaller than it) would make the
set of files that exist vary per image, which the loader can't know without
I/O it isn't allowed to do. Instead, every upload always gets all four widths
(400/800/1200/1600) written via sharp's `withoutEnlargement: true`, which caps
the _pixel dimensions_ at the source's own size without upscaling but still
produces a file at every grid slot. Cost: a handful of near-duplicate small
files for small source images — negligible for this app's image volume.

**2. The custom loader always returns WebP, never AVIF.** The loader can't see
the `Accept` header, so it can't negotiate format per request. WebP has
near-universal 2026 browser support and is still a large win over the
original PNG/JPEG. AVIF variants are generated and written to disk regardless
(smaller, but not reachable through `next/image`), available for any
hand-authored `<picture>` with an `<source type="image/avif">` later.

**3. Animated GIFs are never resized.** Resizing a GIF with sharp without
`{ animated: true }` flattens it to its first frame. Full animated-AVIF/WebP
re-encoding is out of scope for this pass — GIF uploads keep their pre-existing
behaviour (single re-encoded original, served as-is, never requested from
`next/image` at a non-native width).

**4. The backfill function's "canonical in-use images" source is scoped to
direct relational URL columns** (`ProductImage.url`, `ProductVariant.imageUrl`,
`Banner.imageUrl`, `Slider.imageUrl`, `Testimonial.imageUrl`,
`SeoMeta.ogImage`), not a blind glob of `public/uploads/`. It deliberately does
**not** scan the `Setting` table's JSON-blob logo/favicon value, nor
`<img src="/uploads/...">` occurrences inside `Page.body` / `BlogPost.content`
rich-text HTML — both are real gaps, just out of scope for keeping this first
version simple per the task's own instruction.

## Consequences

- The sizing grid is fixed and shared between the generator
  (`src/server/media/variants.ts`) and the loader
  (`src/lib/media/imageLoader.ts`) through one pure module
  (`src/lib/media/variantPath.ts`) so they can never drift independently.
- A future change to `MEDIA_VARIANT_WIDTHS` changes both sides automatically,
  but existing on-disk variants from before the change won't match the new
  grid until `backfillMediaVariants` is re-run.
- Anyone wiring AVIF into the UI later does so by hand (not through
  `next/image`), using `variantUrl(url, width, "avif")` directly.
- If logo/favicon or rich-text inline images ever need backfilling, extend
  `collectCanonicalUploadUrls` in `src/server/media/backfill.ts` — the gap is
  called out there in a comment, not silently assumed away.
