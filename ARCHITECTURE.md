# UniBaazar — System Architecture

This document describes how the UniBaazar codebase is actually built, end to end. It
reflects the real structure of this repository, not a planned or aspirational one.

## 1. Tech stack

| Layer              | Technology                                                                      |
| ------------------ | ------------------------------------------------------------------------------- |
| Framework          | Next.js 15 (App Router), React 19, TypeScript                                   |
| Styling            | Tailwind CSS v4                                                                 |
| Database           | MySQL, via Prisma ORM 6                                                         |
| Client state       | Zustand (cart, wishlist/compare, toasts, UI flags)                              |
| Forms & validation | react-hook-form + zod                                                           |
| i18n               | next-intl (English + Bengali, URL-based locale prefix — see §11)                |
| Auth               | Custom session-cookie auth (no NextAuth) — see §5                               |
| Icons              | lucide-react                                                                    |
| Rich text          | Tiptap v2                                                                       |
| Animation          | `motion` (the current framer-motion successor) — see §4.2                       |
| Email              | Nodemailer                                                                      |
| Hosting            | cPanel (CloudLinux), Node.js Selector/Passenger, custom `server.js` entry point |

`src/middleware.ts` runs next-intl's locale middleware on every storefront route
(matcher excludes `/admin`, `/api`, static files) — see §11 for the full story,
including why this moved off cookie-based resolution in Phase 2.

## 2. Repository layout

```
prisma/              schema.prisma + migrations + seed.ts
src/
  app/
    [locale]/          next-intl locale segment ("en"/"bn", "as-needed" prefix)
      layout.tsx        real root layout for the storefront (<html lang>, fonts,
                         NextIntlClientProvider, header/footer scripts)
      (store)/          customer-facing route group — one folder per page
    (admin)/            admin dashboard — not localized, its own root layout
      admin/            one folder per admin module
    api/v1/           versioned REST-ish API routes consumed by both storefront
                       and admin client components
    api/webhooks/     inbound webhooks (courier status updates)
    fonts.ts, metadata.ts   shared between the two root layouts
  middleware.ts        next-intl locale middleware (storefront routes only —
                        matcher excludes /admin, /api, static files)
  modules/              domain business logic, introduced in Phase 3 (ADR 0010
                        deferred the bulk src/server/* -> modules/ move; these
                        three are the first real modules, built as the natural
                        shape of Phase 3's own work rather than a separate
                        reorganization task — see ARCHITECTURE.md §4):
    pricing/            the only place price/discount/delivery/total are
                        computed — money.ts's integer-poisha type, quote.ts's
                        pure computeQuote(), promotions.ts's coupon
                        eligibility rules, delivery.ts
    inventory/          stock reservations (hold at quote time, settle at
                        order placement) and the flash-sale qty-limit guard,
                        both concurrency-safe and tested as such
    orders/             the order status transition graph and the one
                        function (transitionOrder()) allowed to change
                        Order.status
  components/
    store/            storefront UI, organized by feature (layout, home, product,
                       shop, cart, checkout, account, auth, order, lists, content)
    admin/            admin UI, organized by module (catalog, content, marketing,
                       customers, orders, security, seo, settings, users, common)
    ui/                generic primitives (Container, button/field class helpers)
    layout/           root-layout pieces shared between the storefront and admin
                       root layouts (header/footer script injection)
    forms/, seo/      shared form + structured-data helpers
  server/              server-only business logic, one folder per domain
                       (catalog, checkout, orders, payments, auth, account, admin,
                       cms, courier, cron, security, seo, settings, tracking,
                       cache — the revalidateTag tag vocabulary)
  lib/                 shared utilities split between client-safe (catalog, cart,
                       orders session cache, utils) and server-leaning (email, sms,
                       payment, courier, security, seo, validation, pricing),
                       plus logger.ts (pino + the reportError() funnel)
  store/               Zustand stores (cart, lists, toast, ui)
  locales/             en.json / bn.json message catalogs for next-intl
  i18n/                routing.ts (locales/prefix config), navigation.ts
                       (locale-aware Link/useRouter/usePathname/redirect),
                       request.ts (resolves the middleware-set locale)
  config/site.ts        static site config (nav links, social, structural copy)
server.js              custom Node HTTP server wrapping Next's request handler
```

**Mock data** (`src/lib/mock/*`, `catalog.ts`/`content.ts`) was the Phase-1
prototype's data source. As of Phase 2, it's used **only** as seed-data content
— via `prisma/seed.ts` and the "Seed demo catalog" job in Admin → Maintenance
(see §9; the old `seed-catalog`/`bootstrap-admin` cron routes were removed and
replaced by that module). Every runtime fallback-to-mock path found in the
Phase 0 audit (homepage blog teaser, the generic CMS route, the FAQ block, the
blog listing/detail pages, and the Zustand cart store's stock check) was
removed; each now either shows a real empty state or reads the real database,
including the cart, which resolves stock via the same
`/api/v1/products/[slug]` endpoint the product page uses instead of the mock
catalog. See `docs/audit/current-state.md` for the original findings and the
Phase 2 QA report for what replaced each one.

## 3. Rendering strategy (storefront)

As of Phase 2 of the v2 rebuild, every storefront route lives under
`src/app/[locale]/(store)/` (see §11) and is one of these rendering modes:

- **Fully dynamic (`ƒ`)** — `/shop`, `/search`, `/cart`, `/checkout`, `/account/*`,
  `/login`, `/register`, `/offers`, `/flash-deals`, `/category/[slug]`,
  `/brand/[slug]`, etc. Rendered fresh per request. Category and brand are
  _justified_-dynamic specifically because both read `searchParams` server-side
  for filtering, which forces per-request rendering in Next.js regardless of any
  caching directive (see `docs/decisions/0008-product-page-justified-dynamic-not-isr.md`)
  — their underlying data reads are still cached, just not the page HTML.
- **ISR with known params (`●`, real `generateStaticParams`)** — `/blog/[slug]`,
  `/blog`, and the generic CMS route `/[page-slug]` (contact-us, faq, size-guide,
  and any database-backed `Page`). These are prerendered for their known slugs
  (queried from the real database at build time, not a hardcoded list — see §6)
  and revalidate on a timer (`revalidate = 300`) plus `revalidateTag`/`revalidatePath`
  from the relevant admin write.
- **Plain dynamic, cached data layer** — `/product/[slug]`. Page-level ISR
  (`generateStaticParams() { return []; }`) was the original pre-regression
  design intent here too, but testing found a Next.js 15.5.27 bug where the
  _second_ locale value under `[locale]`'s own `generateStaticParams`
  consistently 500s — see ADR 0008 for the full story. The page renders per
  request; `getStoreProduct()` (`src/server/catalog/products.ts`) is wrapped in
  `unstable_cache` with tag-based on-demand invalidation
  (`src/server/cache/tags.ts`, fired from `src/app/(admin)/admin/catalog-actions.ts`'s
  `refreshCatalog()`), so the expensive DB query is still cached even though the
  HTML isn't.

Admin routes (`src/app/(admin)/`, not under `[locale]`) are not statically
generated at all; every admin page requires a live session check against the
database on each request.

## 4. Data layer

`prisma/schema.prisma` defines ~60 models, grouped by domain:

- **Identity & access**: `Role`, `Permission`, `RolePermission`, `User`,
  `AuthSession`, `LoginEvent`, `SocialAccount`, `AuthCode` (OTP/reset codes)
- **Customers**: `Customer`, `Address`
- **Catalog**: `Category`, `Brand`, `Unit`, `Label`, `Attribute`,
  `AttributeValue`, `Product`, `ProductCategory`, `ProductLabel`,
  `ProductAttribute`, `ProductImage`, `ProductVariant`,
  `VariantAttributeValue`, `ProductRelation`
- **Inventory**: `Warehouse`, `InventoryLog`, `Supplier`, `PurchaseOrder`,
  `PurchaseOrderItem`, `StockReservation` (Phase 3 — a short-lived hold on
  stock between a cart quote and order placement; see §4.1)
- **Marketing**: `Coupon`, `FlashSale`, `FlashSaleItem` (its `soldCount`
  column, added in Phase 3, is the atomic running total checked against
  `qtyLimit` — see §4.1), `Campaign`, `Banner`, `Slider`
- **Cart & orders**: `Cart`, `CartItem`, `Wishlist`, `Order`, `OrderItem`,
  `OrderStatusHistory`, `Payment`, `Shipment`, `CourierWebhookLog`, `Invoice`,
  `ReturnRequest`
- **Engagement/content**: `Review`, `ProductQuestion`, `Page`, `BlogCategory`,
  `BlogPost`, `Menu`, `MenuItem`, `Faq`, `Testimonial`, `HomeVideo`,
  `HomeSection`, `Subscriber`
- **Platform**: `Setting` (key/value store backing every admin settings screen),
  `SeoMeta`, `NotFoundHit`, `Redirect`, `SmsLog`, `EmailLog`, `Notification`,
  `NotificationDedupe`, `AuditLog`, `TrackingEvent`, `ConversionApiLog`

`Setting` is the generic persistence mechanism for everything configured in
Admin → Settings (general/branding, theme, social links, checkout, invoice,
system/integration keys) — read via `src/server/settings/store.ts`.

### 4.1 Commerce core (`src/modules/pricing`, `inventory`, `orders` — Phase 3)

Money, stock, and order status each now have exactly one place they're
computed or changed, closing three real bugs the Phase 0 audit and Phase 3's
own research found:

- **Pricing** (`src/modules/pricing`): every calculation is integer
  **poisha** (1 BDT = 100 poisha) arithmetic — `money.ts`'s branded `Poisha`
  type converts to/from the DB's `Decimal(12,2)` columns using Decimal's own
  exact math, never a float round-trip. `quote.ts`'s `computeQuote()` is a
  pure function (no DB access) that both the storefront's live checkout
  quote and order placement call, via the thin DB-touching wrapper in
  `src/server/checkout/quote.ts`. This is what fixed the delivery-charge
  duplication bug: that file used to read admin-set `Setting` rows while
  `src/lib/catalog/pricing.ts` hardcoded 70/130/6500 and could silently
  disagree — both the checkout page's live price (via
  `useCheckoutQuote`/`/api/v1/cart/quote`) and the actual order total now
  come from the same `deliveryCharge()` call. `codCharge`/`vat` exist on the
  `Quote` type per the master plan's shape but are intentionally inert — see
  `docs/decisions/0012-phase-3-scope-core-correctness-first.md`.
- **Inventory** (`src/modules/inventory`): `reserveStock()` holds stock for
  a cart (identified by an opaque `reservationToken` the client mints and
  persists — `src/store/cart.ts`) by decrementing `ProductVariant.stock`
  immediately, atomically (`updateMany({ stock: { gte: qty } })`, the same
  guard the pre-Phase-3 code used only at the very last step);
  `commitStock()` settles it at order placement. `incrementFlashSold()`
  closes a real oversell race: flash-sale `qtyLimit` used to be enforced by
  a non-transactional `COUNT(OrderItem)` query with no lock, so two
  concurrent checkouts near the limit could both pass it. Both guarantees
  are concurrency-tested against the real test database (fire N parallel
  requests at stock/qtyLimit = 1, assert exactly one wins) — see
  `src/modules/inventory/tests/*.integration.test.ts`.
- **Orders** (`src/modules/orders`): `state-machine.ts`'s
  `ALLOWED_TRANSITIONS` is the first explicit transition graph
  `Order.status` has ever had — before Phase 3, `setOrderStatus()` would
  let a `DELIVERED` order move straight back to `PENDING`, no questions
  asked. `transitionOrder()` is now the one function allowed to change
  `Order.status`, called from every status-changing path (admin actions,
  the SSLCommerz IPN handler, courier booking/sync, the Steadfast webhook,
  the `cancel-unpaid-orders` cron, and the customer-facing cancel/return
  actions). See `docs/decisions/0013-order-state-machine-transition-graph.md`
  for why the graph allows forward skips across the pre-shipment pipeline
  but never backward movement or an exit from a terminal status.

### 4.2 Design system (`src/lib/theme`, `src/components/ui`, `src/components/motion` — Phase 4)

- **Theme tokens**: `src/lib/theme/presets.ts` defines 4 presets (Bazaar —
  default, orange; Luxe — dark, gold; Fresh — green; Tech — blue) as sets
  of CSS custom properties, reusing the existing semantic Tailwind color
  names (`primary`, `ink`, `page`, `card`, `foreground`, `muted`, plus one
  new one, `accent`) rather than introducing an unused `brand-50…950`
  scale. `tailwind.config.ts`'s colors all resolve through
  `rgb(var(--color-x) / <alpha-value>)`, so opacity modifiers
  (`bg-primary/10`) keep working. `src/lib/theme/styleTag.ts` renders the
  active preset as a `:root{...}` `<style>` tag, injected per request in
  `src/app/[locale]/layout.tsx` from the admin's saved `theme.presetId`
  setting — switching presets in Admin → Settings → Theme (a live swatch
  picker with its own scoped preview, `ThemePresetPicker`) takes effect on
  the very next page load, no rebuild. Admin itself never re-skins with
  these — `src/styles/globals.css`'s static `:root` fallback (hand-kept
  in sync with the Bazaar preset, checked by a test) is what every admin
  page renders with, unconditionally. Every preset's token pairings that
  matter (ink/foreground vs. page/card, white text on primary/primaryDark)
  are WCAG AA contrast-tested (`src/lib/theme/presets.test.ts`,
  `src/components/ui/tokenPairs.test.ts`) — see
  `docs/decisions/0014-theme-token-architecture.md` for the real bugs this
  caught (the brand orange itself failed AA) and
  `docs/decisions/0015-phase-4-scope-notes.md` for what "admin-editable
  tokens" does and doesn't cover yet (preset selection, not independent
  per-token overrides or a density axis).
- **`src/components/ui`**: Button, IconButton, Input, Textarea, Select,
  Checkbox, RadioGroup/Radio, Badge, Tooltip, Dialog, AlertDialog, Sheet,
  Tabs, Spinner, and `toast/ToastStack` (a successor to the existing
  `Toaster` — both read the same `src/store/toast.ts` queue; only one
  should be mounted on a given screen). Dialog/AlertDialog/Sheet share one
  native-`<dialog>`-based engine (`ModalRoot`/`useModalDialog`) with
  ref-counted scroll lock and focus return. Adopted across the storefront's
  real customer journey in Phase 5 (homepage, listing, product, cart,
  checkout, account, order success, wishlist/compare — see
  `docs/decisions/0016-phase-5-scope-storefront-rebuild.md` and
  `docs/qa/phase-05-report.md`). Adopted across every admin module in
  Phase 6 (see `docs/decisions/0017-phase-6-scope-admin-rebuild.md` and
  `docs/qa/phase-06-report.md`) — `components/ui`/`components/motion` are
  now the primary toolkit everywhere in the app except the handful of
  legacy `buttonClass`/`fieldClass` (`src/components/ui/controls.ts`)
  call sites intentionally left outside both phases' scope.
- **`src/components/motion`**: `Reveal`, `Stagger`/`StaggerItem`,
  `PressScale`, `flyToCart`/`useFlyToCart`, `CountUp`, `Marquee`,
  `Shimmer`, `ShakeOnError`, `PageTransition` — built on the `motion`
  library (the current framer-motion successor) against shared
  duration/easing/spring tokens (`tokens.ts`). Every primitive degrades
  under `prefers-reduced-motion` (checked via `usePrefersReducedMotion()`,
  or handled in plain CSS for `Marquee`/`Shimmer` so it's correct before
  any JavaScript runs). `Reveal`/`Stagger`'s shared hidden/visible variants
  set `visibility` alongside `opacity` (Phase 5 fix) so not-yet-revealed
  content is excluded from the accessibility tree and tab order, not just
  invisible — the same convention `StickyBuyBar` uses via `inert`.
- **`/_design`** (`src/app/[locale]/%5Fdesign/page.tsx` — the `%5F`
  escapes Next.js's "folders starting with `_` are excluded from
  routing" convention, since the literal URL needs to start with `_`):
  shows every primitive above, in every preset, in both locales. Blocked
  in real production (`process.env.NODE_ENV === "production"`, force-
  dynamic so the check can't get baked in at build time) except when
  `ALLOW_DESIGN_ROUTE=1` — set only in `.env.test`/CI, never in a real
  deploy, so Playwright's a11y and visual-snapshot suites can still cover
  the route.

## 5. Authentication & authorization

There is no third-party auth library. Sessions are custom:

- `AuthSession` rows backed by an HTTP-only cookie, created on login/register and
  checked server-side on every protected request (`src/server/auth/*`).
- `AuthCode` handles OTP (phone verification, 2FA codes, password-reset codes).
- `SocialAccount` + the `/api/v1/auth/oauth` route support social sign-in, which
  lands the user on `/register/social` to supply a Bangladeshi phone number before
  the account is considered complete.
- `LoginEvent` logs login attempts (used by the security test suite and admin
  audit views).

**Authorization** is role/permission based, not ad hoc:

```
permissions: catalog.manage, orders.manage, customers.manage, content.manage,
             reports.view, settings.manage, users.manage

roles:
  super-admin     → all permissions
  admin           → all permissions
  manager         → catalog, orders, customers, reports
  staff           → orders only
  content-editor  → catalog + content
  accountant      → reports only
  customer        → none (storefront account, not staff)
```

`src/server/admin/access.ts` exposes one `require*()` guard per domain
(`requireCatalog`, `requireOrders`, `requireContent`, etc.) that every admin server
action calls first — authorization is enforced server-side, never by hiding a
button in the UI. One guard, `requireSuperAdmin()`, is role-based rather than
permission-based: `admin` and `super-admin` hold identical permission grants (see
the table above), so a `roleAllows()` check can't tell them apart, and the Admin →
Maintenance module (§9) needs exactly that distinction.

## 6. Storefront feature map

Homepage (`src/app/[locale]/(store)/page.tsx`) assembles, in parallel: categories,
hero slider + side banners (`publicBanners()`), featured/recent/best-seller product
rails (all filtered from one real `listStoreProducts()` call), an active flash sale
with a real countdown, testimonials, up to 4 homepage videos, and a blog teaser
section — real published posts only; the section is omitted entirely when none
exist (see §2's mock-data note).

Product browsing: `/shop`, `/category/[slug]`, `/brand/[slug]`, `/search`, `/offers`,
`/flash-deals` all share `ProductListing`/`ProductCard` and the same filter/sort/
pagination vocabulary. Flash-sale pricing is computed once in
`src/server/catalog/flash.ts` (`activeFlashSalePrice`) and reused identically for
display and for checkout pricing — the two can never disagree.

Product detail (`/product/[slug]`): purchase panel (variant selection, wishlist,
compare, WhatsApp order link), tabs for description/reviews/Q&A with their own
submission forms, related products, recently-viewed (client-side slug list resolved
against the real product API, not mock data).

Cart/checkout: Zustand cart store persists line items client-side; pricing, stock
validation, and coupon/flash-sale eligibility are **always** re-verified server-side
in `src/server/checkout/quote.ts` (`/api/v1/cart/quote`) before an order is placed —
the client never sets its own price.

Account area: dashboard, order history/detail, addresses, profile, password — all
backed by real `/api/v1/account/*` routes, not local-only state.

## 7. Admin panel feature map

One module per catalog/marketing/content domain under `src/app/(admin)/admin/*`,
each pairing a React board component (`src/components/admin/*`) with server actions
in a matching `src/server/admin/*` file and a `*-actions.ts` "use server" file under
the route itself. Coupons, flash sales, banners/sliders, FAQ, and testimonials all
have full create/edit/delete, not just create. The rich-text editor
(`RichTextField.tsx`, Tiptap-based) is shared across product descriptions, blog
posts, CMS pages, and category descriptions, with inline image upload wired to a
permission-appropriate upload action (`catalog.manage` vs `content.manage`).
Admin → Maintenance (super-admin only) is the one exception to "one module per
domain" — it's a registry of idempotent one-off jobs (cache clear, demo-catalog
seed, admin bootstrap, resumable media-variant backfill) rather than a CRUD
module; see §9.

Admin → Analytics (Phase 10, `reportsAccess()`-gated — same audience as
Admin → Reports) reads `TrackingEvent`/`Order` live rather than through a
pre-aggregated rollup table: traffic, UTM-attributed sources/revenue, a
ViewContent→AddToCart→InitiateCheckout→Purchase funnel, per-product
performance, top/zero-result search terms, and a polled real-time-visitor
count (`src/server/admin/analytics.ts`).

Access control is role/permission based (`src/server/security/permissions.ts`'s
`roleGrants`, backed by `Role`/`Permission`/`RolePermission` in the schema), with
one `*Access()`/`require*()` pair per domain in `src/server/admin/access.ts`.
Covered end-to-end by `e2e/rbac/admin-roles.spec.ts` (Phase 6) — logs in as each
staff role and asserts it sees only the modules its permissions grant. Every
mutating action calls `recordAudit()`, either inside its `src/server/admin/*`
function or its `*-actions.ts` wrapper (the codebase uses both patterns
depending on the module — check the specific file before assuming which); swept
for completeness in Phase 6 (`docs/qa/phase-06-report.md`).

## 8. API layer

`src/app/api/v1/*` is the one REST-ish surface consumed by both storefront client
components and (for a few endpoints) external systems:

- `auth/*` — login, register, logout, refresh, forgot/reset, OTP, 2FA, OAuth
- `account/*` — profile, addresses, password, order history (customer-scoped)
- `products`, `categories`, `brands`, `search`, `posts`, `pages`, `menus`,
  `banners` — public read endpoints backing the storefront
- `cart/quote` — the single source of truth for authoritative pricing
- `orders`, `orders/track` — order creation and guest tracking
- `payments/*` — gateway initiate/verify/callback/webhooks. COD and
  SSLCommerz are real, working providers (`src/lib/payment/`);
  SSLCommerz acts as an aggregator for bKash/Nagad/Rocket/card today,
  not 4 separate direct integrations — see
  `docs/decisions/0018-phase-7-scope-payment-module.md`. SSLCommerz
  credentials come from Admin → Settings → Integrations (encrypted),
  falling back to `.env` for local dev. `modules/payments/` (Phase 7)
  governs every payment-status change through an explicit transition
  graph, the same shape `modules/orders` already uses for order status.
- `contact`, `newsletter` — public lead-capture forms
- `tracking` — browser-side pixel events (`src/lib/tracking/browser.ts`'s
  `track()`), logged to `TrackingEvent`. Meta/TikTok Conversions API
  `Purchase` events are sent server-side, not through this route — see
  `src/server/tracking/signals.ts` and
  `docs/decisions/0020-phase-9-scope-facebook-meta-module.md`. `Purchase`
  fires at order creation only for COD; every other payment method fires
  once its payment actually reaches `PAID` (Phase 9 fixed a real bug
  where it previously fired for every method at creation, reporting
  unpaid gateway orders as completed conversions).
- `cron/*` — `CRON_SECRET`-gated **scheduled** maintenance endpoints (see §9)
- `webhooks/steadfast` — inbound courier status updates
- `admin/analytics/live` — polled by Admin → Analytics' real-time-visitor
  widget; the only admin API route gated by `reports.view` rather than a page

Cookie consent (Phase 10) is three categories — necessary (implicit),
analytics, marketing — stored as JSON under the same `localStorage` key
the old binary accept/reject banner used (`parseConsentValue()` in
`src/lib/tracking/browser.ts` still reads a legacy bare `"accept"`/
`"reject"` value from before this phase). `StorePixels.tsx` loads GA4/
GTM/Clarity/Hotjar under analytics consent and Meta/TikTok/Pinterest/
Snap under marketing consent independently, and pushes Google Consent
Mode v2 signals (`gtag("consent", ...)`) on load and on every later
consent change.

Outbound notifications (`src/lib/sms/`, `src/lib/email/`) are consumed by
server code, not exposed as their own API routes. Every `sendSms`/`sendEmail`
call logs to `SmsLog`/`EmailLog` (browsable at Admin → Orders →
"Notification logs", Phase 8) and renders a shared branded HTML layout
(`src/lib/email/template.ts`) alongside the plain-text body it always sent.
An optional `dedupeKey` makes a send idempotent via `src/lib/notify/dedupe.ts`'s
`NotificationDedupe` table (same unique-constraint-claim shape
`modules/payments`' webhook idempotency uses) — used by order-status notices
and the abandoned-cart reminder so a cron re-run or a raced request can't
double-send. `src/lib/sms/bulksmsbd.ts` picks GSM-7 `text` vs `unicode` mode
per-message (`needsUnicode()`) instead of always sending `text`, which
silently garbled any Bengali-language template before Phase 8.

**SEO** (Phase 11): `/sitemap.xml` is a `<sitemapindex>`
(`src/app/sitemap.xml/route.ts`) pointing at seven per-type children under
`src/app/sitemaps/*.xml` (pages, products, categories, brands, blog,
videos — the last using Google's real video-sitemap extension, not a
plain URL list — plus the pre-existing `image-sitemap.xml`), each entry
carrying both locale variants and real `lastmod`; the shared XML builders
live in `src/server/seo/sitemap.ts`. JSON-LD (`src/lib/seo/schema.ts`):
`WebSite`/`Organization` (global, in `StoreShell`), `BreadcrumbList`,
`Product` (with `Review`/`shippingDetails`) or `ProductGroup` once a
product has more than one variant, `ItemList` (every `ProductListing`-
backed page), `VideoObject`, `FAQPage`, `Article`. `src/middleware.ts`
checks the admin-managed `Redirect` table before anything else runs,
issuing a real 301/302 — see §11 for why that needed the Node.js
middleware runtime.

## 9. The `cron/*` pattern (specific to this host) and Admin → Maintenance

`src/app/api/v1/cron/*` are POST routes gated by `assertCronSecret()`
(`src/server/cron/auth.ts`, compares a bearer token against `CRON_SECRET`). They
exist for recurring scheduled maintenance only — `low-stock-sweep`,
`cancel-unpaid-orders`, (Phase 7) `payment-reconciliation`, (Phase 8)
`abandoned-cart`, and (Phase 9) `retry-conversions` — invoked by a real
cron entry (see `DEPLOYMENT.md`).

Two routes used to live here for a different reason: **one-off database bootstrap
operations** (`bootstrap-admin`, `seed-catalog`) that would normally be a CLI script
run once during deployment, reachable through a curl'd route instead because
standalone `node`/`tsx` processes reliably crash on this host (see §12). As of
Phase 2, those two are gone — their logic moved, unchanged (still upsert-based, safe
to re-run), into **Admin → Maintenance**
(`src/app/(admin)/admin/maintenance/page.tsx`, super-admin only): a job registry
(`src/server/admin/maintenance/jobs.ts`) a staff member triggers from the admin UI
instead of curl, still executing inside the same already-running, already-warm
application process. The module also replaces the ad hoc "run it once and hope" of
those cron routes with a `MaintenanceJobRun` log (who ran what, when, and the
result) and additional jobs: a tag-aware cache-clear button (fires
`revalidateTag` for every tag in `src/server/cache/tags.ts`, not just
`revalidatePath`), a resumable media-variant backfill (`generateImageVariants()`,
§12), and stated no-ops for sitemap rebuild/search reindex (neither has a real
artifact to rebuild on this codebase — see the module's own code comments for
why).

## 10. Security measures

Rate limiting is keyed on **identity first, IP second** (Phase 13, ADR
0024). The tight limit keys on the phone/email a request acts on
(SHA-256 hashed, so the limiter table holds no raw PII); the per-IP
limit is a loose flood backstop set about an order of magnitude higher.
The reason is local: Bangladesh's mobile carriers put huge numbers of
subscribers behind one CGNAT IPv4, so an IP-keyed counter measures NAT
pool busyness, not one person — the previous flat `5 orders/day/IP`
would have refused the 6th order of the day from an entire carrier, and
`5 OTPs/15min/IP` would have throttled real logins at peak. Daily order
caps follow the same shape: phone 5, device 5, IP 40. `clientIp()`
counts `TRUSTED_PROXY_HOPS` (default 1) from the **right** of
`X-Forwarded-For`, because the leftmost entry is client-supplied and
previously let anyone choose their own rate-limit key.

Storage runs in two tiers (Phase 12). The security-sensitive write
buckets §5.6 names — login, OTP, checkout, contact, newsletter, all
funnelled through `guardWrite()` — are **DB-backed**
(`src/server/security/rate-limit-db.ts`, `RateLimitHit`), so a limit
survives a restart; the in-memory limiter
(`src/server/security/rate-limit.ts`) is kept only for the high-volume
telemetry routes (`/api/v1/tracking`, `/api/v1/seo/miss`), where a DB
write per page view would cost more than the limit is worth. Because the
limits now persist, `e2e/global-setup.ts` clears them before each
Playwright run — the parity suite alone performs exactly the login
limit's worth of logins.

CSRF: auth cookies are `sameSite: "lax"`, and every session-authenticated
mutating API route additionally calls `assertSameOrigin` inside
`handle()` (so a cross-site attempt returns 403, not 500). The `Secure`
flag on auth cookies follows `NEXT_PUBLIC_SITE_URL`'s scheme rather than
`NODE_ENV` (`src/server/security/cookies.ts`) — a production build served
over plain http for local/CI testing must not set `Secure`, because
WebKit stores but never sends such a cookie, which made every
authenticated flow untestable in Safari.

- Rich text and any other user-supplied HTML is passed through
  `sanitizeRichText()` (`src/lib/security/sanitizeHtml.ts`) — an explicit tag/
  attribute allowlist, no script/style/event handlers, scoped `style` (only
  `text-align`).
- Cloudflare Turnstile captcha is opt-in: `assertCaptcha()` silently no-ops until
  both `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` are configured,
  in every environment including production — it must never hard-block login/
  checkout just because keys haven't been set yet.
- Cron/webhook endpoints use constant-time signature comparison
  (`src/server/security/signature.ts`).
- Validation messages shown to the user come from shared zod schemas
  (`src/lib/validation/customer.ts`) used by both the client (react-hook-form) and
  the server (API routes re-validate independently — the client is never trusted).
- `src/server/security/security.test.ts` and
  `src/lib/catalog/variants.test.ts` are the two existing regression tests
  (`npm run test:security`, `npm run test:variants`).

## 11. Internationalization

As of Phase 2, `next-intl` is **URL-prefixed** with `localePrefix: "as-needed"`
(`src/i18n/routing.ts`): English stays unprefixed (`/shop`), Bengali lives under
`/bn` (`/bn/shop`). `src/middleware.ts` runs `next-intl`'s middleware on every
storefront route (matcher explicitly excludes `/admin`, `/api`, static files —
admin isn't localized, see below); it resolves the locale from the URL segment
(falling back to the `NEXT_LOCALE` cookie / `Accept-Language` for the bare `/`
path) and redirects an unprefixed path to its `/bn/...` form when the cookie
names Bengali — this is what makes the existing `LanguageToggle` component work
unchanged (it just sets the cookie and calls `router.refresh()`).

As of Phase 11, `middleware.ts` checks `findActiveRedirect()` against the
admin-managed `Redirect` table _before_ any of the above runs, returning a
real 301/302 when a path matches — the admin redirect manager existed since
an earlier phase but nothing had ever called that lookup function until
then (`docs/decisions/0022-phase-11-scope-seo-module.md`). A genuine
301/302 needs Prisma, which the default Edge middleware runtime can't run,
so the file opts into `runtime: "nodejs"` (stable since Next 15.5) —
meaning this middleware now runs in the Node.js runtime, not Edge; every
matched request pays one indexed-primary-key lookup before next-intl's own
routing runs.

The entire `(store)` route group lives under `src/app/[locale]/(store)/`.
`src/app/[locale]/layout.tsx` is the real root layout for the storefront
(`<html lang={locale}>`, `NextIntlClientProvider`, fonts, header/footer scripts);
it calls `setRequestLocale()` and has its own `generateStaticParams` (`en`/`bn`).
`src/i18n/request.ts` resolves the locale from that middleware-set `requestLocale`
now, not a cookie read — this is also what fixed the `DYNAMIC_SERVER_USAGE` bug
described in the old version of this section (the root cause was the _cookie
read inside the render path_, not Bengali itself).

**Admin is not localized** (`src/app/(admin)/`, outside `[locale]`, its own root
layout) — confirmed zero `useTranslations`/`getTranslations` usage anywhere in
`src/components/admin/` or `src/app/(admin)/`, consistent with the master plan's
explicit permission to leave admin unprefixed (§2.2). Storefront client
components use locale-aware `Link`/`useRouter`/`usePathname`/`redirect` from
`src/i18n/navigation.ts` (not `next/link`/`next/navigation` directly) so
in-app navigation stays within the current locale.

`hreflang`/`x-default`: two mechanisms, both active. next-intl's middleware
sets an HTTP `Link` response header (`alternateLinks: true`, the default) on
every storefront response. On top of that, `src/lib/seo/alternates.ts`'s
`localeAlternates(path)` (built on next-intl's `getPathname` — split out of
`urls.ts` in Phase 11, since that one function's next-intl import made every
importer of `urls.ts`'s `absoluteUrl()`, including the JSON-LD builders in
`lib/seo/schema.ts`, unable to run under `vitest`) feeds
per-page HTML `<link rel="alternate" hreflang="...">` tags via
`generateMetadata` — wired into every page using `src/lib/seo/metadata.ts`'s
`buildMetadata()` (product, category, brand, blog post, CMS, search) plus
the homepage and `/blog`. This is deliberately belt-and-suspenders: Google's
own guidance treats the HTML `<link>` form (or a sitemap entry) as the
reliable signal for HTML pages and the HTTP header as the fallback for
non-HTML content, so the header alone — correct as it is — wasn't enough to
satisfy the master plan's Phase 2 "done when" criterion on its own. Cart,
login, register, offers, and flash-deals don't set their own `alternates`
yet (lower priority — robots.txt already disallows the ones that matter
most for indexing, `/account`, `/checkout`, `/search`); extending them is a
cheap follow-up, not tracked as a blocking gap.

Client components use `useTranslations()` (reads from `NextIntlClientProvider`
context), server components/pages use `await getTranslations()`. Both locale
files are kept in lockstep — every key that exists in one must exist in the
other (confirmed via a flattened key-set diff during the Phase 0 audit: 421
keys each, zero mismatches, and this hasn't regressed since).

Validation error messages are a special case: because the zod schemas in
`src/lib/validation/customer.ts` are shared with server-side API routes (which
don't have a clean way to pick a per-locale message without threading a translator
through every route), the messages stay in English at the schema level. Client
forms translate them for display only, via a lookup table
(`src/lib/validation/messages.ts`) that maps the known English message to its
`validation.*` key — a deliberately narrow fix rather than a schema refactor.

## 12. Hosting reality and the gotchas that follow from it

This matters enough to call out explicitly, because it has caused two separate
classes of bugs:

**The host has a hard ~5 OS-thread ceiling per process.** This breaks, in order of
how it was discovered: Next.js's build worker pool (fixed with
`experimental.cpus: 1` in `next.config.ts`), any freshly-spawned `node`/`tsx`
process trying to cold-start the Prisma query engine (works fine only inside the
already-running, warm Passenger-managed process — see §9), and esbuild entirely.
For the same reason, `src/server/media/variants.ts` calls
`sharp.concurrency(1)` unconditionally at module load — sharp's default
thread pool alone can exceed the ceiling under concurrent uploads.
**Practical consequence**: `npm run build`, `prisma migrate deploy`, and
`npm run db:seed` must never be run on the production host. As of Phase 1
(`UNIBAAZAR_V2_MASTER_PLAN.md` §3), this is handled by a GitHub Actions
pipeline instead of the old manual zip/upload flow: CI builds the artifact
(including the generated Prisma client) on a GitHub-hosted runner, a deploy
workflow uploads it over SSH, and `scripts/deploy/apply-migrations.sh`
applies migrations via the `mysql` CLI directly — no Prisma CLI, no Node
process cold-starting the query engine, on the host at all. See
`DEPLOYMENT.md`. (As of Phase 1, the deploy workflow is a manual trigger
rather than automatic on merge — see `docs/decisions/0007-manual-deploy-trigger.md`
— but the mechanism itself replaces the manual zip/upload flow either way.)

**That pipeline had never run end to end until Phase 14**, which is the
direct consequence of deferring deploys: nothing proves a deploy script
works except deploying. Verifying it before the first real deploy found
that the release tarball omitted `scripts/` — the directory holding the
three scripts `deploy.yml` actually invokes — that `--exclude='.next/cache'`
sat after tar's path list where it matched nothing (710MB of webpack cache
per release), and that `apply-migrations.sh` could not parse a DB password
containing symbols, which is what cPanel generates. All three were
first-deploy-only failures. See
`docs/decisions/0025-migration-rehearsal-waived-fresh-install-instead.md`.
The first admin on a fresh database comes from `scripts/bootstrap-admin.cjs`,
plain CommonJS for the same thread-ceiling reason as everything else here.

**(Resolved in Phase 2) ISR + cookie-based i18n was incompatible for routes with
no pre-known params.** The old root layout read the locale cookie on every
request (required for i18n to work at all). For a route configured as
`generateStaticParams() { return []; }` + `revalidate = N`, Next.js treated the
very first request for any given param as a "generate once, cache for every
future visitor" render, and refused to let that render read request-specific
data — it threw `DYNAMIC_SERVER_USAGE` for every single request in production
(not caught by `next dev`, which doesn't enforce the distinction). Moving to
URL-based locale routing (§11) removed the cookie read from the render path
entirely, which fixed this for `/category/[slug]` and `/brand/[slug]` (now
dynamic for an unrelated, legitimate reason — `searchParams` — see §3) and
_mostly_ fixed it for `/product/[slug]`: a related but narrower Next.js bug
remained there even after the cookie fix, specific to a child route's empty
`generateStaticParams` nested under a parent's multi-value one — see
`docs/decisions/0008-product-page-justified-dynamic-not-isr.md` for the full
investigation. `/blog/[slug]` and the CMS catch-all were never affected, because
they always had real, known `generateStaticParams` values.

**`output: "standalone"` is deliberately not used.** `server.js` runs against a
full `node_modules` install, not the trimmed `.next/standalone` bundle, so
standalone mode's extra file-tracing build step is pure overhead here.
