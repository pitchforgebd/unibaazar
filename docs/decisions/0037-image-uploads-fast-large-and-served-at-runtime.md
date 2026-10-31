# 0037 — Image uploads: shrink in the browser, WebP only, serve /uploads ourselves

Date: 2026-10-31
Status: accepted

## Context

Right after launch, the admin reported product photo uploads taking a long
time, asked for at least 10 MB photos to be accepted, and asked for real
category images (until now a category only had an `imageHue` colour tile).
Tracing the actual upload path found four separate problems:

1. **Limits.** `reencodeImage` rejected anything over 2 MB, and Next's
   default Server Action body limit (1 MB) rejected most phone photos even
   before that check ran.
2. **Wasted work.** Every upload encoded 8 variants (4 widths × AVIF +
   WebP), each from a fresh full decode of the original, on one thread
   (`sharp.concurrency(1)`, required by the host's ~5-thread ceiling). The
   custom `next/image` loader only ever returns WebP, so the AVIF files —
   the slowest encode by far — were never served to anyone. Measured
   locally on a 4000×3000 JPEG: 14.4 s.
3. **Freshly uploaded images 404'd.** `next start` only serves `public/`
   files that existed when the server started. Uploads are written to
   `public/uploads` at runtime, so every new product/slider/banner image
   was a 404 until the next restart. Confirmed directly: a file copied into
   `public/uploads` after startup returned 404, while an older one returned 200.
4. **Sideways phone photos.** Variants were encoded without applying EXIF
   orientation and carry no orientation tag.

## Decision

- **Shrink in the browser first** (`src/lib/media/prepareUpload.ts`): every
  admin upload goes through `uploadAdminImage`, which downsizes photos to a
  2000px longest side (above the largest 1600px variant, so nothing visible
  is lost) before sending. A 10 MB phone photo goes up as roughly 1 MB.
  GIFs, small images, and browsers that can't decode/re-encode are sent
  unchanged.
- **Limits raised to 20 MB** (`src/lib/media/uploadLimits.ts`, shared by
  client and server) and the Server Action body limit to `21mb`.
- **WebP only, decoded once** (`src/server/media/variants.ts`): the source
  is auto-rotated, shrunk to 1600px once, and every width is encoded from
  those raw pixels. Same 4000×3000 test: 0.7 s (≈20× faster), with the
  thread cap unchanged.
- **`server.js` serves `/uploads/*` from disk** ahead of Next, with a
  one-year immutable cache (every upload has a fresh random name). Names
  are restricted to one flat directory of image extensions — no slashes or
  dot-files — so a request can't resolve outside it.
- **Category images**: new nullable `Category.imageUrl` (migration
  `20261031010000_category_image`), an upload field in the category form,
  and the homepage category ribbon shows the photo, falling back to the
  hue tile when there isn't one.

## Consequences

- AVIF variants already on disk are now simply unused; harmless.
- Images uploaded in production before this deploy that are still 404ing
  will appear as soon as this release restarts the app.
- The parity e2e suite now logs in once per worker instead of once per
  test: adding the category-image test made it a 9th login, and the real
  per-account limit is 8 per 15 minutes.
- Verified locally: unit tests (including a new EXIF rotation test), the
  full parity suite twice back to back (including a ~3000px multi-MB upload
  through the real admin form to the homepage), and the critical-path flow.
  The host itself is slower than a dev machine, but the work removed is
  removed there too.
