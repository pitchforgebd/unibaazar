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
    (store)/          customer-facing route group — one folder per page
    (admin)/admin/    admin dashboard route group — one folder per module
    api/v1/           versioned REST-ish API routes consumed by both storefront
                       and admin client components
    api/webhooks/     inbound webhooks (courier status updates)
  components/
    store/            storefront UI, organized by feature (layout, home, product,
                       shop, cart, checkout, account, auth, order, lists, content)
    admin/            admin UI, organized by module (catalog, content, marketing,
                       customers, orders, security, seo, settings, users, common)
    ui/                generic primitives (Container, button/field class helpers)
    forms/, seo/      shared form + structured-data helpers
  server/              server-only business logic, one folder per domain
                       (catalog, checkout, orders, payments, auth, account, admin,
                       cms, courier, cron, security, seo, settings, tracking)
  lib/                 shared utilities split between client-safe (catalog, cart,
                       orders session cache, utils) and server-leaning (email, sms,
                       payment, courier, security, seo, validation, pricing)
  store/               Zustand stores (cart, lists, toast, ui)
  locales/             en.json / bn.json message catalogs for next-intl
  i18n/                next-intl config + request-locale resolution
  config/site.ts        static site config (nav links, social, structural copy)
server.js              custom Node HTTP server wrapping Next's request handler
```

The project intentionally keeps **mock data** under `src/lib/mock/*` (`catalog.ts`,
`content.ts`). This was the Phase-1 prototype's data source; it's still used as
seed-data content (via `prisma/seed.ts` and the `seed-catalog` cron route — see §9)
and as a handful of explicit empty-state fallbacks (homepage blog teaser, the generic
CMS page route, the FAQ block — see `docs/audit/current-state.md` for the full list),
but the live storefront otherwise reads from the database through
`src/server/catalog/products.ts` and friends, not from the mock arrays directly.
One client-side exception is not just an empty-state fallback: the Zustand cart store
(`src/store/cart.ts`) resolves stock for add-to-cart/quantity checks from the mock
catalog, not the database — see the audit doc for why this is a real bug, not a
documented fallback.

## 3. Rendering strategy (storefront)

Every storefront route is one of three rendering modes, and the choice matters a lot
on this specific host (see §12):

- **Fully dynamic (`ƒ`)** — `/shop`, `/search`, `/cart`, `/checkout`, `/account/*`,
  `/login`, `/register`, `/offers`, `/flash-deals`, etc. Rendered fresh per request.
  No caching conflict with anything that reads request-specific data (cookies,
  search params).
- **ISR with known params (`●`, real `generateStaticParams`)** — `/blog/[slug]` and
  the generic CMS route `/[page-slug]` (contact-us, faq, size-guide, and any
  database-backed `Page`). These are prerendered for their known slugs at build
  time and revalidate on a timer (`revalidate = 300`).
- **ISR with no known params (`generateStaticParams` returns `[]`)** —
  `/product/[slug]`, `/category/[slug]`, `/brand/[slug]`. These were originally
  configured this way specifically to avoid querying the database for every
  product/category/brand slug at build time (the host can't tolerate that — see
  §12). **As of the October 2026 i18n work these three routes were changed to
  `export const dynamic = "force-dynamic"`** after discovering they returned a hard
  500 in production — see §12 for why.

Admin routes are not statically generated at all; every admin page requires a live
session check against the database on each request.

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
button in the UI.

## 6. Storefront feature map

Homepage (`src/app/(store)/page.tsx`) assembles, in parallel: categories, hero
slider + side banners (`publicBanners()`), featured/recent/best-seller product
rails (all filtered from one real `listStoreProducts()` call), an active flash sale
with a real countdown, testimonials, up to 4 homepage videos, and a blog teaser
section (falls back to mock posts only when zero real posts are published).

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
- `cron/*` — `CRON_SECRET`-gated maintenance endpoints (see §9)
- `webhooks/steadfast` — inbound courier status updates

## 9. The `cron/*` pattern (specific to this host)

`src/app/api/v1/cron/*` are POST routes gated by `assertCronSecret()`
(`src/server/cron/auth.ts`, compares a bearer token against `CRON_SECRET`). They
exist for two reasons: scheduled maintenance (`low-stock-sweep`,
`cancel-unpaid-orders`) and, unusually, **one-off database bootstrap operations**
(`bootstrap-admin`, `seed-catalog`) that would normally be a CLI script run once
during deployment. On this host, standalone `node`/`tsx` processes reliably crash
(see §12), so anything that would normally be `npm run db:seed` is instead built as
a route that runs inside the already-running, already-warm application process and
is invoked via `curl` after deployment. These routes are idempotent (safe to
re-run) by design.

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

`next-intl` is cookie-based (`NEXT_LOCALE`), not URL-prefixed — there is no
`/en/...` or `/bn/...` segment. `src/i18n/request.ts` reads the cookie and loads
the matching `src/locales/{en,bn}.json` file. `src/app/layout.tsx` resolves the
locale once per request (`getLocale()`/`getMessages()`) and wraps the tree in
`NextIntlClientProvider`; client components then use `useTranslations()` (reads
from that context, not the cookie again), while server components/pages use
`await getTranslations()` (reads the cookie directly). Both locale files are kept
in lockstep — every key that exists in one must exist in the other.

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

**ISR + cookie-based i18n is incompatible for routes with no pre-known params.**
The root layout reads the locale cookie on every request (required for i18n to
work at all). For a route configured as `generateStaticParams() { return []; }` +
`revalidate = N`, Next.js treats the very first request for any given param as a
"generate once, cache for every future visitor" render, and refuses to let that
render read request-specific data — it throws `DYNAMIC_SERVER_USAGE` for every
single request in production (not caught by `next dev`, which doesn't enforce the
distinction). This is why `/product/[slug]`, `/category/[slug]`, and
`/brand/[slug]` are `force-dynamic` rather than ISR, despite that being the
original design intent (to avoid build-time DB queries on this same
thread-constrained host). Routes with real, known `generateStaticParams` values
(`/blog/[slug]`, the CMS catch-all) don't hit this, because the problematic
param-generation path never runs for them.

**`output: "standalone"` is deliberately not used.** `server.js` runs against a
full `node_modules` install, not the trimmed `.next/standalone` bundle, so
standalone mode's extra file-tracing build step is pure overhead here.
