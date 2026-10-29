# 0020: Phase 9 scope — Facebook/Meta module

## Context

The master plan's Phase 9 bullet list (`UNIBAAZAR_V2_MASTER_PLAN.md`, "Phase
9: Facebook/Meta module") reads like a from-scratch build: Pixel + CAPI with
dedup, `fbp`/`fbc` capture, hashed user data, a test-event-code field, retry
with an event log, the full 9-event set, a catalog feed, Messenger/WhatsApp
chat, Facebook login, optional auto-posting, and an admin Meta section with
a setup checklist/health status/dedup status/feed status.

A survey (same discipline as ADRs 0016–0019) of the real codebase before
writing any code found most of this already exists, built incrementally
across earlier phases under `src/lib/tracking/`, `src/server/tracking/`, and
`src/components/store/tracking/` — not as a dedicated `integrations/meta`
module yet (that reorganization is Phase 3's deferred-to-later-use decision,
ADR 0010, applying here too), but functionally present:

- **Pixel**: `src/components/store/tracking/StorePixels.tsx` loads
  `fbevents.js` consent-gated, inits with the admin-configured pixel ID.
- **CAPI for Purchase**: `src/server/tracking/signals.ts`'s
  `signalPurchase()` POSTs to `graph.facebook.com`, with SHA-256 hashed
  phone/email, a shared `event_id` (the order number) matching the
  browser-side `fbq("track", "Purchase", ..., { eventID })` call for
  dedup, and an optional `test_event_code` field already wired into Admin →
  Settings → Tracking.
- **The 9-ish event set**: `trackNames` in both
  `src/lib/tracking/browser.ts` (client) and `src/server/tracking/signals.ts`
  (server) already covers PageView, ViewContent, AddToCart,
  InitiateCheckout, AddPaymentInfo, Purchase, Search, CompleteRegistration,
  Lead — fired from `useAddToCart`, `TrackOnce`, `CheckoutForm`,
  `lib/tracking/events.ts`, `AuthForms`, and `ChatButtons` respectively.
- **Catalog feed**: `src/server/tracking/feed.ts`'s `facebookFeedXml()`
  (shared generator with `googleFeedCsv()`, matching the master plan's own
  note that the Meta and Merchant Center feeds share one generator),
  served live at `/feeds/facebook`.
- **Messenger/WhatsApp chat buttons**: `src/components/store/layout/
ChatButtons.tsx`, firing a `Lead` event on click.
- **Facebook login**: `src/app/api/v1/auth/oauth/facebook/*` — a working
  OAuth provider, from earlier auth work.
- **Admin Meta section**: `/admin/tracking` already has pixel ID/test
  code/CAPI token fields, feed links, and a "Recent events" list.

## Real gaps found (the actual scope of this phase)

1. **`Purchase` fires at order creation for every payment method,
   including gateway methods where payment is still `PENDING`.**
   `src/server/orders/orders.ts`'s `placeOrder()` calls `signalPurchase()`
   unconditionally right after the order row is created, regardless of
   `paymentMethod`. The master plan is explicit: "Purchase (sent
   server-side on confirmed payment **or** COD order creation)" — the two
   are meant to be alternatives per payment method, not the same trigger
   for both. As shipped, an SSLCommerz/bKash/etc. order that's abandoned
   or declined at the gateway still reports a completed Purchase
   conversion to Meta (and TikTok) — corrupting the ROAS/CPA numbers an
   advertiser would use to decide ad spend. This is the correctness-
   critical bug this phase exists to fix, in the same "found by tracing
   real call sites, not by the plan's own framing" way Phase 8 found the
   OTP-delivery bug.
2. **Zero `fbp`/`fbc` capture anywhere in the codebase.** The master plan
   names this explicitly; it's a real (if less severe) gap — without it,
   CAPI's server-side `Purchase` event has a materially worse match
   quality with Meta's identity graph than the browser Pixel event it's
   meant to deduplicate against and reinforce.
3. **`AddToWishlist` doesn't exist as an event anywhere** — not in either
   `trackNames` list, not fired from the one wishlist-toggle call site.
   Explicitly named in the master plan's event list.
4. **No retry, no failure log, for CAPI sends.** `signalPurchase()`'s
   Meta/TikTok `fetch()` calls end in `.catch(() => undefined)` — a
   misconfigured token, an expired one, or a transient Graph API outage
   fails silently with no record and no retry, directly contradicting the
   master plan's explicit "retry with an event log."
5. **Admin "Recent events" has no status/dedup indicator** — it lists
   `TrackingEvent` rows (browser- and server-sourced) but nothing shows
   whether a server-side send actually succeeded, which the retry-log work
   above naturally produces data for.

## In scope this phase

Per the above, in priority order (money/data-integrity first):

1. Fix the Purchase-fires-before-payment-confirmed bug: fire at order
   creation only for COD; for every other payment method, fire from the
   one place a payment is governed into `PAID`
   (`modules/payments`' `transitionPayment`'s two real call sites —
   `applyPaymentResult` in `src/server/payments/payments.ts` and
   `setPaymentStatus` in `src/server/admin/orders-admin.ts`), via one
   shared helper so the logic isn't duplicated at each site.
2. `fbp`/`fbc` capture: read the cookies the Pixel script itself already
   sets (`_fbp` always, `_fbc` when a `fbclid` is present), carry them
   through order placement the same way `utmSource`/etc. already flow
   (new `Order.fbp`/`Order.fbc` columns, same style as the existing utm
   columns), and include them in the CAPI payload's `user_data`.
3. Add `AddToWishlist` to both event lists and fire it from
   `ProductPurchase.tsx`'s wishlist-toggle button on the add transition
   only (not remove).
4. New `ConversionApiLog` table + a retry job (same shape as Phase 7's
   payment reconciliation / Phase 8's abandoned-cart sweep): every CAPI
   send attempt is logged with status; a daily cron + Maintenance-board
   job retries sends still marked `failed`, capped at 5 attempts.
5. Surface that log's status in the admin tracking page's "Recent events"
   list (a status column), satisfying the "dedup status"/visibility part
   of the master plan's admin-section ask without building a separate
   "setup checklist" widget this environment has nothing real to check
   against (see "Deferred" below).

## Explicitly deferred — blocked on credentials or genuinely out of scope

Per CLAUDE.md's stop-and-ask condition 4 and the established pattern from
ADRs 0018/0019:

- **Live verification against Meta's Test Events tool** — this
  environment's `metaPixelId`/CAPI token are both empty (no real Meta
  Business/Events Manager account). The master plan's own "Done when"
  for this phase ("Test Events confirms browser and server events arrive
  and dedupe correctly") is literally unverifiable without one. The
  `event_id`-matched dedup logic itself is real and was already correct
  before this phase (Purchase); this phase adds a second, independently
  real event (`AddToWishlist`) and fixes the Purchase-timing bug, but
  none of it can be confirmed against Meta's own servers here.
- **A "setup checklist" admin widget** — with no real credentials to
  check configuration against in this environment, a checklist would
  only ever show "not configured," which the existing form already
  communicates by being empty. Revisit once real credentials exist.
- **Auto-posting new products to the Facebook Page** — needs Graph API
  Page-publish permissions and a connected Page this environment doesn't
  have.
- **Per-product catalog-feed include/exclude toggle** — a real gap
  against the master plan's wording, but a nice-to-have admin UX item,
  not a correctness bug; the current "every `PUBLISHED` product" default
  is a safe, sane default. Deferred in favor of the money-critical items
  above; cheap to add later (one boolean column + one feed-query filter)
  if a human asks for it.
- **CAPI expansion beyond `Purchase`** — the master plan's own wording
  only calls out server-side sending explicitly for `Purchase` ("sent
  server-side on confirmed payment or COD order creation"); the other 8
  events stay Pixel/GA4/TikTok-pixel-only, as already built. Expanding
  CAPI to all 9 would be scope creep past what's actually written, not a
  gap against it.

## Consequences

- `Order` gains two more marketing-attribution columns (`fbp`, `fbc`),
  following the exact precedent its five `utm*` columns already set.
- A new `ConversionApiLog` table and retry cron add one more recurring
  job to `DEPLOYMENT.md`'s list, same shape as Phase 7/8's.
- The Purchase-timing fix changes real behavior: a human reviewing past
  Meta/TikTok ad reporting from before this phase should treat any
  gateway-order Purchase conversions recorded before today with
  suspicion — some fraction of them were sent for orders never actually
  paid for. This isn't data this codebase can retroactively correct (no
  record of which specific CAPI sends corresponded to never-paid orders
  without re-deriving it from `TrackingEvent` + `Payment` join, which is
  out of scope here) — noted for the human, not silently fixed.
