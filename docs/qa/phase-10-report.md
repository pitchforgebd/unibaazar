# Phase 10 QA report: Analytics module

Branch: `v2/phase-10-analytics`. Date: 2026-10-24.

## What was built

Per ADR 0021 (survey found most of the tracking/consent/UTM groundwork
already built, mostly from Phase 9's own work — the real gaps were
several specific, named items plus one silently-broken existing metric,
not a from-scratch build):

1. **Fixed `dashboard.ts`'s silently-broken "purchase events this
   week" metric.** It queried `TrackingEvent.name === "purchase"`
   (lowercase); every `Purchase` event is actually recorded as
   `"Purchase"` (capitalized). The query matched nothing, ever — this
   metric has shown `0` since whichever phase wrote it, regardless of
   real purchase volume.
2. **`Search` now records whether it matched anything.** The one call
   site (`search/page.tsx`) logged just the query text before; it now
   also logs `resultCount`, enabling a zero-result-searches report.
3. **`PageView` now carries the persisted last-touch UTM set** (not
   just whatever's literally in the current page's URL) and a
   lightweight `ub_visitor` cookie — fixing undercounted traffic-level
   UTM attribution and enabling a real-time-visitor count, neither of
   which existed before.
4. **Categorized cookie consent + Google Consent Mode v2.** The binary
   accept/reject banner becomes necessary (implicit) / analytics /
   marketing, with a "Customize" panel; a prior visitor's bare
   `"accept"`/`"reject"` value still reads correctly
   (`parseConsentValue()`, unit-tested for every shape). `StorePixels`
   now loads GA4/GTM/Clarity/Hotjar under analytics consent and
   Meta/TikTok/Pinterest/Snap under marketing consent independently
   (previously one flag gated everything), and pushes Consent Mode v2
   signals on load and on every later consent change.
5. **A real Google Ads conversion event on `Purchase`** when
   `adsId`/`adsLabel` are both configured — previously only GA4's own
   `purchase` event fired, which Google Ads doesn't read for conversion
   attribution.
6. **New Admin → Analytics section** (`/admin/analytics`,
   `reportsAccess()`-gated — same audience as the existing Reports
   page): traffic (daily page views + top paths), sources/UTM (orders
   - revenue by last-touch UTM source, read from `Order`'s own
     columns — the attributable version), a conversion funnel
     (ViewContent → AddToCart → InitiateCheckout → Purchase counts),
     per-product performance (views/carts/purchases joined on the
     slug/sku every relevant event already carries), top and zero-result
     search terms, and a polled (30s) real-time-visitor count.

## Explicitly deferred — reasoned out, not credential-blocked

Per ADR 0021:

- **Daily pre-aggregated rollup tables.** The master plan asks for them
  "to keep the reports fast," but this is a live-but-not-yet-selling
  site with a `TrackingEvent` table in the low thousands of rows — a
  live query over the current (or a 10x larger) volume isn't slow
  enough to justify a rollup table, its migration, and a cron job to
  keep it in sync. The Analytics queries read live data directly; real
  traffic volume making them measurably slow is the trigger to revisit
  this, not a guess made now.
- **Full GA4 e-commerce event schema** (`items: [...]` arrays on every
  event) — GA4 already receives and counts every tracked event; this
  would touch 5 call sites for richer reporting fields, not fix
  anything broken.
- **"GTM or direct GA4, chosen in admin"** — already true in effect: an
  admin fills in whichever ID(s) they want, independently.

## Real bugs found and fixed this phase

1. **`dashboard.ts`'s purchase-events metric, broken since it was
   written** (see "What was built" #1) — found by checking the literal
   string against `TrackName`'s real values, not by this phase's own
   "build analytics" framing.
2. Everything else under "What was built" #2-#3 are gaps (missing
   data), not logic bugs — listed above, not repeated here.

## Test matrix and results

| Check                                                                            | Result                                                                                                                                                         |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                                                                        | ✅ pass                                                                                                                                                        |
| Lint                                                                             | ✅ pass                                                                                                                                                        |
| Unit tests                                                                       | ✅ 298/298 pass (36 files; +21 from Phase 9's 277 — consent-value parsing for every legacy/new shape, and the analytics module's 5 pure aggregation functions) |
| Integration tests                                                                | ✅ 33/33 pass (9 files; +2 — `countActiveVisitors` window boundary, `loadAnalytics`'s real Prisma relation queries against fixture order/search/view data)     |
| E2E critical path (desktop + mobile)                                             | ✅ both pass                                                                                                                                                   |
| Manual: cookie banner "Customize" saves the exact `{analytics, marketing}` shape | ✅ confirmed via a Playwright check reading `localStorage` directly                                                                                            |
| Manual: "Accept all" still lets a real `PageView` reach `/api/v1/tracking`       | ✅ confirmed via a route-intercepting Playwright check                                                                                                         |
| Manual: Admin → Analytics renders all 6 sections for a real staff session        | ✅ confirmed                                                                                                                                                   |
| a11y (axe, desktop): home/shop/product/login/cart/design-system                  | ✅ 6/6 pass                                                                                                                                                    |
| Parity (settings/menus/products/theme/checkout/social/system/tracking)           | ✅ 8/8 pass — including the one test that exercises GA4 + consent directly, confirming the categorized-consent rewrite didn't break it                         |
| Visual snapshots                                                                 | ✅ 2/2 pass                                                                                                                                                    |
| Lighthouse                                                                       | ✅ performance/a11y/best-practices pass their `error` thresholds on all 4 URLs; `/checkout`'s SEO score stays the documented, by-design `warn` exception       |

One test-environment artifact during this phase's QA, not a regression,
same class already documented for Phases 7-9: this session's own
repeated local admin logins tripped the in-memory login rate limiter
mid-parity-run; resolved by restarting the test server process (which
holds that limiter's state), not an application change.

## Known limitations

- **Real-time visitor count has no real traffic to show** — this
  environment is a demo/test site with no live visitors; the feature
  itself works (confirmed via the integration test and a live manual
  page view), but there's nothing meaningful to watch here. Same
  category as Phase 9's "no real Meta credentials to test CAPI live."
- **Product performance only reports products that have at least one
  tracked view/cart/purchase in the 30-day window** — a product with
  zero activity simply doesn't appear, rather than appearing with all
  zeros. Reasonable default; revisit if an admin wants to see "dead"
  products specifically.
- **Sources/UTM reporting is revenue-attribution (from `Order`), not
  raw traffic-level UTM distribution** — a deliberate choice (see ADR
  0021): `PageView`'s own UTM data undercounts multi-page sessions
  structurally, while `Order.utmSource` is the business-meaningful,
  reliable signal.

## Deploy notes

- **No new migration** — no new tables or columns; the only schema-
  adjacent change is semantic (what `PageView`'s payload contains).
- **No new required env vars.**
- **No new cron job.**
- **Action needed from the human**: none to merge this phase.

## Summary

Phase 10 (Analytics module): fixed a silently-broken existing dashboard
metric found by tracing the literal event-name string rather than
trusting the master plan's "build analytics" framing of this phase;
closed the consent-categories and Google Consent Mode v2 gap the master
plan names explicitly (previously zero code existed for either); added
a Google Ads conversion event, a real-time-visitor signal, and a new
first-party Admin Analytics section covering traffic, sources, funnel,
product performance, and search terms. Pre-aggregated rollup tables and
the full GA4 e-commerce item schema stay explicitly deferred as
premature for this site's current data volume, not credential-blocked.

`npm run verify` green (typecheck, lint, 298/298 unit), 33/33 integration
tests, E2E critical path clean (desktop + mobile), a11y 6/6, parity 8/8,
visual 2/2, Lighthouse green on its `error`-level thresholds. Full test
matrix and known limitations above.

Per the standing no-per-phase-PR workflow (2026-10-23): branch pushed, no
PR opened, proceeding straight into Phase 11 (SEO module).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
