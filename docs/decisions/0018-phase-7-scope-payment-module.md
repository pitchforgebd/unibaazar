# 0018: Phase 7 scope — harden what exists, defer what needs credentials I don't have

## Context

The master plan's Phase 7 bullet list: a `PaymentProvider` interface and a
payment state machine (initiated → pending → authorized → paid / failed /
cancelled / refunded / partially_refunded); direct integrations for COD,
bKash (tokenized checkout), Nagad, SSLCommerz, and AamarPay; server-side
IPN/callback verification with idempotency keys, signature checks, and
amount/currency matching; a daily reconciliation report; an Admin →
Payments section (enable/disable per method, encrypted credentials,
sandbox/live switch, "Test connection" button, transaction log, refunds,
fee display); "done when" sandbox E2E passes for each provider.

A survey (same approach as ADRs 0016/0017) found a real, working but
**narrower** payment layer already in place:

- `src/lib/payment/` already has a clean `PaymentProvider` interface
  (`types.ts`), a `cod` provider, and an `sslcommerz` provider.
  `resolveProvider()` (`index.ts`) routes COD to the COD provider and
  **every other method — bKash, Nagad, Rocket, Card — through the
  SSLCommerz aggregator**, which is how this actually works today: BD
  merchants commonly integrate one aggregator (SSLCommerz, in this case)
  rather than each mobile-banking provider's own API, and the aggregator
  presents bKash/Nagad/Rocket/card as payment options inside its own
  hosted checkout page. This is a legitimate, already-functioning
  architecture, not a stub.
- `PaymentStatus` (schema) is `PENDING | PAID | FAILED | REFUNDED` — a
  real subset of the plan's 8-state list, missing `INITIATED`,
  `AUTHORIZED`, `CANCELLED`, `PARTIALLY_REFUNDED`.
- SSLCommerz credentials (`SSLCOMMERZ_STORE_ID`/`SSLCOMMERZ_STORE_PASS`)
  are read straight from `.env` (`src/lib/payment/sslcommerz.ts`'s
  `config()`), not from the admin-managed encrypted-settings system
  Phase 2 built (`SETTINGS_ENCRYPTION_KEY` + `loadIntegrations()`).
  `bkashEnabled`/`bkashMerchant`/`nagadEnabled`/`nagadMerchant` already
  exist as settings fields, but (confirmed by Phase 6's parity audit)
  aren't read by anything — stub config with no effect.
- **No Admin → Payments section exists at all** — no transaction log UI,
  no refund UI, no "Test connection" button, no fee display.
- No reconciliation report.
- `AamarPay` has zero mentions anywhere in the codebase — entirely
  unbuilt, not even stubbed.

## The credential blocker (CLAUDE.md §0, stop condition 4)

Direct bKash tokenized-checkout and Nagad integrations each need their
own merchant sandbox credentials (separate from SSLCommerz's), which I
don't have and can't generate. AamarPay is the same. Live SSLCommerz
_sandbox_ testing (the plan's literal "done when": sandbox E2E passes)
needs real `SSLCOMMERZ_STORE_ID`/`SSLCOMMERZ_STORE_PASS` sandbox values,
which also aren't in this environment. Per CLAUDE.md, this is a stop-and-
ask condition for _that specific work_ — not a reason to halt the whole
phase. Everything below that doesn't require a third-party credential is
in scope and done directly.

## Decision

**In scope, done this phase:**

1. **Expand the payment state machine** to the plan's full 8 states
   (`INITIATED`, `PENDING`, `AUTHORIZED`, `PAID`, `FAILED`, `CANCELLED`,
   `REFUNDED`, `PARTIALLY_REFUNDED`) as `src/modules/payments/` — a new
   migration, an explicit transition graph (same shape as Phase 3's
   `modules/orders/state-machine.ts`), unit-tested. `modules/` is the
   target architecture (per CLAUDE.md) for exactly this kind of
   money-critical logic.
2. **Move SSLCommerz credentials into the encrypted admin-settings
   system** instead of raw `.env` — reuses Phase 2's
   `SETTINGS_ENCRYPTION_KEY` machinery, no new credential needed (same
   sandbox values, different storage). `.env` stays as the fallback for
   local dev convenience.
3. **Admin → Payments section**: enable/disable per method, encrypted
   credential fields, sandbox/live switch, transaction log (reads the
   `Payment` table), a refund action (status → `REFUNDED`/
   `PARTIALLY_REFUNDED`, audited), fee display where the gateway response
   carries it. The "Test connection" button is built and wired to
   actually call the configured provider — it will correctly report
   "not configured" or a real connection failure/success once _a_ human
   supplies real sandbox credentials, but I can't personally verify a
   live round-trip without them.
4. **Idempotency + signature hardening** on the SSLCommerz IPN/callback
   handlers — verify `val_id` signature, reject a replayed/duplicate
   `tran_id`, confirm amount and currency match the order before marking
   paid. This is correctness/security work on the _existing_ integration,
   no new credentials.
5. **Reconciliation, built against stored data**: a daily job comparing
   `Payment` rows against their `Order`'s expected total and flagging
   mismatches (amount, status drift, orphaned payments) — not a live
   poll against SSLCommerz's own transaction API, since I have no
   credentials to call it with. Documented as the real limitation it is.
6. **bKash/Nagad as settings UI that's honest about not doing anything
   yet**: either wire `bkashEnabled`/`nagadEnabled` to actually filter
   the checkout payment-method list (the real gap Phase 6 found) if
   that's reachable without a live gateway, or clearly label them
   "Coming soon" in the admin UI rather than implying they work — a
   decision made directly during implementation, not deferred further
   here.

**Explicitly deferred, blocked on credentials I don't have:**

- **Direct bKash tokenized-checkout integration** and **direct Nagad
  integration** (as opposed to routing through SSLCommerz) — needs each
  provider's own merchant sandbox credentials.
- **AamarPay** — needs its sandbox credentials; currently zero code
  exists, this would be a from-scratch integration.
- **Live sandbox E2E against the real SSLCommerz sandbox** — needs real
  `SSLCOMMERZ_STORE_ID`/`SSLCOMMERZ_STORE_PASS`. Unit/integration tests
  cover the IPN-verification logic (signature, replay, amount-matching)
  against synthetic payloads instead — real coverage of the logic, not a
  substitute for an actual round-trip, and documented as such.
- **Live reconciliation against the gateway's own transaction API** — see
  above; the built version only reconciles against our own stored data.

**When a human supplies these credentials later**, the "Test connection"
button and a short checklist in the Phase 7 QA report are the intended
path to closing this gap — not a reason to block everything else now.

## Consequences

- Same shape as Phases 5/6: real survey before code, scope narrowed to
  what's genuinely missing or broken rather than re-building what
  already works.
- The money-critical pieces (state machine, IPN signature/idempotency/
  amount-matching hardening) get full rigor, matching
  [[feedback_phase3_scoping]]'s precedent — credentials are the
  constraint, not an excuse to cut correctness corners on what's in
  scope.
- Every deferred item is blocked on a named, external credential — not
  silently dropped, and not something retried or worked around.
