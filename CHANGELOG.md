# Changelog

All notable changes to UniBaazar are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); phases are tracked instead of
version numbers while the v2 rebuild (`UNIBAAZAR_V2_MASTER_PLAN.md`) is in progress.

## Phase 8 — Courier, SMS, and email modules (2026-10-24)

### Fixed

- **OTP and password-reset codes were generated and stored correctly but
  never actually delivered** — a real, live-site bug.
  `requestOtp()`/`requestReset()` now send via SMS or email through a new
  `deliverCode()` in `src/server/auth/accounts.ts`.
- **Bengali-language SMS templates would silently garble on delivery** —
  `bulksmsbd.ts` always sent GSM-7 `type=text` regardless of body
  content. New `needsUnicode()` switches to `type=unicode` whenever the
  message needs it.

### Added

- **Notification idempotency**: new `NotificationDedupe` table +
  `claimNotification()`, wired into `sendSms`/`sendEmail` via an optional
  `dedupeKey` and into order-status notices.
- **Branded, responsive HTML email** (`src/lib/email/template.ts`) —
  every `sendEmail()` call now renders a shared HTML layout alongside
  the plain-text body it already sent, not plain text only.
- **Daily abandoned-cart reminder email** — new
  `POST /api/v1/cron/abandoned-cart` route and matching Maintenance-board
  job, finds carts quiet 2h–7d with an email on file.
- **Courier/SMS balance and fraud-check calls** — `steadfastProvider`
  gained `balance()`/`fraudCheck()`, `bulkSmsBdProvider` gained
  `balance()`; Admin → Settings → Integrations' "Test connection"
  buttons now make a real call instead of logging a no-op.
- **Admin notification log viewer** — new tab at
  `/admin/orders/notification-logs` lists `SmsLog`/`EmailLog`, most
  recent first; no admin screen surfaced these before.
- ADR 0019 (Phase 8 scope — real gap narrower than, and in the
  OTP/reset-delivery case more urgent than, the master plan's wishlist).

## Phase 7 — Payment module (2026-10-24)

### Added

- **`src/modules/payments/`**: the payment state machine the master plan
  asks for. `PaymentStatus` expanded from 4 states to 8 (adds
  `INITIATED`, `AUTHORIZED`, `CANCELLED`, `PARTIALLY_REFUNDED`), with an
  explicit transition graph — closes the same ungoverned-status bug
  class ADR 0012/0013 fixed for orders ahead of Phase 3.
- **Amount-tracked refunds**: new `Payment.refundedAmount` column, a
  real "Refund" action/UI (amount field, confirmation, remaining-balance
  display) on the order payment panel, replacing a path that could set
  `REFUNDED` with no amount recorded at all.
- **Webhook idempotency**: a new `PaymentWebhookEvent` table claims each
  gateway IPN/callback event by its own transaction id before any
  Payment/Order write, via a DB unique constraint — safe under
  concurrent delivery of the same event.
- **SSLCommerz credentials moved into the encrypted admin-settings
  system** (Admin → Settings → Integrations), reusing Phase 2's
  encrypted-secrets machinery instead of raw `.env` vars.
- **A genuinely real "Test payment" connection check** — previously a
  no-op that always returned the same message regardless of
  configuration.
- **Daily payment reconciliation** with mismatch alerts — Admin →
  Maintenance → "Reconcile payments", or the new
  `POST /api/v1/cron/payment-reconciliation` route (daily cron).
- ADR 0018 (Phase 7 scope — survey-first, same approach as ADRs
  0016/0017; documents what's deferred pending third-party merchant
  credentials this environment doesn't have).

### Fixed

- `setPaymentStatus` had zero transition-legality checks — any status
  could move to any other status with no validation.
- `syncCourier()` updated `Shipment.status` with no audit trail unless
  the sync happened to also confirm the order.
- `e2e/a11y/key-pages.spec.ts` raced `Reveal`/`Stagger`'s entrance
  animation — axe could catch a genuinely in-flight element mid-fade, a
  real but transient contrast failure, not what a settled page ever
  shows. Fixed by forcing reduced motion before each scan.

## Phase 6 — Admin panel rebuild (2026-10-24)

### Added

- **`components/ui`/`components/motion` adopted across every admin
  module**: dashboard, reports, notifications, catalog, inventory, SEO,
  orders, customers, marketing, content, users, settings — finishing the
  design system's rollout started in Phase 5. Full breakdown in
  `docs/qa/phase-06-report.md`.
- **Order-status funnel** on the dashboard (today/7d/30d counts per
  status) and a **stock-valuation report** (cost-basis, by category),
  the one report type from the master plan's list that didn't exist yet.
- **`e2e/rbac/admin-roles.spec.ts`**: logs in as each staff role and
  asserts it sees only the modules its permissions grant. New seed
  accounts per role in `prisma/seed.ts`.
- **5 new settings-group parity tests** (theme, checkout, social,
  system, tracking) in the existing parity suite.
- `DeleteButton` rebuilt on `AlertDialog` instead of native
  `window.confirm`/`alert`; `ToastStack` now mounted in the admin layout.
- ADR 0017 (Phase 6 scope — survey-first, same approach as ADR 0016).

### Fixed

- **`Reveal`'s scroll-trigger hid list/detail pages' primary content**
  until the admin scrolled — removed from 8 files (orders, customers,
  coupons, banners, sliders, reports) where the data an admin came to
  see started below the 20%-visible trigger threshold on page load.
- **Zero-confirmation deletes** on category/brand/unit/label/attribute/
  tag rows — now gated behind `AlertDialog`.
- **`(admin)/admin/error.tsx` called `useTranslations()`** with no
  `NextIntlClientProvider` in admin's tree — the error boundary would
  itself crash on the exact class of error it exists to catch. Fixed
  with plain English strings, like every other admin component.
- **Audit-log completeness**: 16 admin write actions
  (`catalog-actions.ts`'s taxonomy/question-moderation actions,
  `syncCourier()`) had no `recordAudit` entry at all. Also deleted a
  dead, unimported duplicate of `user-actions.ts`.

## Phase 5 — Storefront rebuild (2026-10-23)

### Added

- **`components/ui`/`components/motion` adopted across the real customer
  journey**: homepage, shop/category/brand listing, product detail, cart,
  checkout, order success, account, wishlist/compare — going from
  zero-adopted outside `/_design` (Phase 4) to the primary toolkit on the
  highest-traffic screens. Full breakdown in `docs/qa/phase-05-report.md`.
- **Mobile filter bottom sheet** on listing pages (`shop/MobileFilters.tsx`,
  `Sheet`-based) and a sticky desktop filter sidebar, replacing the plain
  responsive-grid-only mobile treatment.
- **Sticky mobile buy bar** on product detail, swipeable product gallery
  with a full-screen zoom lightbox, fly-to-cart animation.
- **Cart free-delivery progress bar**, cart drawer rebuilt on `Sheet`.
- **`/videos` gallery**: a real storefront route (grid + lightbox over
  every active `HomeVideo`) — previously only an admin content screen
  existed for the homepage teaser.
- **404/500 pages reskinned** with the design system's `buttonStyles`.
- ADR 0016 (Phase 5 scope boundaries — real journey adoption vs. the
  master plan's full exotic-section-type wishlist, explicitly deferred
  items tracked there).

### Fixed

- **`Reveal`/`Stagger`'s hidden state was both axe-contrast-visible and
  keyboard-tab-reachable**: the shared variants only set `opacity: 0`,
  which leaves not-yet-revealed content in the accessibility tree.
  Surfaced by turning scroll-reveal on for a long listing grid for the
  first time (axe flagged a serious contrast violation on an off-screen
  card). Fixed by adding `visibility: hidden`/`visible` alongside opacity
  in `src/components/motion/variants.ts` — a latent bug since Phase 4,
  now fixed at the shared primitive level.
- **Lighthouse CI's performance/accessibility/best-practices budgets
  flipped from `warn` to `error`**, per `lighthouserc.js`'s own comment
  earmarking this moment. SEO stays `warn`: `/checkout`'s 0.63 score is
  the correct, by-design result of it being `noindex`'d.

## Phase 4 — Design system and motion system (2026-10-22)

### Added

- **Theme tokens, 4 presets, live admin switching**: `src/lib/theme/`
  defines Bazaar/Luxe/Fresh/Tech as CSS-custom-property token sets;
  `src/app/[locale]/layout.tsx` injects the active one as a per-request
  `<style>` tag, so switching presets in Admin → Settings → Theme is live
  on the next page load with no rebuild. Admin keeps a static fallback
  (Bazaar) and never re-skins with these presets.
- **`src/components/ui/`**: Button, IconButton, Input, Textarea, Select,
  Checkbox, RadioGroup/Radio, Badge, Tooltip, Dialog, AlertDialog, Sheet,
  Tabs, Spinner, and a new ToastStack (alongside the existing Toaster) —
  token-driven, accessible (ARIA, full keyboard nav, focus-visible
  states), built on a shared native-`<dialog>` modal engine.
- **`src/components/motion/`**: Reveal, Stagger, PressScale, flyToCart,
  CountUp, Marquee, Shimmer, ShakeOnError, PageTransition — the master
  plan §4.4 micro-interaction list, gated by `prefers-reduced-motion`
  throughout, built on the `motion` library against shared duration/
  easing/spring tokens.
- **`/_design`**: a dev-only route showing every primitive above, in
  every theme preset, in both locales — blocked in real production
  (`ALLOW_DESIGN_ROUTE` is the test-only exception), with its own axe
  pass and visual snapshot.
- ADRs 0014 (the token architecture) and 0015 (Phase 4's scope boundaries
  — preset selection vs. per-token editing, no density axis yet).

### Fixed

- Re-enabled axe's `color-contrast` rule (disabled since before Phase 2,
  explicitly pending this phase) and fixed every real violation it found
  on the live storefront: the brand-orange tokens themselves, three
  courier footer badges using their own brand hue as text color, the top
  announcement bar's unfixed default color (and the knock-on fix to
  `LanguageToggle`'s inactive-tab opacity), the homepage's "Offers" tile,
  and the hue-based placeholder backgrounds for hero slides/banners with
  no uploaded image (lightness lowered from 42% to 24%, verified safe
  across all 360 hue degrees, not just the ones currently seeded).

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
