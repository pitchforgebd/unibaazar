# Phase 9 QA report: Facebook/Meta module

Branch: `v2/phase-09-facebook-meta`. Date: 2026-10-24.

## What was built

Per ADR 0020 (survey found most of the master plan's Facebook/Meta
wishlist already built across earlier phases — Pixel, CAPI for
`Purchase`, the full event set, a catalog feed, Messenger/WhatsApp chat,
Facebook login, an admin tracking page — the real scope was fixing one
money-critical bug and closing several specific, named gaps):

1. **Fixed a real correctness bug: `Purchase` fired before a gateway
   payment was actually confirmed.** `placeOrder()` called
   `signalPurchase()` unconditionally for every payment method right
   after order creation — meaning an SSLCommerz/bKash/etc. order
   abandoned or declined at the gateway still reported a completed
   `Purchase` conversion to Meta and TikTok, corrupting the ROAS/CPA
   numbers an advertiser would use to decide ad spend. Now: COD still
   fires at creation (the order _is_ the commitment there), every other
   method fires via a new `signalPurchaseOnConfirmedPayment()` helper
   called once the payment is actually governed into `PAID`
   (`applyPaymentResult` in `src/server/payments/payments.ts`'s IPN/
   callback path, and `setPaymentStatus`'s admin manual override in
   `src/server/admin/orders-admin.ts`).
2. **`fbp`/`fbc` capture.** Zero capture existed anywhere before this
   phase. `src/lib/tracking/fbclid.ts` reads the cookies the Pixel
   script itself already sets, carried through checkout the same way
   `utmSource`/etc. already flow (new `Order.fbp`/`Order.fbc` columns),
   included in the CAPI payload's `user_data` — improving `Purchase`'s
   match quality against the browser Pixel event it's meant to
   reinforce.
3. **`AddToWishlist` event** — named explicitly in the master plan's
   event list but missing from all three places an event name lives
   (client `trackNames`, server `trackNames`, the `/api/v1/tracking`
   validation schema). Added to all three plus a new unit test
   (`signals.test.ts`) asserting they stay in sync, and wired into
   `ProductPurchase.tsx`'s wishlist-toggle button on the add transition
   only.
4. **CAPI retry with an event log** — explicitly named in the master
   plan ("retry with an event log"), previously nonexistent: every send
   ended in `.catch(() => undefined)`, so a bad token or a transient
   outage failed silently with no record. New `ConversionApiLog` table
   logs every attempt; a daily cron (`POST /api/v1/cron/retry-
conversions`) + Maintenance-board job retries anything still `failed`,
   capped at 5 attempts each.
5. **Admin visibility** — Admin → Tracking's "Recent events" list gets a
   sibling "Conversions API sends" section showing each send's
   provider/event/status/attempts/error, satisfying the master plan's
   "dedup status"/health-visibility ask without a separate "setup
   checklist" widget (see "Deferred" below for why).

## A second real bug, found incidentally while in this code

`src/store/lists.ts`'s wishlist store shipped with a hardcoded default —
`slugs: ["redmi-buds-4"]` — meaning every visitor, on every fresh page
load, saw that one product as already wishlisted, with no way they
could have put it there. Fixed to an empty default while wiring
`AddToWishlist` tracking into the same button this bug lived behind.

## Explicitly deferred — blocked on credentials or genuinely out of scope

Per ADR 0020 and CLAUDE.md's stop-and-ask condition 4:

- **Live verification against Meta's Test Events tool** — this
  environment's `metaPixelId`/CAPI token are both empty (no real Meta
  Business account). The master plan's own "Done when" for this phase
  is literally unverifiable without one.
- **A "setup checklist" admin widget** — would only ever show "not
  configured" here, which the empty settings form already communicates.
- **Auto-posting new products to the Facebook Page** — needs Graph API
  Page-publish permissions this environment doesn't have.
- **Per-product catalog-feed include/exclude** — a real gap against the
  plan's wording, but admin-UX, not correctness; the current "every
  `PUBLISHED` product" default is safe. Cheap to add later.
- **Expanding CAPI beyond `Purchase`** — the master plan's own wording
  only calls out server-side sending explicitly for `Purchase`; the
  other 8 events staying Pixel/GA4/TikTok-pixel-only (as already built)
  is not a gap against what's actually written.

## Real bugs found and fixed this phase

1. **`Purchase` fired before payment confirmation for gateway orders**
   (see "What was built" #1) — the correctness-critical fix this phase
   exists for.
2. **Wishlist store's hardcoded demo default** pre-wishlisted a product
   for every visitor (see above).
3. **Stale test-DB `theme.primary` values** (`#9e9b20`, then `#7fe126`)
   left over from this session's own repeated parity-suite runs failed
   AA contrast on every key page's a11y check, 5/5, reproduced and
   resolved the same way as Phase 8's identical finding — a test-data-
   hygiene reset, not an application bug. Confirmed, not assumed, by
   reading the actual saved `Setting` row before resetting it.
4. **A stale on-disk `.next` build cache** caused the "products parity:
   a quick-edited price shows up on the product page" test to show a
   price from an earlier, unrelated test run instead of the one just
   saved — reproduced 3/3 with the accumulated cache from this session's
   many repeated `build:test` runs across phases 5-9 today, 0/3 after
   `rm -rf .next && npm run build:test`. Confirmed via a direct DB read
   showing the correct new price was saved while the page rendered an
   old one — a build artifact from this long session, not a Phase 9
   regression (nothing in this phase's diff touches catalog pricing,
   quick-edit, or cache revalidation).
5. **This session's own per-IP order-fraud guard and login rate
   limiter** tripped again mid-QA (`>=5` same-day orders from
   `127.0.0.1`; `8` logins/15min) — same documented environmental class
   as Phase 7/8, confirmed via direct DB/code inspection each time,
   resolved by clearing that day's test-only orders and restarting the
   test server process (which holds the rate limiter's in-memory state).

## Test matrix and results

| Check                                                                      | Result                                                                                                                                                        |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                                                                  | ✅ pass                                                                                                                                                       |
| Lint                                                                       | ✅ pass                                                                                                                                                       |
| Unit tests                                                                 | ✅ 277/277 pass (34 files; +9 from Phase 8's 268 — fbp/fbc cookie parsing, event-name-list sync across client/server/schema)                                  |
| Integration tests                                                          | ✅ 31/31 pass (8 files; +3 — CAPI retry: fixes a failing send, leaves a still-failing one failed with incremented attempts, skips a row past the attempt cap) |
| E2E critical path (desktop + mobile)                                       | ✅ both pass — COD checkout unaffected                                                                                                                        |
| Manual: `AddToWishlist` fires via `/api/v1/tracking` on the add transition | ✅ confirmed via a route-intercepting Playwright check                                                                                                        |
| Manual: Admin → Tracking renders the new "Conversions API sends" section   | ✅ confirmed                                                                                                                                                  |
| a11y (axe, desktop): home/shop/product/login/cart/design-system            | ✅ 6/6 pass (after resetting stale test-DB theme colors — see "Real bugs found" #3, unrelated to this phase's code)                                           |
| Parity (settings/menus/products/theme/checkout/social/system/tracking)     | ✅ 8/8 pass (after clearing a stale `.next` build cache — see #4, unrelated to this phase's code)                                                             |
| Visual snapshots                                                           | ✅ 2/2 pass                                                                                                                                                   |
| Lighthouse                                                                 | ✅ performance/a11y/best-practices pass their `error` thresholds on all 4 URLs; `/checkout`'s SEO score stays the documented, by-design `warn` exception      |

## Known limitations

- **No cart-recovery-style magic link for anything in this phase** — not
  applicable here (that's Phase 8's abandoned-cart item); noted only
  because the catalog feed's "per-product include/exclude" and the
  "setup checklist" widget share the same "cheap to add once there's a
  real reason to" status.
- **Steadfast/BulkSMSBD-style "sourced from third-party docs" caveat
  doesn't apply here** — Meta's and TikTok's Graph/Events APIs used in
  this phase are both against their official, published API docs.
- **CAPI retry re-derives the access token at retry time** rather than
  storing it — correct (a rotated token should be picked up), but means
  a retry's failure reason can shift from "HTTP 401" to a different
  error if the admin changes settings between the original failure and
  the retry; this is expected behavior, not a bug.

## Deploy notes

- **New migration** (already applied, `20261024030000_meta_conversions`):
  `Order.fbp`/`Order.fbc` columns, new `ConversionApiLog` table.
- **No new required env vars.**
- **New cron job**: `POST /api/v1/cron/retry-conversions`, daily at 4am —
  added to `DEPLOYMENT.md`'s cron list.
- **Action needed from the human**: none to merge this phase. If real
  Meta/TikTok credentials are supplied later, Admin → Tracking's
  existing form is the intended path — no further code changes should
  be needed. Anyone reviewing past Meta/TikTok ad reporting from before
  this phase merged should treat gateway-order `Purchase` conversions
  with suspicion — some fraction were sent for orders never actually
  paid for (see ADR 0020's "Consequences"); this isn't data the codebase
  can retroactively correct.

## Summary

Phase 9 (Facebook/Meta module): fixed a real, money-affecting bug
(`Purchase` reporting unpaid gateway orders as completed conversions)
found by tracing the actual call path rather than trusting the master
plan's framing of this phase as a from-scratch build; added the missing
`fbp`/`fbc` capture and `AddToWishlist` event the plan names explicitly;
added CAPI send logging and retry where there was previously silent
failure; and fixed an unrelated but real wishlist-store bug found along
the way. Live verification against Meta's own Test Events tool stays
explicitly deferred — this environment has no real Meta Business
account to verify against.

`npm run verify` green (typecheck, lint, 277/277 unit), 31/31 integration
tests, E2E critical path clean (desktop + mobile), a11y 6/6, parity 8/8,
visual 2/2, Lighthouse green on its `error`-level thresholds. Full test
matrix and known limitations above.

Per the standing no-per-phase-PR workflow (2026-10-23): branch pushed, no
PR opened, proceeding straight into Phase 10 (Analytics module).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
