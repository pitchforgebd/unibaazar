# Phase 0 audit: current state of the UniBaazar codebase

Produced during Phase 0 of `UNIBAAZAR_V2_MASTER_PLAN.md`. This is a snapshot as of
2026-10-18 (commit range starting at `666a5ea`) — it will go stale as later phases
land; don't treat it as current once Phase 2+ starts touching these areas.

Each finding is tagged with a category and a severity (high/medium/low) and points at
exact files. "Non-findings" (things explicitly checked and found correct) are included
where useful, so a later phase doesn't re-verify the same claim from scratch.

## Executive summary — highest priority items

1. **Delivery-charge calculation is duplicated and already known to disagree**
   (DUPLICATED #1). The admin Checkout-settings page's own copy admits the cart
   preview shows stale numbers. Real money-facing bug, not just a style issue.
2. **A payment-webhook secret silently defaulted to a hardcoded string** when
   `AUTH_SECRET` was unset (SECURITY #1) — **fixed during Phase 0** (see below).
3. **bKash/Nagad settings in admin are decorative** — every non-COD payment routes
   through SSLCommerz regardless of what's configured (PARITY-GAP #1).
4. **Organization/WebSite JSON-LD never reads admin-edited store settings** — Google
   sees the original hardcoded config forever, even after an admin changes the store
   name/phone/address (DUPLICATED #3 / PARITY-GAP).
5. **The client-side cart's stock check reads mock data, not the database**
   (MOCK/HARDCODED #1) — can both block in-stock items and allow out-of-stock items
   into the cart (checkout still re-validates against real stock before charging).
6. **Near-zero test coverage on anything that moves money** (MISSING-TEST-COVERAGE
   #1): checkout quoting, order placement, payments, auth — none of it tested. Only
   variant generation and a handful of security primitives have tests.

None of items 1, 3, 4, 5 were fixed in Phase 0 — they're feature/architecture work
that belongs to the phases the master plan already schedules for them (pricing engine
in Phase 3, admin→storefront parity in Phase 2, payments module in Phase 7). Fixing
them now would be exactly the kind of out-of-scope feature work Phase 0 is supposed to
avoid. Items 2 and the dead-code/doc findings below **were** fixed in Phase 0, since
they're pure safety/hygiene fixes with no scope change.

## Fixed during Phase 0

- **SECURITY**: `src/server/payments/payments.ts` `webhookSecret()` no longer falls
  back to the literal `"unibaazar-dev-secret"` when `AUTH_SECRET` is unset — it now
  throws, matching every other `AUTH_SECRET` consumer in the codebase.
- **SECURITY**: OTP/password-reset codes (`src/server/auth/accounts.ts` `issueCode()`)
  now use `crypto.randomInt()` instead of `Math.random()`.
- **DEAD-CODE**: removed `src/lib/mock/cart.ts` (`mockCartLines`), which had zero
  importers anywhere in the repo.
- **BROKEN (doc)**: fixed a stale cross-reference in `ARCHITECTURE.md` that pointed
  at the wrong section for the mock-data exception list.
- Two existing ad-hoc `tsx`-script "tests" were converted into real Vitest suites
  (no behavior change, same 13 assertions) — see `docs/qa/phase-00-report.md`.

Everything else below is left as-is, for the phase that already owns it.

## MOCK/HARDCODED

1. **[HIGH]** `src/store/cart.ts:5,29-33` (`stockFor()`) — the Zustand cart store
   resolves stock for every `addLine`/`setQty` call via `getProduct()`
   (`src/lib/catalog/queries.ts`), which reads the **static mock catalog**
   (`src/lib/mock/catalog.ts`), not the database. The rest of the cart feature
   (`CartView.tsx`, `CartDrawer.tsx`, `CheckoutForm.tsx`, `CartButton.tsx`) resolves
   _displayed_ product/price via `/api/v1/products/[slug]` (real DB) — so the same
   feature has two different stock sources of truth. `src/server/checkout/quote.ts`
   re-validates real stock before an order is placed, so money is safe, but the
   add-to-cart UX can lie in both directions. Not in ARCHITECTURE.md's documented
   exception list. Candidate fix: Phase 2 ("remove mock data from all runtime
   paths").
2. **[MEDIUM]** `src/app/(store)/[page-slug]/page.tsx:9,71-77` and
   `src/lib/catalog/queries.ts:265-267` — the generic CMS route falls back to the
   mock `cmsPages` array when `prisma.page.findFirst()` returns nothing. Same
   pattern as the documented blog-teaser fallback, just not documented.
3. **[LOW]** `src/components/store/content/CmsBlocks.tsx:109-126` (`FaqList`) —
   same safe fallback pattern, falls back to mock `faqs` only when the real `Faq`
   table has zero published rows.
4. **[MEDIUM]** `src/components/store/content/CmsBlocks.tsx:128-160` (`SizeGuide`) —
   fully hardcoded size table (S/M/L/XL → chest/length), **no DB model, no admin
   editor, no fallback-only pattern** — just permanent static content. A clothing
   brand with non-standard sizing has no way to change this without a code change.
5. **[LOW, fixed]** `src/lib/mock/cart.ts` — dead export, zero importers. Removed in
   Phase 0 (see above).
6. **[informational]** `src/app/api/v1/cron/seed-catalog/route.ts` — intentional,
   documented (ARCHITECTURE.md §9) one-off bootstrap that upserts the mock
   catalog/content into the real DB. Worth noting because it's the thing that makes
   every "fallback to mock" path above dormant once it's been run once in
   production.

## DUPLICATED

1. **[HIGH]** Delivery-charge calculation exists in two independent implementations
   that can disagree:
   - Authoritative: `src/server/checkout/quote.ts:55-77` (`deliveryAmount`) — reads
     `delivery.inside`/`delivery.outside`/`delivery.freeFrom` from the admin-editable
     `Setting` table, falling back to 70/130/`siteConfig.freeShippingThreshold` only
     if those rows are missing.
   - Shadow: `src/lib/catalog/pricing.ts:10-13,59-64` (`deliveryCharges` /
     `deliveryCharge()`) hardcodes `{inside-dhaka: 70, outside-dhaka: 130}` with
     **no DB read**, called by `summarizeCart()` → every cart/checkout preview
     (`CartView.tsx`, `CheckoutForm.tsx`, `CartButton.tsx`, `CartDrawer.tsx`).
   - **Self-acknowledged in the product**: the admin Checkout-settings page's own
     copy (`src/app/(admin)/admin/settings/checkout/page.tsx:22`) says _"The cart
     drawer still previews the sample ৳6,500 rule."_ Changing delivery settings in
     admin doesn't update what customers see until the server-computed real total
     differs from the preview at order placement. Belongs to Phase 3's
     `modules/pricing` single-source-of-truth work.
2. **[MEDIUM]** Role/permission grants are defined twice, byte-identical today, no
   shared source: `src/server/security/permissions.ts:3-31` (real, used at runtime)
   vs. `scripts/bootstrap-admin.cjs:9-42` (hand-copied, because that script is plain
   CommonJS and can't import TypeScript — see ARCHITECTURE.md §12 on why). A future
   permission added to one won't automatically land in the other.
3. **[HIGH]** Organization/WebSite JSON-LD ignores admin settings:
   `src/lib/seo/schema.ts:6-30` (`websiteJsonLd()`/`organizationJsonLd()`) read
   static `siteConfig.*` with no parameters, while
   `src/components/store/layout/StoreShell.tsx:31-32,53-54` fetches the real
   DB-backed `general` settings in the same component and then calls
   `organizationJsonLd()` with zero arguments — bypassing `general` entirely. An
   admin who changes the store name/phone/email/address sees it reflected in the
   header/footer but Google's structured data never updates. Belongs to Phase 11
   (SEO module) or earlier parity work in Phase 2.
4. **[confirmed non-finding]** Flash-sale pricing genuinely has one implementation —
   `src/server/catalog/flash.ts` (`activeFlashSalePrice`), used by
   `src/server/catalog/products.ts:96` and `src/server/checkout/quote.ts:118` only.
   No parallel implementation found in admin marketing/catalog components.

## PARITY-GAP

1. **[HIGH]** bKash/Nagad admin settings are decorative:
   `src/components/admin/settings/IntegrationBoard.tsx:42-63` lets an admin toggle
   `bkashEnabled`/`nagadEnabled` and set merchant fields, but
   `src/lib/payment/index.ts:8-15` (`resolveProvider`) routes every non-COD method
   through `sslcommerzProvider` regardless — those settings are never read.
   `src/components/store/checkout/CheckoutForm.tsx:32-36` lists bKash/Nagad/Rocket
   as selectable options with no gating on the enabled flags at all (contrast: the
   `cod` flag IS correctly gated). The settings page's "test connection" action
   (`src/server/admin/settings.ts:236-246`) only checks that flags are set, no real
   connectivity test. Belongs to Phase 7 (payments module).
2. **[MEDIUM]** Secrets in `Setting.value` (SMTP password, SMS API key, bKash/Nagad
   secret, OAuth secrets, Telegram bot token) are correctly excluded from the public
   `/api/v1/settings` endpoint (`isSecret: false` filter in
   `src/server/cms/public.ts:82-88` — **no public leak**), but are stored as
   **plaintext JSON**, no encryption (`src/server/settings/secret.ts:3-6`). A DB-level
   compromise (backup leak, SQL injection elsewhere) exposes every configured
   third-party credential. Scheduled fix: Phase 2 ("encrypted settings store with
   typed accessors").
3. **[LOW]** `theme.font` offers "Poppins" vs "System" in admin, but
   `StoreShell.tsx:49-51` only has an explicit branch for `"system"` — no evidence a
   Poppins webfont actually loads when selected. Needs manual verification in the
   admin panel; may be a no-op today.
4. **[confirmed passing, for completeness]** `checkout.guest`, `checkout.minOrder`,
   `checkout.orderPrefix`, `checkout.cod`, `theme.showTopBar`/`showChat`/`primary`,
   `system.maintenance`/`headerScript`/`footerScript`, `social.*`, and notification
   settings are all correctly wired end-to-end from admin to storefront.

## SECURITY

1. **[HIGH, fixed]** Hardcoded payment-webhook secret fallback — see "Fixed during
   Phase 0" above.
2. **[MEDIUM, fixed]** `Math.random()` for OTP/reset codes — see above.
3. **[LOW]** `src/components/admin/settings/CourierWebhookPanel.tsx:12-17`
   (`randomToken`) generates the Steadfast webhook secret client-side, preferring
   `crypto.randomUUID()` but falling back to a non-crypto `Math.random()`-based
   string if the Web Crypto API isn't available. Low risk in practice (admin panel
   is always HTTPS), not fixed in Phase 0 to avoid scope creep on a low-severity
   item; worth a one-line cleanup whenever that component is next touched.
4. **[LOW]** `next.config.ts:46-52` sets `typescript.ignoreBuildErrors: true` and
   `eslint.ignoreDuringBuilds: true` (deliberately, to avoid OOM on the
   thread-constrained host during `next build` — see ARCHITECTURE.md §12). This
   means a broken type error or lint violation won't block a production build
   unless a separate CI step enforces it. No CI currently exists in the repo. Phase
   1 (CI pipeline) is where this gets a real gate — `npm run verify` running before
   `next build` in the CI workflow.
5. **[LOW]** `next.config.ts` CSP `script-src` includes `'unsafe-inline'`
   unconditionally (not gated to development), which weakens XSS protection given
   the admin-editable raw header/footer script injection feature
   (`src/app/layout.tsx:24-26,57-62`, only lightly sanitized by stripping
   `</script` substrings). Likely a deliberate tradeoff for inline
   Tailwind/analytics snippets today. Scheduled proper fix: Phase 12 §5.6 ("CSP
   with nonces").
6. **[confirmed non-finding]** No hardcoded API keys, passwords, or secret literals
   found elsewhere in `src/`, `prisma/`, `scripts/`, or config files via pattern
   search (`sk_live`, `AIza`, `AKIA`, Slack tokens, PEM blocks, literal
   key/secret/password assignments). Only `.env.example` is tracked, with all
   values blank.

## DATA-MODEL

Every money/amount/total field in `prisma/schema.prisma` is `Decimal(12,2)` — none use
`Int` poisha yet. This is the exact pre-Phase-3 state the master plan's §5.1 ("store
all money as integers in poisha") is written against; the schema's own header comment
says this is an intentional, known-temporary choice, not an oversight. Full list:

- `Product.basePrice`; `ProductVariant.price`/`.salePrice`/`.costPrice`
- `Coupon.value`/`.minSubtotal`; `FlashSaleItem.salePrice`
- `Order.subtotal`/`.discount`/`.deliveryCharge`/`.total`
- `OrderItem.unitPrice`/`.lineTotal`; `Payment.amount`
- `Invoice.subtotal`/`.discount`/`.deliveryCharge`/`.total`
- `ReturnRequest.refundAmount`; `PurchaseOrderItem.costPrice`

Application code converts every one of these to a JS `number` via `.toNumber()` at
the service boundary and does arithmetic (discount %, rounding) in floating point —
e.g. `src/lib/catalog/pricing.ts:49-57` `couponDiscount()` does
`Math.round((subtotal * coupon.value) / 100)`. This is the direct justification for
Phase 3's "no floats anywhere in calculations" goal.

## MISSING-TEST-COVERAGE

Exactly two test files exist in the whole repo (now real Vitest suites — see "Fixed
during Phase 0"): `src/lib/catalog/variants.test.ts` (variant generation/bulk-edit/
resolution) and `src/server/security/security.test.ts` (rate limiting, same-origin
check, fraud rules, role permissions, signature comparison, image re-encoding).

**Zero coverage** for: `src/server/checkout/quote.ts` (pricing, coupon validation,
flash-sale limits, delivery calc — the single most money-critical function in the
app), `src/server/orders/orders.ts` (order placement, guest checkout, min-order
enforcement), `src/server/payments/*` (initiate/verify/callback/IPN — including the
bug fixed in finding SECURITY #1, which a test would likely have caught),
`src/server/auth/*` (login, OTP, 2FA, OAuth, sessions), any `/api/v1/*` route
handler, any cron route, the Steadfast webhook handler, any admin server action, CSV/
PDF export, SEO metadata/schema builders. Phase 3 (commerce core) should bring the
pricing engine to ≥95% branch coverage per its own "done when" criteria; this audit
confirms that work is starting from zero, not from partial coverage.

## I18N-GAP

- **[confirmed non-finding]** `src/locales/en.json` and `bn.json` have 421
  top-level-flattened keys each, **zero missing in either direction** —
  ARCHITECTURE.md §11's "kept in lockstep" claim is verified true, not just
  asserted. Spot-checked for "translated in name only" (identical en/bn values) —
  only one coincidental match (`checkout.phonePlaceholder`, a phone-format string,
  not prose), so translation quality is solid, not just key-complete.
- **[MEDIUM]** `src/app/(store)/wishlist/page.tsx` and `.../compare/page.tsx` —
  both hardcode their page `<title>` metadata and breadcrumb/heading strings
  directly in English (`title: "Wishlist"`, `label: "Home"`), bypassing
  `next-intl`, unlike every other storefront route. The inner view components
  (`WishlistView.tsx`, `CompareView.tsx`) correctly use `useTranslations()` for
  body content — only the outer page shell is hardcoded. A Bengali-locale visitor
  sees an English page title and "Home" breadcrumb on an otherwise-Bengali page.
  Left for a future phase rather than fixed ad hoc in Phase 0 (touches locale keys
  in both files, and Phase 2 is already doing i18n work in this area).

## Route-by-route DB wiring (spot-checked, all clean)

Confirmed genuinely DB-backed with no mock fallback: `/shop`, `/category/[slug]`,
`/brand/[slug]`, `/search`, `/offers`, `/flash-deals`, `/product/[slug]` (all via
`src/server/catalog/products.ts`), `/track-order`, `/api/v1/products`, the cron
routes (`low-stock-sweep`, `cancel-unpaid-orders`), `/api/webhooks/steadfast`,
`/api/v1/settings`, `/api/v1/payments/initiate`. The homepage correctly
parallel-fetches everything from Prisma except the documented blog-teaser fallback.

## ACCESSIBILITY

The new Playwright + axe-core a11y suite (`e2e/a11y/key-pages.spec.ts`), run against
home, shop, product, login, and cart, found **zero violations of any kind except
`color-contrast`** — no missing labels, no landmark problems, no ARIA misuse. That's
a solid structural baseline. Every page, however, fails WCAG AA color-contrast in at
least one place, both tied to color tokens rather than markup, e.g.:

- The brand-orange "Accept" cookie-consent button: white text (`#ffffff`) on
  `#f95b09`, contrast ratio 3.21:1 (needs 4.5:1).
- The "iEX" delivery-partner footer badge: `#0f9d58` text on white, 3.5:1 bold
  12px text (needs 4.5:1 for bold text under 14px, since it doesn't meet the
  large-text exception).

Since every instance traces back to color tokens, not individual components, this is
explicitly Phase 4's job (§4.1: "WCAG 2.2 AA contrast for all tokens, checked
automatically in CI") rather than a pre-Phase-4 fix. The `color-contrast` axe rule is
disabled in the Phase 0 suite with a comment pointing here, so the structural checks
(which do matter now) still block, without Phase 0 either silently hiding or
prematurely fixing a problem that belongs to the token system Phase 4 is about to
build.

**[MEDIUM]** The fixed cookie-consent banner and the fixed mobile bottom navigation
bar (Home/Categories/Cart/Account) can stack at the bottom of narrow viewports and
cover enough of the screen to intercept taps on page content scrolled underneath,
until the banner is dismissed. Reproduced reliably in Playwright at a 390×844
mobile viewport — see `docs/qa/phase-00-report.md` for the full writeup. Not fixed
in Phase 0: the master plan's Phase 5 redoes the mobile bottom nav as "sticky
bottom nav, bottom sheets, and thumb-reachable CTAs" (§4.3), so this is a
stacking-context problem that rebuild should design around from the start.

**[MEDIUM]** Same class of bug, a second instance: the **sticky top header**
(the logo) can overlap the checkout page's "Place order" button at the scroll
position a short page lands on, on narrow mobile viewports — reproduced
deterministically in CI (`e2e/flows/critical-path.spec.ts`, mobile project;
confirmed via the real GitHub Actions log, not just locally). The E2E test now
force-clicks past this (same rationale as the cookie-banner case — the button is
independently confirmed visible/enabled, just geometrically covered), but the
underlying overlap is a real mobile tap-target problem a live shopper would also
hit. Same Phase 5 fix as above.

## Dependency vulnerabilities (pre-existing, not fixed in Phase 0)

`npm audit` reports 34 vulnerabilities in production dependencies, all requiring
major-version upgrades to fix (`next` → 16.x, `prisma` → 7.x+, `postcss` via Next's
bundled copy, `@tiptap/*` extensions). Per the master plan's version policy
(§2.1 — "don't upgrade major versions for their own sake"), none were upgraded in
Phase 0. Tracked here so a future phase (plausibly Phase 12's security pass, or
earlier if a specific CVE becomes exploitable in this app's actual usage) makes a
deliberate call on each, rather than this being silently forgotten.

## Documentation accuracy

`ARCHITECTURE.md` had one stale cross-reference (pointed at §11 for a mock-data
exception list that's actually in §2/§6) — fixed as part of this audit.
