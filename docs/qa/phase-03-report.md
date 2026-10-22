# Phase 3 QA report: Commerce core

Branch: `v2/phase-03-commerce-core`. Date: 2026-10-22.

## Scope decision, agreed with the project owner mid-phase

Phase 3 is the largest phase in the master plan — an integer-poisha money
engine, promotion stacking, inventory reservations with concurrency
guarantees, a full order state machine, fraud scoring, CSV import/export,
and PDF invoices. Done to the letter of §5.1–§5.4, this is realistically
several sessions of work on the financial core of a live site. Asked how
to balance the project owner's instruction to move quickly through the
remaining phases against that size, they chose: build the money/
inventory/order _correctness_ core fully and correctly, to the master
plan's own explicit bar, and defer the more mechanical, lower-stakes
pieces to a follow-up pass rather than rush them.

**What that means concretely** — see
`docs/decisions/0012-phase-3-scope-core-correctness-first.md` for the full
list and reasoning: this phase delivers §5.1 (pricing), §5.3 (inventory),
and §5.4's order state machine in full, to the plan's own test-coverage
bar. It explicitly defers: CSV/XLSX product import/export, PDF invoices/
packing slips/labels, the fraud-score admin UI, attribute-sets-per-
category, bundle/digital product types, and decimal (fractional) product
quantities. None of these deferred items carry money or stock correctness
risk on their own — they're catalog/admin-UI breadth, not the part of the
spec this phase was scoped to harden.

## What was built

1. **`src/modules/pricing/`** — `money.ts`'s integer-poisha type (no
   floating-point arithmetic anywhere in a money calculation);
   `quote.ts`'s pure `computeQuote()` as the single source of truth for
   price/discount/delivery/total; `promotions.ts`'s `applyCoupon()`
   (every eligibility rule — active flag, date window, global/per-user
   usage limits, product/category scope, minimum subtotal — as one pure,
   directly-testable function); `delivery.ts`. **Fixes a real bug**: the
   Phase 0 audit's delivery-charge duplication finding — checkout used to
   read admin-set `Setting` rows for delivery charges while the client-
   side cart preview hardcoded 70/130/6500 and could silently disagree.
   Both now call the same function with the same settings.
2. **`src/modules/inventory/`** — `reserveStock()`/`commitStock()` hold
   stock between a cart quote and order placement (new
   `StockReservation` model), so two concurrent checkouts for the last
   unit can't both see "in stock." `incrementFlashSold()` closes a real,
   previously-unguarded oversell race on flash-sale quantity limits (the
   old check was a non-transactional `COUNT(OrderItem)` query with no
   lock).
3. **`src/modules/orders/`** — an explicit order-status transition graph.
   Before this, `setOrderStatus()` had zero transition-legality checks —
   a `DELIVERED` order could be set straight back to `PENDING` with
   nothing stopping it. `transitionOrder()` is now the one function
   allowed to change `Order.status`, wired into every call site: admin
   actions, the SSLCommerz IPN handler, courier booking/sync, the
   Steadfast webhook, the `cancel-unpaid-orders` cron, and the customer-
   facing cancel/return actions.
4. **Wiring into the live site**: `src/server/checkout/quote.ts`
   rewritten as a thin orchestrator over the three modules above;
   `src/server/orders/orders.ts`'s `placeOrder()` uses `commitStock()` +
   `incrementFlashSold()` instead of the old `takeStock()`;
   `src/store/cart.ts` mints a per-cart `reservationToken`; the checkout
   page (`useCheckoutQuote`) now fetches its displayed total from the
   live quote endpoint instead of computing it client-side — the actual
   customer-facing fix for the delivery-charge bug above (the checkout
   page could show a total that didn't match what the order was then
   charged).
5. **ADRs 0012** (scope) **and 0013** (the transition graph's design —
   why it allows forward skips across the pre-shipment pipeline but never
   backward movement or an exit from a terminal status, discovered to be
   necessary while wiring in real courier-automation call sites).

## Test matrix and results

| Check                                                 | Result                                                                                                                                                                                                                                                               |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                                             | ✅ pass                                                                                                                                                                                                                                                              |
| Lint                                                  | ✅ pass                                                                                                                                                                                                                                                              |
| Unit tests                                            | ✅ 108/108 pass (10 files; 51 of these are new — money/quote/delivery/promotions property + unit tests, the exhaustive order state-machine suite)                                                                                                                    |
| Integration tests                                     | ✅ 15/15 pass (5 files; 12 of these are new — the inventory reservation/flash-sold concurrency tests and the order-transition DB tests)                                                                                                                              |
| **`src/modules/pricing` branch coverage**             | ✅ **98.85%** — clears the master plan's explicit "at least 95%" bar (money.ts/promotions.ts/delivery.ts/quote.ts all individually at 100%; the aggregate is pulled down only by two files with zero actual branches — a type-only file and a pure re-export barrel) |
| **Concurrency: no oversell under parallel checkouts** | ✅ 8 parallel `reserveStock`/`commitStock` calls at stock=1 → exactly 1 succeeds, 7 get a clean `StockUnavailableError` (run against the real test database, not mocked)                                                                                             |
| **Concurrency: flash-sale qty-limit race**            | ✅ 8 parallel `incrementFlashSold` calls at qtyLimit=1 → exactly 1 succeeds                                                                                                                                                                                          |
| **Order transitions: every (from, to) pair tested**   | ✅ exhaustive 15×15 matrix test plus named regression tests for the exact illegal transitions found permitted pre-Phase-3 (`DELIVERED→PENDING`, `CANCELLED→CONFIRMED`, etc.) and the new forward-skip allowances                                                     |
| E2E critical path (desktop + mobile)                  | ✅ browse → cart → checkout (COD) → admin sees the order — run against the _rewired_ checkout/order code, not the pre-Phase-3 path                                                                                                                                   |
| a11y (axe, desktop)                                   | ✅ 5/5 pass                                                                                                                                                                                                                                                          |
| Parity (settings/menus/products)                      | ✅ 3/3 pass                                                                                                                                                                                                                                                          |
| Lighthouse                                            | ⚠️ same pre-existing, non-regressing `/checkout` SEO warning as Phase 2's report (deliberately `robots.txt`-disallowed page) — unrelated to this phase                                                                                                               |

## Known limitations

- **Everything explicitly deferred in ADR 0012** — CSV import/export, PDF
  invoices/labels, the fraud-score UI, attribute-sets-per-category,
  bundle/digital product types, decimal quantities. Not bugs; scoped out
  up front and corrected once mid-phase (bundle was wrongly marked
  in-scope in the ADR's first draft — the schema only has
  `SIMPLE`/`VARIABLE` today; fixed before this report was written).
- **`codCharge` and `vat` are modeled on the `Quote` type but always
  zero** — see ADR 0012's addendum. VAT especially is a deliberate,
  pre-existing reporting-only figure; turning it into a real charge is a
  live pricing-behavior decision, not something to flip while refactoring
  the engine underneath it.
- **The reservation layer's expiry sweep is lazy, not scheduled.** An
  expired `StockReservation` is reconciled back into stock the next time
  _that same variant_ is touched by `reserveStock`, not by a timer. For a
  variant nobody attempts to buy again soon, its held stock stays
  decremented until that next attempt. Correctness is unaffected (no
  buyer is ever permanently locked out — the next attempt on that SKU
  always reconciles first), but the admin-visible stock count for an idle
  variant could lag reality by up to the reservation TTL. A scheduled
  sweep (mirroring the existing `low-stock-sweep` cron pattern) would
  close this; not added this phase since it's a freshness nicety, not a
  correctness gap.
- **No new E2E test specifically exercises coupon/flash-sale paths or the
  reservation hold under real browser concurrency** — the critical-path
  E2E test covers the COD happy path (which now runs through every
  rewired module), and the module-level integration tests cover
  concurrency directly against the database, which is where the actual
  guarantee lives. A dedicated E2E for "apply a coupon, see the live
  quote update" would be a reasonable Phase 5 (storefront rebuild)
  addition once the checkout UI itself is rebuilt.

## Manual QA

- Read through every status-changing call site found during research
  (admin single/bulk status actions, the SSLCommerz IPN handler, courier
  booking/sync, the Steadfast webhook, the `cancel-unpaid-orders` cron,
  customer-facing cancel/return) and confirmed each now goes through
  `setOrderStatus()`/`transitionOrder()` rather than writing
  `Order.status` directly.
- Manually traced the checkout page's data flow after the live-quote
  rewire: `useCheckoutQuote` fetches both delivery areas on every
  lines/coupon/area change, only the _selected_ area's request carries
  the reservation token (so switching area to compare prices doesn't
  churn the actual hold), and the submit button is disabled while the
  live quote is loading, errored, or not yet resolved — a customer can no
  longer submit against a stale or absent total.
- Ran the full `verify:full` suite twice: once after the module-level
  work landed, once more after the live-site wiring and coverage work, to
  confirm neither pass regressed the other.

## Deploy notes

- **New migration**: `20261022081836_add_stock_reservation_and_flash_sold_count`
  (adds the `StockReservation` table and `FlashSaleItem.soldCount`).
  Applies cleanly, no data migration needed — `soldCount` defaults to 0,
  which is correct for existing rows (historical sales aren't
  retroactively counted against a still-running flash sale's limit,
  matching the old behavior's own COUNT-based starting point).
- **New dev dependency**: `fast-check` (property-based testing) — dev-only,
  no production impact.
- **No new env vars, no new cron jobs.**
- **Action needed from the human**: none. This phase is purely
  application-layer; nothing here is deploy-blocking beyond the normal
  "all phases first, one deploy at the end" plan already in place.

## Pull request

`v2/phase-03-commerce-core` → `main`.

> **Phase 3: Commerce core**
>
> Builds the money/inventory/order correctness core per
> `UNIBAAZAR_V2_MASTER_PLAN.md` §5.1/§5.3/§5.4: `src/modules/pricing`
> (integer-poisha money, a single `computeQuote()`), `src/modules/inventory`
> (concurrency-safe stock reservations, a flash-sale qty-limit guard), and
> `src/modules/orders` (an explicit, previously-nonexistent order-status
> transition graph) — then wires all three into the actual live checkout,
> order-placement, and admin order-management code, closing two real bugs
> found along the way: a delivery-charge calculation that could silently
> disagree between the checkout page and the actual charge, and a
> flash-sale quantity-limit race with no concurrency guard at all.
>
> **Done-when criteria met**: `src/modules/pricing` is at 98.85% branch
> coverage; a concurrency test proves no overselling under 8 parallel
> checkouts for the last unit of stock; every order-status transition
> (all 225 (from, to) pairs) is tested.
>
> Scope note: CSV import/export, PDF invoices/labels, the fraud-score UI,
> attribute-sets-per-category, bundle/digital product types, and decimal
> quantities are explicitly deferred — see
> `docs/decisions/0012-phase-3-scope-core-correctness-first.md`. None of
> these carry money/stock correctness risk; they're scoped to a follow-up
> pass rather than rushed into this one.
>
> New migration (`StockReservation` + `FlashSaleItem.soldCount`), no new
> env vars, no new cron jobs.
>
> Full test matrix and known limitations in `docs/qa/phase-03-report.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
