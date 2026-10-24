# 0021: Phase 10 scope — Analytics module

## Context

The master plan's Phase 10 bullet list asks for: a consent manager with
categories feeding Google Consent Mode v2 and the Meta/TikTok pixels;
GA4/GTM with the full e-commerce event set, Google Ads conversions,
TikTok Pixel, and Clarity, each toggleable; first-party analytics (a
privacy-friendly event table with UTM/referrer attribution); an Admin
Analytics section (traffic, sources/UTM, conversion funnel, product
performance, search terms including zero-result, abandoned carts,
real-time visitors); and daily rollups to keep reports fast.

A survey (same discipline as ADRs 0016–0020) found a large amount of the
groundwork already built, mostly from Phase 9's own work plus earlier
phases:

- **Pixel loading + consent gate**: `StorePixels.tsx` already loads
  GTM/GA4/TikTok/Pinterest/Snap/Clarity/Hotjar, consent-gated via
  `hasTrackingConsent()` (`localStorage["unibaazar:cookie"]`).
- **The event pipeline**: `lib/tracking/browser.ts`'s `track()` already
  fans every event out to `dataLayer`/`fbq`/`gtag`/`ttq`, logs to
  `TrackingEvent` via `/api/v1/tracking`, and is already fired from
  `useAddToCart`, `TrackOnce` (ViewContent, InitiateCheckout, Search),
  `CheckoutForm` (AddPaymentInfo), `lib/tracking/events.ts` (Purchase),
  `AuthForms` (CompleteRegistration), `ChatButtons` (Lead), and (Phase 9)
  `ProductPurchase` (AddToWishlist).
- **UTM attribution**: `lib/tracking/utm.ts` captures UTM params into
  `localStorage` (last-touch), carried into `Order.utmSource`/etc. at
  checkout — the real, revenue-attributable version of "sources/UTM."
- **Abandoned carts**: already a full admin page (Phase 6,
  `/admin/orders/abandoned`) — Phase 10's bullet names it, but it's not
  a gap to rebuild.

## Real gaps found (the actual scope of this phase)

1. **`dashboard.ts`'s own "purchase events this week" metric is
   silently broken** — `prisma.trackingEvent.count({ where: { name:
"purchase", ... } })` queries the lowercase string `"purchase"`, but
   every `Purchase` event is recorded with the capitalized `TrackName`
   `"Purchase"` — the query matches nothing, every single time, and has
   silently shown `0` since whichever phase wrote it. Found by tracing
   the literal string against `TrackName`'s real values, not by this
   phase's own "build analytics" framing.
2. **The `Search` event never carries a result count** — the one call
   site (`search/page.tsx`'s `<TrackOnce name="Search" payload={{ query:
query.q }} />`) logs the query text but not whether it matched
   anything, so a "zero-result searches" report (explicitly named in the
   master plan) has nothing to group by.
3. **`PageView`'s payload only carries UTM params literally present in
   the current page's URL**, not the persisted last-touch attribution
   `lib/tracking/utm.ts` already tracks — so only the single page a
   visitor lands on with `?utm_source=...` in it is attributable; every
   later page view in the same session isn't, undercounting
   traffic-level source/medium reporting.
4. **No cookie-consent categories, no Google Consent Mode v2** — the
   existing banner is a flat accept/reject with no "necessary/
   analytics/marketing" split, and nothing calls `gtag("consent",
"default"/"update", ...)` anywhere. Both explicitly named in the
   master plan; neither exists at all.
5. **No Google Ads conversion event** — `adsId`/`adsLabel` are already
   admin-configurable and `gtag("config", adsId)` already fires, but
   nothing ever fires the distinct `gtag("event", "conversion", {
send_to: ... })` call Google Ads conversion tracking actually needs;
   GA4's own `purchase` event (which does fire) is a different signal
   Ads doesn't read for conversion attribution.
6. **No real-time-visitor signal at all** — `TrackingEvent` carries no
   visitor/session identifier, so there's no way to count distinct
   active visitors even though `PageView` already fires on every
   navigation.
7. **No Admin Analytics section exists** — zero files under
   `/admin/analytics` or equivalent. This is the master plan's main
   "build this" ask for the phase, not a gap-fill.

## In scope this phase

1. Fix the `dashboard.ts` string-casing bug (`"purchase"` →
   `"Purchase"`).
2. Add `resultCount` to `Search`'s payload (the search page already
   knows `results.length`).
3. Add a lightweight, non-`httpOnly` `ub_visitor` cookie (client-set,
   analytics-only, distinct from `guard.ts`'s write-rate-limiting
   `ub_device`) and always merge the persisted UTM set into `PageView`'s
   payload — both small, same-file changes to `StorePixels.tsx`.
4. Categorized consent: necessary (always on) / analytics / marketing,
   replacing the binary banner; `hasTrackingConsent()` becomes
   category-aware. Wire Google Consent Mode v2 (`gtag("consent",
"default", ...)` before any GTM/GA4 script loads, `"update"` on a
   category change) — the master plan's most explicitly-named,
   zero-existing-code item.
5. Fire a Google Ads conversion event on `Purchase` when `adsId`/
   `adsLabel` are both configured.
6. New Admin Analytics section (`reportsAccess()`-gated, same permission
   the existing Reports page uses — same audience): traffic (page views
   over time, top paths), sources/UTM (orders + revenue by UTM source,
   from `Order`'s own columns — the attributable version), conversion
   funnel (ViewContent → AddToCart → InitiateCheckout → Purchase counts
   over a window), product performance (views/carts/purchases per
   product, joined on the `slug`/`sku` every relevant event already
   carries), search terms (top queries, zero-result queries), and
   real-time visitors (distinct `ub_visitor` values seen in the last 5
   minutes, polled).

## Explicitly deferred — reasoned out, not credential-blocked this time

- **Daily pre-aggregated rollup tables.** The master plan asks for them
  "to keep the reports fast," but this is a live-but-not-yet-selling
  site (per `CLAUDE.md`) with a `TrackingEvent` table in the low
  thousands of rows at most — a live aggregation query over the current
  (or even a 10x larger) volume is not slow enough to justify the
  premature-optimization cost of a rollup table, its own migration, and
  a cron job to keep it in sync, per `CLAUDE.md`'s "don't design for
  hypothetical future requirements." The analytics queries built this
  phase are written to read live data directly; if real traffic ever
  makes them measurably slow, that's the trigger to revisit this, not a
  guess made now.
- **Full GA4 e-commerce event schema** (`items: [{item_id, item_name,
price, quantity, ...}]` on every event). GA4 already receives every
  tracked event via `gtag("event", ga4Names[name], payload)` and counts
  them; deepening every call site's payload to the full item-array
  shape touches `useAddToCart`, `CheckoutForm`, `ProductPurchase`,
  `TrackOnce`, and `lib/tracking/events.ts`, each needing product/
  variant/price context threaded through that isn't uniformly available
  at every call site today. Real gap, but a large, diffuse one for
  incremental reporting-richness gain — not done this phase.
- **"GTM or direct GA4, chosen in admin"** — already effectively true:
  an admin fills in a GTM ID, a GA4 ID, both, or neither, and
  `StorePixels.tsx` loads whichever IDs are set independently. There's
  no actual "choice" UI because none is needed — setting one and
  leaving the other blank already is the choice.

## Consequences

- `StorePixels.tsx`'s consent model changes from a single accept/reject
  flag to three categories — any other code reading the old
  `unibaazar:cookie` value directly (not just through
  `hasTrackingConsent()`) would break; a search before implementing
  confirmed `hasTrackingConsent()` is the only reader outside the
  banner itself.
- The new Admin Analytics section reads `TrackingEvent` and `Order`
  directly with no new tables beyond what's needed for the real-time-
  visitor cookie (none — it's a client cookie, not a DB row). No schema
  migration needed for the reporting side; the only schema-adjacent
  change is semantic (what `PageView`'s payload now contains).
