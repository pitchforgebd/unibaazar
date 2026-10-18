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
| i18n               | next-intl (English + Bengali, cookie-based, no URL locale prefix)               |
| Auth               | Custom session-cookie auth (no NextAuth) — see §5                               |
| Icons              | lucide-react                                                                    |
| Rich text          | Tiptap v2                                                                       |
| Email              | Nodemailer                                                                      |
| Hosting            | cPanel (CloudLinux), Node.js Selector/Passenger, custom `server.js` entry point |

There is no `middleware.ts`. Locale resolution happens inside `src/i18n/request.ts`
(reads the `NEXT_LOCALE` cookie) and the root layout (`src/app/layout.tsx`), not via
Next.js middleware.

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
  `PurchaseOrderItem`
- **Marketing**: `Coupon`, `FlashSale`, `FlashSaleItem`, `Campaign`, `Banner`,
  `Slider`
- **Cart & orders**: `Cart`, `CartItem`, `Wishlist`, `Order`, `OrderItem`,
  `OrderStatusHistory`, `Payment`, `Shipment`, `CourierWebhookLog`, `Invoice`,
  `ReturnRequest`
- **Engagement/content**: `Review`, `ProductQuestion`, `Page`, `BlogCategory`,
  `BlogPost`, `Menu`, `MenuItem`, `Faq`, `Testimonial`, `HomeVideo`,
  `HomeSection`, `Subscriber`
- **Platform**: `Setting` (key/value store backing every admin settings screen),
  `SeoMeta`, `NotFoundHit`, `Redirect`, `SmsLog`, `EmailLog`, `Notification`,
  `AuditLog`, `TrackingEvent`

`Setting` is the generic persistence mechanism for everything configured in
Admin → Settings (general/branding, theme, social links, checkout, invoice,
system/integration keys) — read via `src/server/settings/store.ts`.

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

## 8. API layer

`src/app/api/v1/*` is the one REST-ish surface consumed by both storefront client
components and (for a few endpoints) external systems:

- `auth/*` — login, register, logout, refresh, forgot/reset, OTP, 2FA, OAuth
- `account/*` — profile, addresses, password, order history (customer-scoped)
- `products`, `categories`, `brands`, `search`, `posts`, `pages`, `menus`,
  `banners` — public read endpoints backing the storefront
- `cart/quote` — the single source of truth for authoritative pricing
- `orders`, `orders/track` — order creation and guest tracking
- `payments/*` — gateway initiate/verify/callback/webhooks (bKash/Nagad/
  SSLCommerz/Aamarpay, configured via `.env` or Admin → Settings)
- `contact`, `newsletter` — public lead-capture forms
- `cron/*` — `CRON_SECRET`-gated **scheduled** maintenance endpoints (see §9)
- `webhooks/steadfast` — inbound courier status updates

## 9. The `cron/*` pattern (specific to this host) and Admin → Maintenance

`src/app/api/v1/cron/*` are POST routes gated by `assertCronSecret()`
(`src/server/cron/auth.ts`, compares a bearer token against `CRON_SECRET`). They
exist for recurring scheduled maintenance only — `low-stock-sweep` and
`cancel-unpaid-orders` — invoked by a real cron entry (see `DEPLOYMENT.md`).

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

`hreflang`/`x-default`: handled automatically by next-intl's middleware setting
the `Link` response header (`alternateLinks: true`, the default) rather than
per-page `<link rel="alternate">` metadata.

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
