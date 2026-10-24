# Phase 7 QA report: Payment module

Branch: `v2/phase-07-payment-module`. Date: 2026-10-24.

## What was built

Per ADR 0018 (survey found a real but narrower payment layer than the
master plan's full wishlist — COD + SSLCommerz, acting as an aggregator
that already covers bKash/Nagad/Rocket/card, not 4 separate direct
integrations):

1. **`src/modules/payments/`** — the payment state machine the plan asks
   for, mirroring Phase 3's `modules/orders`. `PaymentStatus` expanded
   from 4 states (PENDING/PAID/FAILED/REFUNDED) to the full 8
   (`INITIATED`, `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `CANCELLED`,
   `REFUNDED`, `PARTIALLY_REFUNDED`), with an explicit transition graph
   closing the same class of bug ADR 0012/0013 found and fixed for
   orders ahead of Phase 3: `setPaymentStatus()` previously wrote any
   status to any other status with zero legality checks. `FAILED` is
   deliberately not terminal — this codebase reuses one `Payment` row
   per order across gateway retry attempts, so a declined attempt needs
   a real way back to `PENDING`.
2. **Refunds**, properly tracked. `Payment.refundedAmount` (new column)
   is tracked separately from `status`, so a second or third partial
   refund while already `PARTIALLY_REFUNDED` is a plain amount update,
   not an illegal same-status transition. A real "Refund" action and UI
   (amount field, `AlertDialog` confirmation, remaining-balance display)
   replaced the old path where picking "Refunded" from a generic status
   dropdown skipped amount bookkeeping entirely.
3. **Idempotency keys** (new `PaymentWebhookEvent` table, unique on
   `(provider, eventKey)`) — a gateway webhook/IPN event is claimed
   before any Payment/Order write happens, via a DB unique constraint
   (safe under concurrent delivery of the same event, unlike a
   status-only "already PAID" check). Wired into both the SSLCommerz IPN
   handler and the generic payment callback route.
4. **SSLCommerz credentials moved into the encrypted admin-settings
   system** (reusing Phase 2's `SETTINGS_ENCRYPTION_KEY` machinery, the
   same `keepSecret()`/`loadSecret()` pattern bKash/Nagad/SMS/email/
   courier secrets already use) instead of raw `.env` vars. `.env` stays
   as the local-dev fallback.
5. **A genuinely real "Test connection" button** — it previously just
   checked `bkashEnabled`/`nagadEnabled` and logged an audit entry with
   zero gateway interaction, always returning the same message
   regardless of whether anything was configured correctly. It now
   calls `sslcommerzProvider.initiate()` with a small dummy order and
   reports whether the gateway actually accepted the session.
6. **Daily payment reconciliation** (`aggregateMismatches()`, pure and
   unit-tested) — sweeps every `Payment` row for an amount mismatch
   against its order, a refunded amount exceeding what was paid, or more
   than one `PAID` payment on the same order. Runnable from Admin →
   Maintenance or the new `POST /api/v1/cron/payment-reconciliation`
   route (added to `DEPLOYMENT.md`'s cron list, daily at 3am). Pushes an
   in-app + external-channel alert when mismatches are found. This
   reconciles against what's already in the database — not a live poll
   against SSLCommerz's own transaction API, since this environment has
   no credentials to call one with (see "Deferred" below).
7. **`setPaymentStatus`/the SSLCommerz IPN handler/the generic callback**
   all now go through `transitionPayment()` instead of writing
   `Payment.status` directly, with the same graceful-rejection shape
   (audit log + a clear message, not a thrown error) `setOrderStatus`
   already uses for an illegal order-status move.

## Explicitly deferred — blocked on credentials this environment doesn't have

Per ADR 0018 and CLAUDE.md's stop-and-ask condition 4 ("a credential or
account you don't have is needed"):

- **Direct bKash tokenized-checkout and Nagad integrations** (as opposed
  to routing through SSLCommerz) — each needs its own merchant sandbox
  credentials.
- **AamarPay** — zero code exists for it; would be a from-scratch
  integration needing its own sandbox credentials.
- **Live sandbox E2E against the real SSLCommerz sandbox** — needs real
  `SSLCOMMERZ_STORE_ID`/`SSLCOMMERZ_STORE_PASS` (or the admin-settings
  equivalent) sandbox values, which aren't in this environment. The
  IPN-verification logic itself (amount matching, transaction-ID
  matching, idempotency) is unit/integration tested against synthetic
  payloads instead — real coverage of the logic, not a substitute for an
  actual round-trip against SSLCommerz's servers, and documented as such
  rather than silently treated as equivalent.
- **Live reconciliation against the gateway's own transaction API** — the
  built version only reconciles against this app's own stored data.

**If a human supplies SSLCommerz sandbox (or live) credentials later**,
pasting them into Admin → Settings → Integrations and clicking "Test
payment" is the intended path to verifying the connection — no further
code changes should be needed for SSLCommerz specifically.

## Real bugs found and fixed this phase

1. **`setPaymentStatus` had zero transition-legality checks** — the exact
   same class of bug ADR 0012/0013 fixed for orders before Phase 3, just
   not yet applied to payments. Fixed by the new state machine.
2. **A generic payment-status dropdown could set `REFUNDED`/
   `PARTIALLY_REFUNDED` with no amount tracked at all**, bypassing
   `refundedAmount` bookkeeping entirely — found while wiring the refund
   action, fixed by removing those two statuses from the generic
   dropdown and requiring the dedicated Refund flow to reach them.
3. **`syncCourier()` updated `Shipment.status` with no audit trail**
   unless the sync happened to also flip the order to `DELIVERED` (which
   goes through the already-audited `setOrderStatus()`) — found during
   the state-machine work, fixed with a `recordAudit` call.
4. **`key-pages.spec.ts` (a11y suite) raced `Reveal`/`Stagger`'s entrance
   animation** — axe scanned immediately after `page.goto()`'s `load`
   event, with no wait for components/motion's opacity-based reveal to
   finish. Under real motion, this could catch a genuinely in-flight
   element at partial opacity, which computes as a real (but transient,
   sub-second) contrast failure — not what a settled page ever shows a
   user. Reproduced 3/3 runs before the fix, 0/3 after, against a freshly
   started server (ruling out a load/timing explanation specific to this
   session). Fixed by forcing `prefers-reduced-motion: reduce` before
   each page visit, so every Reveal/Stagger item renders at its final
   opacity immediately — the deterministic, settled render this test
   should actually be scanning.

## Test matrix and results

| Check                                                                  | Result                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                                                              | ✅ pass                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Lint                                                                   | ✅ pass                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Unit tests                                                             | ✅ 246/246 pass (28 files; +7 from Phase 6's 239 — the payment state machine and reconciliation's `aggregateMismatches`)                                                                                                                                                                                                                                                                                                    |
| Integration tests                                                      | ✅ 24/24 pass (15 pre-existing + 9 new: transition legality, refund accumulation/exceeding/topping-up, idempotency including a concurrent-delivery race)                                                                                                                                                                                                                                                                    |
| E2E critical path (desktop + mobile)                                   | ✅ both pass — COD checkout through to admin seeing the order is unaffected                                                                                                                                                                                                                                                                                                                                                 |
| RBAC                                                                   | ✅ logic unchanged from Phase 6 and independently confirmed working (6/6) when first exercised this session; later same-session reruns hit this machine's own per-IP login rate limiter (8 attempts/15 min, shared across every localhost test run today) — a property of this session's repeated manual verification, not a regression; confirmed the test server itself was healthy throughout via a non-login RBAC check |
| a11y (axe, desktop): home/shop/product/login/cart/design-system        | ✅ 6/6 pass (after the reduced-motion fix above)                                                                                                                                                                                                                                                                                                                                                                            |
| Visual snapshots                                                       | ✅ 2/2 — unchanged from Phase 6                                                                                                                                                                                                                                                                                                                                                                                             |
| Parity (settings/menus/products/theme/checkout/social/system/tracking) | ✅ 8/8 pass — unchanged from Phase 6, reconfirmed                                                                                                                                                                                                                                                                                                                                                                           |
| Lighthouse                                                             | Not rerun this phase — no storefront-visible changes; last clean run was Phase 6's                                                                                                                                                                                                                                                                                                                                          |

## Known limitations

- **No dedicated "Payments" admin section/transaction-log page** — refund
  and status-override actions live on each order's existing Payment
  panel (`/admin/orders/[id]`), and the orders list already filters by
  payment status across all 8 states. A cross-order payment log/search
  view is a reasonable follow-up but wasn't built this phase; scoped out
  given the credential-blocked items above were the correctness-critical
  priority.
- **Fee display** (master plan's Admin → Payments bullet) — not built.
  SSLCommerz's IPN validator response doesn't surface a fee field today,
  and the `Payment` model has no fee column; would need both a schema
  change and confirming what field (if any) the real gateway response
  actually carries, which isn't verifiable without live credentials.
- **bKash/Nagad enable/merchant-info settings remain as before** — they
  still don't filter the storefront's checkout payment-method list (the
  gap Phase 6's parity audit found). The Integrations UI now says so
  explicitly ("route through SSLCommerz today") rather than implying
  they're independently functional.

## Deploy notes

- **New migration** (`20261024010000_payment_state_machine`):
  `PaymentStatus` enum expansion, `Payment.refundedAmount`,
  `PaymentStatusHistory`, `PaymentWebhookEvent`.
- **No new required env vars** — `.env`'s `SSLCOMMERZ_STORE_ID`/
  `SSLCOMMERZ_STORE_PASS` still work as the local-dev fallback; a real
  deploy should configure SSLCommerz from Admin → Settings →
  Integrations instead, where the password is encrypted at rest.
- **New cron job**: `POST /api/v1/cron/payment-reconciliation`, daily —
  added to `DEPLOYMENT.md`'s cron list.
- **Action needed from the human**: none to merge this phase. Before the
  first real deploy (or whenever live payment testing becomes possible),
  supply real SSLCommerz credentials (and, if wanted, bKash/Nagad/
  AamarPay direct-integration credentials) — see "Explicitly deferred"
  above for what unblocks once they're available.

## Summary

Phase 7 (Payment module): builds the money-critical pieces the master
plan asks for that don't need third-party credentials this environment
doesn't have — a proper payment state machine (closing the same
ungoverned-status bug class Phase 3 fixed for orders), amount-tracked
refunds, webhook idempotency, encrypted gateway credentials, a real
connection test, and daily reconciliation with alerts. Direct bKash/
Nagad/AamarPay integrations and live sandbox E2E stay explicitly
deferred, not silently skipped, pending real merchant credentials.

`npm run verify` green (typecheck, lint, 246/246 unit), 24/24 integration
tests, E2E critical path clean, a11y 6/6 (after fixing a real test-timing
bug found along the way), parity 8/8. Full test matrix and known
limitations above.

Per the standing no-per-phase-PR workflow (2026-10-23): branch pushed, no
PR opened, proceeding straight into Phase 8 (Courier, SMS, and email
modules).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
