# Phase 11 QA report: SEO module

Branch: `v2/phase-11-seo`. Date: 2026-10-24.

## What was built

Per ADR 0022 (survey found almost all of the master plan's SEO wishlist
already built — `src/lib/seo/`, a full admin SEO page, a `Redirect`/
`NotFoundHit` schema, the Merchant Center feed sharing Meta's generator
— the real scope was one severe bug and several specific, named gaps):

1. **Fixed: the admin redirect manager was a complete no-op.**
   `findActiveRedirect()` existed, worked correctly, and was never
   called from anywhere in the real request path. `middleware.ts` now
   checks it before next-intl's own routing and returns a genuine
   301/302 (`next/navigation`'s `redirect()`/`permanentRedirect()` are
   limited to 307/308). That needs Prisma, so the file opts into
   `runtime: "nodejs"` (stable since Next 15.5). Verified against a
   real HTTP request, not just the code.
2. **A "Create redirect" shortcut** on each row of Admin → SEO's 404
   log — it was previously read-only.
3. **`ProductGroup`, `ItemList`, `VideoObject` JSON-LD**, all missing
   entirely before this phase, plus individual `Review` objects and
   real `shippingDetails` added to `productJsonLd()`.
4. **A product's Open Graph image now falls back to its own photo**
   when no custom SEO image is set — previously no image at all.
5. **The sitemap is now a real index** (`/sitemap.xml`) split by type
   (pages, products, categories, brands, blog, videos, images), every
   entry carrying both locale variants and real `lastmod`. The video
   sitemap uses Google's proper video-sitemap extension, not a plain
   URL list.
6. A root-cause fix for why none of `lib/seo/schema.ts`'s JSON-LD
   builders had unit tests before this phase: `lib/seo/urls.ts`'s
   `absoluteUrl()` was bundled in the same file as `localeAlternates()`
   (which needs next-intl's navigation module, unresolvable under
   `vitest`'s plain-node environment) — splitting them into
   `urls.ts`/`alternates.ts` made every importer of `absoluteUrl`
   testable again.
7. ADR 0022 (Phase 11 scope).

## Explicitly deferred

Per ADR 0022:

- **`hasMerchantReturnPolicy`** — needs a real return-window day count
  this codebase doesn't codify anywhere (only free-text
  `product.returns`); inventing one risks a structured-data/on-page
  mismatch, which Google's guidelines treat as worse than omitting the
  field. Needs a human to confirm the real policy first.
- **`LocalBusiness`**, **IndexNow for Bing** — both explicitly marked
  "(optional)"/"optional" in the master plan.

## Real bugs found and fixed this phase

1. **The redirect manager did nothing** (see "What was built" #1) —
   the most severe finding of this phase: a complete admin feature,
   fully built end to end, silently non-functional since whichever
   earlier phase shipped it.
2. Everything else under "What was built" is a named gap against the
   master plan's explicit wishlist, not a logic bug.

## Checked and already solid — confirmed, not assumed

- Canonicals for filtered/sorted URLs, noindex for thin filter
  combinations, fallback meta descriptions, fallback image alt text,
  the `robots.txt` editor, the 404 log itself, and the Merchant
  Center/Meta shared feed generator — all already correct; see ADR
  0022 for how each was confirmed.

## Test matrix and results

| Check                                                                                                                                                                                        | Result                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                                                                                                                                                                                    | ✅ pass                                                                                                                                                                                                                                                                                                                       |
| Lint                                                                                                                                                                                         | ✅ pass                                                                                                                                                                                                                                                                                                                       |
| Unit tests                                                                                                                                                                                   | ✅ 318/318 pass (38 files; +20 from Phase 10's 298 — every JSON-LD builder and both sitemap XML builders now have real unit coverage, newly possible after the urls.ts/alternates.ts split)                                                                                                                                   |
| Integration tests                                                                                                                                                                            | ✅ 38/38 pass (10 files; +5 — `findActiveRedirect`: active/inactive/no-match/self-redirect/302 cases)                                                                                                                                                                                                                         |
| E2E critical path (desktop + mobile)                                                                                                                                                         | ✅ both pass                                                                                                                                                                                                                                                                                                                  |
| Manual: a real `Redirect` row returns a genuine HTTP 301 with the correct `Location` header                                                                                                  | ✅ confirmed via a direct `curl` request against the running test server                                                                                                                                                                                                                                                      |
| Manual: inserting a real `HomeVideo` row makes it appear in `/sitemaps/videos.xml` with the correct `video:` tags                                                                            | ✅ confirmed                                                                                                                                                                                                                                                                                                                  |
| Manual: product page ships valid `Product`/`ProductGroup` + `BreadcrumbList` JSON-LD; `/shop` ships an `ItemList` matching the rendered grid; Admin → SEO's "Create redirect" shortcut works | ✅ confirmed via Playwright, parsing the real `<script type="application/ld+json">` tags, not just unit-testing the builder in isolation                                                                                                                                                                                      |
| a11y (axe, desktop): home/shop/product/login/cart/design-system                                                                                                                              | ✅ 6/6 pass                                                                                                                                                                                                                                                                                                                   |
| Parity (settings/menus/products/theme/checkout/social/system/tracking)                                                                                                                       | ✅ 8/8 pass                                                                                                                                                                                                                                                                                                                   |
| Visual snapshots                                                                                                                                                                             | ✅ 2/2 pass                                                                                                                                                                                                                                                                                                                   |
| Lighthouse                                                                                                                                                                                   | ✅ performance/a11y/best-practices pass their `error` thresholds on all 4 URLs; `/checkout`'s SEO score stays the documented, by-design `warn` exception for a correctly-`noindex`'d page — the master plan's own "Lighthouse SEO is 100 on key pages" doesn't include checkout, which is deliberately excluded from indexing |

One test-environment artifact during this phase's QA, not a
regression, same class already documented for Phases 7-10: this
session's own repeated local testing tripped the per-IP order-fraud
guard and the in-memory login rate limiter mid-run; resolved the same
way each time (clearing that day's test-only orders, restarting the
test server process).

## Known limitations

- **`hasMerchantReturnPolicy` still absent** — see "Explicitly
  deferred."
- **Redirects match the exact pathname only** — a redirect saved for
  `/old-page` doesn't also catch `/bn/old-page`; this is a pre-existing
  limitation of `findActiveRedirect()`'s own design (exact match),
  not something this phase changed. Most admin-authored redirects
  target the default-locale path, the common case.
- **`middleware.ts` now runs in the Node.js runtime instead of Edge** —
  a real architecture change; see ARCHITECTURE.md §11 and the
  "Consequences" section of ADR 0022 for why this is an acceptable
  trade for this host.

## Deploy notes

- **No new migration** — no schema changes this phase.
- **No new required env vars.**
- **No new cron job.**
- **Action needed from the human**: before relying on the redirect
  manager in production, re-verify a real redirect once deployed (the
  fix changes `middleware.ts`'s runtime, worth confirming on the real
  host once, even though it's covered by `verify:full` here). Before
  the first real Search Console submission, supply the real return-
  policy day count if `hasMerchantReturnPolicy` is wanted later.

## Summary

Phase 11 (SEO module): fixed the most severe bug found this session so
far — an entire admin feature (the redirect manager) that had been a
complete no-op since whichever phase built it, found by checking every
call site of its own lookup function rather than trusting that a
complete-looking admin UI meant a complete feature. Closed the named
JSON-LD gaps (`ProductGroup`, `ItemList`, `VideoObject`, `Review`,
`shippingDetails`), rebuilt the sitemap as a real per-type index with
locale variants, and fixed the root cause of why none of the JSON-LD
builders had unit tests before now. `hasMerchantReturnPolicy` stays
explicitly deferred pending a real policy fact only a human can supply.

`npm run verify` green (typecheck, lint, 318/318 unit), 38/38
integration tests, E2E critical path clean (desktop + mobile), a11y
6/6, parity 8/8, visual 2/2, Lighthouse green on its `error`-level
thresholds. Full test matrix and known limitations above.

Per the standing no-per-phase-PR workflow (2026-10-23): branch pushed,
no PR opened, proceeding straight into Phase 12 (Hardening, full QA,
and launch).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
