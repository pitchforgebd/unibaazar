# 0013: The order status transition graph's shape

## Context

The master plan's §5.4 asks for "an explicit state machine... with allowed
transitions, guards, and side effects" and gives a flat happy path (pending
→ confirmed → processing → ready_to_ship → handed_to_courier → in_transit →
delivered → completed) plus a flat list of extra terminal/side states
(cancelled, on_hold, returned, partially_delivered, failed, refunded). It
doesn't specify the actual edges between non-happy-path states — that's a
real design decision this phase had to make, documented here per
CLAUDE.md's "record non-obvious decisions as ADRs" rule.

Researching the current code (pre-Phase-3) found `setOrderStatus()` had
**zero** transition-legality checks — any status could move to any other
status, including a `DELIVERED` order being set straight back to `PENDING`.
That's the specific bug this graph exists to close.

## Decision

`src/modules/orders/state-machine.ts`'s `ALLOWED_TRANSITIONS`:

1. **The pre-shipment pipeline (PENDING → CONFIRMED → PROCESSING →
   READY_TO_SHIP → SENT_TO_COURIER → SHIPPED) allows forward skips, not
   just the next step.** First draft made each stage only reachable from
   the one immediately before it — strictly linear. That broke real call
   sites discovered while wiring the graph in: `bookCourier()` and
   `syncCourier()`/the Steadfast webhook update status from _whatever it
   currently is_ (guarded only by "not already there"), because real
   courier integrations don't reliably fire every intermediate status
   update. A strictly linear graph would have silently started rejecting
   those calls. Skipping forward is safe — stock stays held across every
   one of these stages regardless of which one an order is in, so no
   stage order ever double-counts or under-counts it.
2. **Backward movement and escape from a terminal/released status
   (CANCELLED, FAILED, RETURNED, REFUNDED) is never allowed, with no
   exception.** This is the actual bug being fixed — a cancelled or
   returned order is final; the customer places a new order rather than
   "resurrecting" one. `src/modules/orders/server/transition.ts`
   deliberately has no "re-hold stock" code path as a direct consequence
   (there is no edge that would ever need it), with a test
   (`state-machine.test.ts`) asserting this invariant explicitly so the
   two files can't silently drift apart.
3. **ON_HOLD is a parking state, not pinned to one prior step.** An admin
   can resume a held order anywhere in the pre-shipment pipeline or cancel
   it outright. Stock stays held while ON_HOLD (it's not in the released
   set), so pausing and resuming has no stock side effect either way.
4. **A DELIVERED/PARTIAL_DELIVERED/COMPLETED order can still move to
   RETURN_REQUESTED.** Real stores commonly allow a return window after
   delivery (and even after an order auto-completes), and nothing in the
   existing code forecloses it.
5. **RETURN_REQUESTED can resolve to RETURNED (the return is processed) or
   back to DELIVERED (the admin rejects the request)** — not back to
   COMPLETED, since the decision point belongs with whichever delivery
   state actually produced it; collapsing both back to DELIVERED is a
   simplification an admin can immediately re-complete the order from.

## Consequences

- `setOrderStatus()` (`src/server/admin/orders-admin.ts`), customer-facing
  `cancelOrder()`/`requestReturn()` (`src/server/orders/orders.ts`), and
  every integration that calls `setOrderStatus()` (SSLCommerz IPN, courier
  booking/sync, the Steadfast webhook, the cancel-unpaid-orders cron) now
  share one source of truth for which transitions are legal, instead of
  each call site trusting its own ad hoc guard (or no guard at all).
- `transitionOrder()`'s stock-reconciliation logic only ever needs to
  handle the "release" direction, which is simpler and has a smaller bug
  surface than handling both directions would — a direct benefit of
  decision #2 above, not just a documentation nicety.
- If a future phase needs to resurrect a cancelled/returned order (e.g. an
  admin "undo" feature), it must add both the graph edge in
  `state-machine.ts` _and_ the matching re-hold branch in
  `transition.ts` in the same change — the test added for invariant #2
  will fail otherwise, by design.
