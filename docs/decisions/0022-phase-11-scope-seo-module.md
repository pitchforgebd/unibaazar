# 0022: Phase 11 scope — SEO module

## Context

The master plan's Phase 11 bullet list asks for: per-entity SEO fields
with a score panel and SERP preview; a full set of typed JSON-LD
builders; a sitemap index split by type with both locales, a
`robots.txt` editor, and (explicitly) no deprecated sitemap ping; a
redirect manager, a 404 monitor with one-click redirect creation,
canonicals for filtered/sorted URLs, noindex for thin filter
combinations, and auto-generated fallback meta/alt text; and a Google
Merchant Center feed sharing its generator with the Meta feed.

A survey (same discipline as ADRs 0016–0021) found almost all of this
already built — `src/lib/seo/` (metadata, schema, score, urls), a full
admin SEO page (`src/components/admin/seo/SeoManager.tsx`), a `Redirect`

- `NotFoundHit` schema, and the Merchant Center feed (confirmed already
  shared with Meta's generator in Phase 9's own survey). The real scope
  turned out to be one severe, silent bug and several specific, named
  gaps — not a from-scratch build.

## The headline finding: the redirect manager did nothing

`src/server/admin/seo.ts`'s `saveRedirect()`/`deleteRedirect()` write to
the `Redirect` table, and `src/server/seo/public.ts`'s
`findActiveRedirect()` reads it back correctly — a complete admin UI, a
complete schema, a complete lookup function, all wired together and
working... except `findActiveRedirect()` had **zero callers anywhere
else in the codebase**. An admin who saved a redirect from the old URL
of a deleted product to its replacement would see it listed in the
table, with no error, with no indication anything was wrong — and every
single visitor following that old link would still hit the site's
normal 404, not the redirect. This has been true since whichever
earlier phase built the feature; found by checking every call site of
`findActiveRedirect`, the same discipline that found Phase 8's OTP bug,
Phase 9's Purchase-timing bug, and Phase 10's broken dashboard metric.

**Fixed**: `src/middleware.ts` now checks `findActiveRedirect()` on
every storefront request before next-intl's own locale routing runs,
and returns a real `NextResponse.redirect(toPath, statusCode)` — an
actual 301/302, not the 307/308 `next/navigation`'s `redirect()`/
`permanentRedirect()` are limited to. This needs Prisma inside
middleware, which the default Edge middleware runtime can't run;
`runtime: "nodejs"` (stable since Next 15.5, this project's version —
no longer the experimental `next.config.js` flag Next 15.2 introduced
it as) opts the whole file into the Node.js runtime instead. Verified
with a real HTTP request against a test DB row returning a genuine
`HTTP/1.1 301 Moved Permanently` with the correct `Location` header,
not just by reading the code.

## Other real gaps found

1. **404 monitor has no "create redirect" shortcut** — exactly what the
   master plan names; currently a read-only list.
2. **The sitemap is one flat list, not an index** — missing brands,
   videos (Phase 5 built a whole `/videos` gallery with zero sitemap
   presence), and images entirely; and lists one URL per entity with no
   locale variants, despite the site being genuinely bilingual
   (`routing.locales`).
3. **JSON-LD gaps against the master plan's explicit list**:
   `ProductGroup` (variants) and `ItemList` (listings) don't exist at
   all; `Product`'s JSON-LD has `Offer`/`AggregateRating` but no
   individual `Review` objects or `shippingDetails`
   (`OfferShippingDetails`); `VideoObject` doesn't exist despite Phase
   5's video gallery and per-product video URLs.
4. **A product's Open Graph image never falls back to the product's own
   photo** — only a custom admin-set SEO image is ever used; a product
   with no custom one gets no image in its social-share card at all.

## Checked and already solid — not gaps

- **Canonicals for filtered/sorted URLs**: `buildMetadata()`'s
  `canonical = absoluteUrl(input.canonical || input.path)` already
  always falls back to the clean path; every filterable page (`/shop`,
  `/category/[slug]`) already passes the bare path, never the query
  string.
- **Noindex for thin filter combinations**: `/shop` noindexes whenever
  any query param is present; `/category/[slug]` noindexes whenever
  any filter is active, same pattern.
- **Auto-generated fallback meta/alt text**: every entity's
  `generateMetadata()` already falls back through a real, non-empty
  field (`shortDescription`, `category.description`, etc. — all
  required columns, never actually empty in practice); product images
  already fall back `alt={image.alt || name}` in `ProductMedia.tsx`.
- **robots.txt editor, redirect CRUD, 404 log** — all three already
  exist in `SeoManager.tsx`; only the redirect _lookup_ side was dead.
- **Google Merchant Center feed sharing the Meta feed's generator** —
  confirmed in Phase 9's own survey (`src/server/tracking/feed.ts`).
- **No deprecated sitemap ping anywhere** — nothing in this codebase
  ever implemented one; nothing to remove.

## In scope this phase

1. Wire `findActiveRedirect()` into `middleware.ts` (done above).
2. A "Create redirect" shortcut on each 404-log row.
3. Rebuild the sitemap as a real index: `sitemap.xml` becomes an index
   pointing at per-type child sitemaps (products, categories, brands,
   pages, blog, videos, images), each entry carrying both locale
   variants and real `lastmod` from `updatedAt`.
4. Add `ProductGroup`, `ItemList`, and `VideoObject` JSON-LD builders,
   wired into the category/listing pages and the video gallery/product
   video pages; add individual `Review` objects and `shippingDetails`
   to `productJsonLd()`.
5. Fall back a product's OG image to its own first photo when no
   custom SEO image is set.

## Explicitly deferred

- **`hasMerchantReturnPolicy`** — needs a real return-window day count
  to put in `merchantReturnDays`. Nothing in this codebase codifies one
  (the only existing content is `product.returns`, free admin-entered
  text, not a structured number) — inventing a number risks a false
  structured-data claim that mismatches the real, human-written return
  policy page, which is worse than omitting the field (Google's Rich
  Results guidelines treat a mismatch between structured data and
  on-page content as a policy violation, not a minor gap). This needs a
  human to confirm the real policy's day count first, same spirit as
  CLAUDE.md's stop-and-ask conditions even though it isn't literally
  one of the four listed.
- **`LocalBusiness`** — explicitly marked "(optional)" in the master
  plan.
- **IndexNow for Bing** — explicitly marked "optional."
- **Documenting Search Console submission** — the master plan asks to
  document this "instead of" a sitemap ping; added as a short
  `DEPLOYMENT.md` note alongside the sitemap-index change, not a
  separate feature.

## Consequences

- `middleware.ts` now runs in the Node.js runtime instead of the
  default Edge runtime — a real, if modest, architecture change: every
  matched storefront request now does one indexed-primary-key Prisma
  lookup before anything else runs. Acceptable given this host's own
  constraints are about CPU/thread ceilings from spawning processes
  (`ARCHITECTURE.md` §12), not per-request DB latency, and a redirect
  table lookup is the same shape of query every other page already does
  per request.
- The sitemap moving from one flat file to an index changes its public
  URL shape (child sitemaps at new paths) — fine for a site not yet
  submitted to Search Console for real traffic, per `CLAUDE.md`'s "live
  but not yet selling" framing; noted for the human before the first
  real submission.
