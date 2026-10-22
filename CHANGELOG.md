# Changelog

All notable changes to UniBaazar are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); phases are tracked instead of
version numbers while the v2 rebuild (`UNIBAAZAR_V2_MASTER_PLAN.md`) is in progress.

## Phase 3 — Commerce core (2026-10-22)

Scope note: this phase deliberately covers the money/inventory/order
_correctness_ core of §5.1–§5.4 to the master plan's full bar (95% branch
coverage, concurrency-tested, every transition tested) rather than every
bullet in those sections — see
`docs/decisions/0012-phase-3-scope-core-correctness-first.md` for exactly
what's deferred and why (CSV import/export, PDF invoices/labels, the
fraud-score UI, attribute-sets-per-category, bundle/digital product types,
decimal quantities).

### Added

- `src/modules/pricing/`: an integer-poisha money engine (`money.ts`) and
  `computeQuote()` (`quote.ts`) as the single source of truth for price,
  discount, and delivery — fixes the real delivery-charge duplication bug
  between `src/server/checkout/quote.ts` (read admin Settings) and
  `src/lib/catalog/pricing.ts` (hardcoded 70/130/6500); both the checkout
  page's live price and the actual order total now come from the same
  calculation. `applyCoupon()` ports every eligibility rule (active flag,
  date window, usage limits, product/category scope, minimum subtotal)
  into one pure, directly-testable function. 98.85% branch coverage.
- `src/modules/inventory/`: `reserveStock()`/`commitStock()` hold stock
  between a cart quote and order placement (new `StockReservation` model),
  reusing the atomic `updateMany({stock: {gte: qty}})` guard the old code
  only applied at the very last step; `incrementFlashSold()` closes a real
  oversell race on flash-sale quantity limits (the old check was a
  non-transactional `COUNT(OrderItem)` query with no lock). Both
  guarantees are proven with a concurrency test against the real database
  (8 parallel requests at stock/qtyLimit = 1 — exactly one wins).
- `src/modules/orders/`: an explicit order-status transition graph
  (`ALLOWED_TRANSITIONS`) — before this, `setOrderStatus()` had zero
  transition-legality checks, so a `DELIVERED` order could be set straight
  back to `PENDING`. `transitionOrder()` is now the one function allowed
  to change `Order.status`, wired into every call site (admin actions,
  SSLCommerz IPN, courier booking/sync, the Steadfast webhook, the
  `cancel-unpaid-orders` cron, customer-facing cancel/return). Every
  `(from, to)` pair is exhaustively tested.
- `src/store/cart.ts` mints a per-cart `reservationToken`; the checkout
  page (`useCheckoutQuote`) fetches its displayed subtotal/discount/
  delivery/total from the live `/api/v1/cart/quote` endpoint instead of
  computing them client-side, so the page can never show a total that
  doesn't match what the order is then charged.
- ADRs 0012 (Phase 3 scope) and 0013 (the transition graph's design,
  including why it allows forward skips across the pre-shipment pipeline
  but never backward movement).

### Removed

- `deliveryCharge`/`deliveryCharges`/`couponDiscount` from
  `src/lib/catalog/pricing.ts` — the hardcoded, real-bug-causing shadow of
  `modules/pricing`'s delivery/coupon math, dead once the checkout page
  stopped computing its own totals.

## Phase 2 — Foundation refactor (2026-10-18)

### Added

- **URL-based locale routing**: `src/i18n/routing.ts`/`navigation.ts` +
  `src/middleware.ts` replace cookie-based locale resolution with
  `/bn/...`/`/...` URL prefixes (`localePrefix: "as-needed"`). This was the
  actual root cause of the Phase 0-documented ISR/i18n production 500 —
  locale is now resolved in middleware before rendering, not read from a
  cookie mid-render. The old `src/app/(store)/` tree moved to
  `src/app/[locale]/(store)/`; admin keeps its own root layout
  (`src/app/(admin)/layout.tsx`, no `NextIntlClientProvider`, `lang="en"`).
  `src/lib/seo/urls.ts`'s `localeAlternates()` adds real per-page
  `hreflang`/`x-default` `<link>` tags (product, category, brand, blog,
  CMS, home) now that locale is a URL, not a cookie.
- **Caching restored**: `src/server/catalog/products.ts`'s store reads are
  wrapped in `unstable_cache` with tags from the new
  `src/server/cache/tags.ts`; every admin write that can affect the
  storefront now calls `revalidateTag`/`revalidatePath` for the right tags
  (catalog, marketing, inventory actions, and the Maintenance module's
  cache-clear job). See `docs/decisions/0008-product-page-justified-dynamic-not-isr.md`
  for why `/product/[slug]` stays plain-dynamic with a cached data layer
  instead of page-level ISR (a Next.js 15.5.27 bug with nested
  `generateStaticParams` under a multi-locale parent).
- `src/lib/logger.ts`: structured pino logging + a central `reportError()`
  funnel, wired into both root error boundaries and the server catch-all.
- Encrypted settings-at-rest: `src/server/settings/secret.ts` now encrypts
  any `isSecret` setting with AES-256-GCM (`SETTINGS_ENCRYPTION_KEY`), with
  backward-compatible plaintext fallback for pre-existing values.
- Media variant pipeline: `src/server/media/variants.ts` generates
  AVIF/WebP variants at upload time (`sharp.concurrency(1)`, mandatory on
  this host — see `ARCHITECTURE.md` §12); `src/lib/media/imageLoader.ts` is
  a custom `next/image` loader serving them. See
  `docs/decisions/0011-media-variant-pipeline.md`.
- `/admin/maintenance`: a super-admin-only module that runs idempotent
  maintenance jobs inside the already-warm app process (no background
  workers/queues — this host can't support them). Registry in
  `src/server/admin/maintenance/jobs.ts`: cache clear (now tag-aware, see
  below), sitemap rebuild (no-op), search reindex (no-op), media backfill
  (real implementation, resumable), seed demo catalog, bootstrap admin
  account. Backed by the new `MaintenanceJobRun` model (logs every run) and
  `requireSuperAdmin()`/`superAdminAccess()` in `src/server/admin/access.ts`
  — the first admin guard checking the `super-admin` role directly, since
  `admin` and `super-admin` hold identical permission grants today.
- `e2e/parity/admin-storefront-parity.spec.ts`: admin-write → storefront-read
  parity tests (settings, menus, product quick-edit), desktop + mobile.

### Removed

- Every runtime fallback-to-mock-data path found in the Phase 0 audit:
  homepage blog teaser, the generic CMS route, the FAQ block, the blog
  listing/detail pages, and the Zustand cart store's stock check (now
  resolves via `/api/v1/products/[slug]`, async). Mock data under
  `src/lib/mock/*` remains only as seed-data content.
- `src/app/api/v1/cron/seed-catalog/route.ts` and
  `.../cron/bootstrap-admin/route.ts` — replaced by the Maintenance module's
  "Seed demo catalog" and "Bootstrap admin account" jobs. The `cron/*`
  pattern is unchanged for the remaining _scheduled_ jobs (`low-stock-sweep`,
  `cancel-unpaid-orders`).
- Dead code in `src/lib/catalog/queries.ts` (`getBlogPost`, `getCmsPage`,
  `getCategory`, `getBrand`, `getRelatedProducts`, `searchSuggestions`,
  `getReviews`, `getQuestions`, `getProduct`) left over from the mock-data
  removal above.

### Fixed

- `src/server/admin/maintenance/jobs.ts`'s cache-clear job now also calls
  `revalidateTag` for every static tag in `src/server/cache/tags.ts` —
  `revalidatePath("/", "layout")` alone didn't purge the `unstable_cache`
  entries the catalog reads use.

### Docs

- `ARCHITECTURE.md` rewritten: repository layout, rendering strategy,
  internationalization, and hosting-reality sections all updated for this
  phase's changes.
- `docs/decisions/0008`–`0011` — ADRs for the product-page ISR workaround,
  the Rust-free Prisma client spike (deferred), the `modules/` move
  (deferred to Phase 3), and the media variant pipeline.

## Phase 1 — Deployment pipeline (2026-10-18)

### Added

- `.github/workflows/ci.yml`: full verify suite against a MySQL 8 service
  container on every push; builds and packages a release artifact on `main`.
- `.github/workflows/deploy.yml`: uploads a release over SSH, backs up the
  database, migrates, switches the live release, restarts, smoke-tests, and
  auto-rolls-back on failure. **Manual trigger** (`workflow_dispatch`), not
  automatic on merge — see "Scope change" below.
- `scripts/deploy/apply-migrations.sh`: applies committed Prisma migrations
  via the `mysql` CLI only, no Prisma CLI/Node — verified end to end
  locally (checksums match real `prisma migrate deploy` exactly).
- `scripts/deploy/deploy-release.sh`: the switch-over logic (backup,
  migrate, symlink switch, restart, smoke test, rollback on failure).
- `scripts/deploy/rollback.sh`: manual one-command rollback to any previous
  release.
- `GET /api/health`: `{status, version, db, uptime}`.
- `docs/deploy/host-facts.md`, `docs/deploy/github-secrets.md`: what's
  needed from the host/GitHub before the first real deploy.

### Changed

- `scripts/backup-db.{sh,mjs}` moved to `scripts/deploy/`, extended with a
  configurable `BACKUP_DIR` and 14-backup retention.
- `DEPLOYMENT.md` rewritten for the new pipeline.
- `CLAUDE.md` updated with the deploy-is-manual decision.

### Scope change (agreed with the project owner mid-phase)

Deploys are deliberately manual for now, not automatic on merge — the plan
is to build every v2 phase first and do one real production deploy once
everything's ready, since the site is live but not yet carrying real sales
traffic. See `docs/decisions/0007-manual-deploy-trigger.md`. `ci.yml` still
tests and builds on every push regardless, so `main` stays provably
deployable throughout. This also means this phase's original "done when"
criterion (a live dry-run deploy including a forced rollback) is deferred
to whenever that first real deploy happens, not a Phase 1 exit gate — see
`docs/qa/phase-01-report.md`.

## Phase 0 — Audit, safety, and baseline (2026-10-18)

### Security fixes

- `webhookSecret()` no longer falls back to a hardcoded literal when `AUTH_SECRET`
  is unset — it throws instead, closing a path where anyone who knew the fallback
  string could have forged payment-callback requests.
- OTP and password-reset codes now use `crypto.randomInt()` instead of
  `Math.random()`.
- Removed the real DB password and the seeded admin password from `DEPLOYMENT.md`
  (both were committed in plaintext and already pushed to `origin/main` —
  rotation still needed, see `docs/qa/phase-00-report.md`).

### Tooling added

- Vitest (`npm run test:unit`, `test:integration`) and Playwright
  (`test:e2e`, `test:e2e:mobile`, `test:a11y`, `test:visual`) with desktop + mobile
  projects.
- `npm run verify` / `verify:full` per the master plan's command reference.
- Lighthouse CI (`npm run lhci`) against home/shop/product/checkout.
- `docker-compose.test.yml` for an isolated MySQL 8 test database.
- commitlint + a `commit-msg` hook enforcing Conventional Commits.
- `.claude/settings.json` and `CLAUDE.md` (condensed operating rules for future
  sessions).

### Removed

- `src/lib/mock/cart.ts` — dead code, zero importers.

### Docs

- `docs/audit/current-state.md` — full Phase 0 codebase audit.
- `docs/decisions/0001`–`0003` — ADRs for import-boundary deferral, secret
  scanning without a local gitleaks binary, and the local test-DB workaround.
- `docs/qa/phase-00-report.md` — this phase's QA report.

### Known limitations carried forward (not fixed in Phase 0 — see audit doc)

- Delivery-charge calculation is duplicated between the authoritative checkout
  quote and a hardcoded cart/checkout preview; they can disagree.
- bKash/Nagad admin settings don't affect payment routing yet.
- The client-side cart's stock check reads mock catalog data, not the database.
- Organization/WebSite JSON-LD never reads admin-edited store settings.
- Near-zero automated test coverage on checkout, orders, payments, and auth.
- Storefront color tokens fail WCAG AA contrast in several places (brand
  orange, one delivery-partner badge color) — scheduled for Phase 4's design
  system.
