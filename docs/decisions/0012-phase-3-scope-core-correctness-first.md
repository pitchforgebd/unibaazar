# 0012: Phase 3 scope — core correctness first, defer the rest with this ADR

## Context

`UNIBAAZAR_V2_MASTER_PLAN.md` §5.1–§5.4 specifies Phase 3 ("Commerce core")
in full: an integer-poisha money engine with promotion stacking rules
(§5.1), a multi-type catalog with per-category attribute sets and CSV/XLSX
import-export (§5.2), an inventory ledger with concurrency-safe
reservations (§5.3), and a full order state machine with fraud scoring,
manual-order capture, and PDF invoices/labels (§5.4). Done in full, to the
spec's own bar (95% branch coverage on pricing, a concurrency test proving
no oversell, every order transition tested), this is realistically several
sessions of careful work — it's the financial core of a live site
(`unibaazar.com`), not a place to cut corners for speed.

The project owner's explicit instruction (2026-10-22) was to move quickly
through the remaining phases ("druto shob phase shesh korte hobe" — finish
all phases fast). Asked how to balance that against Phase 3's size and
stakes, they chose: build the money/inventory/order correctness core fully
and correctly, and defer the lower-stakes, more mechanical pieces to a
follow-up phase rather than rush them.

## Decision

This phase builds, to the master plan's full correctness bar:

- `src/modules/pricing/` — integer-poisha money type, `quote()` as the
  single source of truth for price/discount/delivery/COD/VAT/total,
  promotion stacking rules, property-based invariant tests.
- `src/modules/inventory/` — stock ledger (`InventoryLog`-backed),
  checkout-time reservations with expiry, concurrency-tested to prove no
  overselling under parallel checkouts.
- `src/modules/orders/` — the explicit order state machine (allowed
  transitions, guards, side effects), with every transition under test.

This phase explicitly **defers** (tracked here, not silently dropped):

- Product CSV/XLSX import/export with a validation preview (§5.2).
- PDF invoices, packing slips, shipping labels, and bulk print (§5.4).
- The fraud-score admin UI and the more advanced velocity/blacklist checks
  beyond what `src/server/security/fraud-rules.ts` already does (§5.4) —
  existing fraud guards stay as-is; a nicer surfaced score is deferred.
- Attribute-sets-per-category as a full admin-configurable system (§5.2) —
  this phase keeps the existing fixed attribute model (`Attribute`/
  `AttributeValue`/`ProductAttribute`) rather than building a
  category-to-attribute-set admin UI. The data model already supports
  per-product attributes; what's deferred is the "category drives which
  fields show in the admin form" configuration layer.
- Digital product type (§5.2) — `simple`/`variable`/`bundle` are in scope;
  `digital` was already marked optional in the spec.

## Addendum (during implementation)

Two more scope calls made while building `src/modules/pricing`, recorded
here rather than silently decided:

- **Money stays `Decimal(12,2)` in the database; only the arithmetic
  becomes integer-poisha.** The master plan's real concern is floating-point
  rounding error in calculations, not the storage type specifically —
  `Decimal(12,2)` already has no binary floating-point representation error
  (unlike a `Float`/`double` column would). `src/modules/pricing/money.ts`
  does every computation in integer poisha and converts at the Decimal
  boundary using Decimal's own exact arithmetic (`.times(100)`, never a
  float round-trip), which closes the actual bug class. Changing the 10
  models/18 fields' column types to `Int` as well would touch every admin
  form, PDF, report, and CSV-adjacent path that reads/writes those columns
  for comparatively little additional correctness value inside an already
  large phase — deferred as a mechanical follow-up, not a correctness gap.
- **COD charge and VAT-on-total are modeled but left at zero.** `Quote`
  (the `modules/pricing` output type) has `codCharge` and `vat` fields
  matching the master plan's §5.1 shape, so later phases don't need to
  change the interface — but neither is wired to a live admin toggle yet.
  VAT in particular already exists today as a deliberate **reporting-only**
  figure (`InvoiceSettings.vatPercent`, documented in
  `src/server/admin/reports.ts`: "VAT is calculated from merchandise after
  the coupon. It is not added on top of the order total.") — flipping that
  to actually change what customers are charged is a real pricing-behavior
  change on a live site, not a bug fix, and isn't something to decide
  silently while refactoring the engine underneath it. Both stay inert
  (always `0`) until a deliberate, separately-reviewed decision to enable
  them.

## Consequences

- The three correctness-critical modules get real engineering effort and
  real test coverage — no shortcuts on the parts that handle money or
  stock on a live site.
- The deferred items are mechanical/UI-heavy rather than correctness-risk,
  so deferring them doesn't leave the live site exposed to a money or
  stock bug; they're straightforward to pick up in a dedicated follow-up
  pass (either folded into Phase 6's admin rebuild, where CSV
  import/export and PDF generation naturally live alongside the rest of
  the admin UI, or a short dedicated slice before Phase 12's hardening
  pass).
- Anyone resuming this work should grep for "deferred" / "ADR 0012" before
  assuming a §5.2/§5.4 bullet is done just because Phase 3's QA report says
  the phase is complete — the report will say explicitly which bullets
  this ADR covers.
