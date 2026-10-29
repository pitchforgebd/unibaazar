# Changelog

All notable changes to UniBaazar are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); phases are tracked instead of
version numbers while the v2 rebuild (`UNIBAAZAR_V2_MASTER_PLAN.md`) is in progress.

## Phase 14 — Deploy readiness (2026-10-30)

Was planned as the Phase 12 migration rehearsal. Waived: the production
database holds only demo/test data and v1 is being replaced rather than
upgraded, so there was nothing to preserve and a rehearsal would have
proved nothing. Verified the path that will actually run instead — a
first deploy onto an empty database (ADR 0025). The CI/CD pipeline had
never executed end to end, because deploys have been deliberately
deferred since ADR 0007.

### Fixed

- **The release artifact omitted `scripts/`.** `deploy.yml`'s last step
  is `bash .../scripts/deploy/deploy-release.sh`, and that script calls
  `backup-db.mjs` and `apply-migrations.sh`. The first real deploy would
  have failed on its first command.
- **`--exclude='.next/cache'` was written after tar's path list**, where
  tar treats it as positional and it matched nothing, so every release
  carried **710MB of webpack cache** — and the invocation exits non-zero,
  so depending on the runner's tar version the step either shipped
  ~718MB or failed outright. Moving the flag ahead of the paths takes
  the artifact to 7.5MB and tar to exit 0.
- **`apply-migrations.sh` could not parse a DB password containing
  symbols** — it split credentials on the first `@` and never decoded
  percent-escapes, so a cPanel-generated password broke it two ways: a
  raw `@` put the rest of the password into the hostname, and the
  percent-encoded form Prisma requires reached `MYSQL_PWD` literally.
  Both aborted the first deploy to a fresh host, which is the only time
  this code runs.

- **A parity assertion had been verifying nothing since Phase 9.** Every
  parity test waited on `getByText("saved", { exact: false })`, which
  also matches page body copy — the social settings page's intro ends
  "keep the saved value". On that page it either resolved to two
  elements and failed strict mode, or matched the intro and passed
  without the save having happened. Replaced with one `expectSaved()`
  helper scoped to `role="status"`. Both saves had in fact succeeded:
  the test database held the exact values the failing tests submitted.
  Parity is 8/8 on two consecutive runs.

### Changed

- `docs/launch-checklist.md` §1 is now the fresh-install sequence rather
  than the rehearsal. It leads with the two steps that are the whole
  recovery plan for deploy #1: copy `shared/uploads` off the host
  (product images live only there — not in git, not in the artifact) and
  keep a final pre-wipe dump outside the repo.
- The backups/rollback section now states plainly that deploy #1 has no
  rollback target, which `deploy-release.sh` already handled correctly.

## Phase 13 — Pre-launch correctness fixes (2026-10-29)

First phase past the master plan's Phase 12 — see
`docs/post-launch-plan.md`.

### Fixed

- **Rate limits and daily order caps were keyed on IP alone, which is
  the wrong key for this market.** Bangladesh's mobile carriers put
  huge numbers of subscribers behind one CGNAT IPv4, so
  `ordersFromIpToday >= 5` would have refused the **6th order of the
  day from an entire carrier's NAT pool** — with a fraud message, so it
  would have read as an attack rather than lost sales — and
  `5 OTPs/15min/IP` would have throttled real logins at peak. The tight
  limit now keys on the phone/email being acted on (hashed, so no raw
  PII in the limiter table); IP stays as a loose flood backstop. Daily
  order caps: phone 5, device 5, IP 40. Verified behaviourally: same
  phone throttles at 5, twelve different phones on one IP all pass, and
  a single-IP flood still trips at 60 (ADR 0024).
- **`clientIp()` trusted the client-supplied `X-Forwarded-For` entry**,
  letting anyone choose their own rate-limit key — to evade a limit, or
  to spend someone else's budget and lock them out. It now counts
  `TRUSTED_PROXY_HOPS` (default 1) from the right.

### Added

- `docs/post-launch-plan.md` — Phases 13–18: the launch path and every
  deferred item, since the master plan stops at 12.

## Phase 12 — Hardening, full QA, and launch prep (2026-10-29)

### Security

- **Rate limiting is now DB-backed** for login, OTP, checkout, contact
  and newsletter (§5.6). The in-memory limiter reset on every restart,
  so a deploy or crash handed an attacker a fresh budget. The in-memory
  one is kept for high-volume telemetry routes only.
- **A critical `next` advisory fixed** (15.5.27 → 15.5.28), plus a
  `postcss` high and `markdown-it`. Production advisories 40 → 35,
  critical 1 → 0. Three remaining `high`s need major upgrades
  (prisma 7, zod 4, next 16) and are catalogued in ADR 0023.
- **`npm audit` gates CI** at critical on production dependencies.
- **CSRF defence-in-depth**: `assertSameOrigin` on the
  session-authenticated mutations that lacked it (password, profile,
  addresses, reviews, questions, order cancel/return, admin
  notifications).

### Fixed

- **Authenticated flows were untestable in WebKit** — a production build
  served over http marked the session cookie `Secure`, which WebKit
  stores but never sends. The flag now follows the site URL's scheme.
  Not user-facing (production is https), but it blinded the test suite
  to the admin panel and account area in Safari.
- **The parity theme test never restored the colour it set**, failing
  every later a11y run. This was the real cause of the "stale test-DB
  theme colour" artifact that the Phase 9, 10 and 11 QA reports wrote
  off as environmental.
- **Playwright's `globalSetup` pointed at the dev database**, because
  the playwright scripts never loaded `.env.test`.

### Added

- **Cross-browser regression**: WebKit, iOS Safari and Firefox projects,
  `npm run test:e2e:cross`, a slot in `verify:full`, and a CI job. The
  full matrix now runs clean twice back to back with no manual
  intervention.
- **k6 load test** for listing and checkout
  (`scripts/load/checkout-and-listing.js`), sized for this host's
  thread ceiling.
- **`docs/launch-checklist.md`** and ADR 0023.

### Deferred

- **CSP nonces** — needs `'strict-dynamic'`, and whether each
  third-party pixel survives it can't be verified without real pixel
  credentials. Exact steps recorded in ADR 0023.
- **The data-migration rehearsal** — needs a production dump from the
  human. This is the phase's "done when", so Phase 12 stays open.

## Phase 11 — SEO module (2026-10-24)

### Fixed

- **The admin redirect manager did nothing** — `findActiveRedirect()`
  existed and worked correctly, but nothing in the real request path
  ever called it. `middleware.ts` now checks it before next-intl's own
  routing and returns a genuine 301/302, which needed opting the file
  into the Node.js middleware runtime (stable since Next 15.5).
- **No JSON-LD builder had unit tests** — `lib/seo/urls.ts`'s
  `absoluteUrl()` shared a file with `localeAlternates()`, which needs
  next-intl's navigation module and made every importer (including the
  JSON-LD builders) unresolvable under `vitest`. Split into
  `urls.ts`/`alternates.ts`.

### Added

- **`ProductGroup`, `ItemList`, `VideoObject` JSON-LD**, plus
  individual `Review` objects and real `shippingDetails` on
  `productJsonLd()` — all missing entirely before this phase.
- **A product's Open Graph image now falls back to its own photo**
  when no custom SEO image is set.
- **A "Create redirect" shortcut** on Admin → SEO's 404 log.
- **The sitemap is now a real index** split by type (pages, products,
  categories, brands, blog, videos, images), both locale variants,
  real `lastmod` — the video sitemap uses Google's proper extension.
- ADR 0022 (Phase 11 scope — most of the SEO wishlist already built;
  the redirect-manager bug was the headline finding).

## Phase 10 — Analytics module (2026-10-24)

### Fixed

- **`dashboard.ts`'s "purchase events this week" metric was silently
  broken** — queried the event name in the wrong case and always
  returned zero, regardless of real purchase volume.
- **`Search` events never recorded whether they matched anything** —
  now carry `resultCount`, enabling a zero-result-searches report.
- **`PageView` undercounted UTM attribution** — now carries the
  persisted last-touch UTM set, not just the current page's own URL
  params.

### Added

- **Categorized cookie consent** (necessary/analytics/marketing,
  replacing the old binary accept/reject) **+ Google Consent Mode v2**
  — both named explicitly in the master plan, neither existed before.
  `StorePixels` now loads analytics and marketing scripts under their
  own category independently.
- **A real Google Ads conversion event** on `Purchase`, distinct from
  GA4's own `purchase` event, when `adsId`/`adsLabel` are configured.
- **A lightweight visitor-id cookie** + real-time-visitor count.
- **New Admin → Analytics section** (`/admin/analytics`): traffic,
  sources/UTM, conversion funnel, product performance, search terms,
  real-time visitors — all reading live `TrackingEvent`/`Order` data.
- ADR 0021 (Phase 10 scope — most groundwork already built from Phase
  9; real gaps were the items above plus the broken dashboard metric;
  daily rollup tables reasoned out as premature for this site's
  current data volume).

## Phase 9 — Facebook/Meta module (2026-10-24)

### Fixed

- **`Purchase` fired before a gateway payment was actually confirmed** —
  an SSLCommerz/bKash/etc. order abandoned or declined at the gateway
  still reported a completed conversion to Meta/TikTok, corrupting
  ROAS/CPA reporting. Now fires at order creation only for COD; every
  other method fires once its payment reaches `PAID`.
- **The wishlist store defaulted to a hardcoded product** (`slugs:
["redmi-buds-4"]`) — every visitor saw it pre-wishlisted on every page
  load with no way they put it there.

### Added

- **`fbp`/`fbc` capture** (`src/lib/tracking/fbclid.ts`) through checkout
  into the CAPI `Purchase` payload — previously captured nowhere.
- **`AddToWishlist` event** — named in the master plan's event list but
  missing from the client/server/validation-schema trio that define
  tracked events.
- **Conversions API send logging + retry** — new `ConversionApiLog`
  table, a daily `POST /api/v1/cron/retry-conversions` job (capped at 5
  attempts), surfaced in Admin → Tracking's event list.
- ADR 0020 (Phase 9 scope — most of the master plan's wishlist already
  built across earlier phases; real gaps were the Purchase-timing bug
  above plus the three items listed).

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
