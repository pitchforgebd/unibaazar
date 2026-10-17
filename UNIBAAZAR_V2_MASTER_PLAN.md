# UniBaazar v2: Master Build Plan for Claude Code

> **Read this whole file before doing anything.** It replaces `ECOMMERCE_PROJECT_PLAN.md` as the source of truth. `ARCHITECTURE.md` describes what exists today, and `DEPLOYMENT.md` describes the old deploy flow. Both get rewritten during this plan.
>
> **Context:** UniBaazar (`unibaazar.com`) is **already live with real customers and orders**. This is a professional rebuild _in place_, not a greenfield project. Real data must never be lost, and the live site must keep working between phases.
>
> **Goal:** a commercial-grade, multi-purpose e-commerce platform for Bangladesh. It must be able to sell any kind of product, have a distinctive and memorable UI, give 100% parity between admin and storefront, use exact money math, have modular integrations, include full SEO, and deploy painlessly to cPanel.

---

## 0. Operating rules (follow these always)

### 0.1 Roles you play

You act as the senior **software architect, UI/UX designer, marketing/SEO engineer, and QA tester** on this project. Every decision should read as if a professional team made it.

### 0.2 Autonomy

- Inside a phase, **make decisions yourself** and keep going. Do not ask for confirmation on routine choices. When there are several reasonable options, pick the one you would recommend and record it as a short ADR in `docs/decisions/NNNN-title.md` (context → decision → consequences).
- **Stop and ask only when:**
  1. an action would destroy or irreversibly change production data,
  2. something would cost money (a paid service or plan),
  3. this plan contradicts itself or the real code in a way that changes scope, or
  4. a credential or account is needed that you don't have.
- **Never** connect to the production server or the production database yourself. **Never** run `next build`, `prisma migrate`, or `tsx`/seed scripts on the cPanel host (see §3).

### 0.3 Git workflow (auto-commit)

- Each phase works on its own branch: `v2/phase-NN-short-name`, branched from `main` (or from the previous phase branch if that branch isn't merged yet).
- **Commit automatically after every completed task** using Conventional Commits, e.g. `feat(checkout): district-based delivery zones` or `refactor(money): store amounts as integer poisha`. Keep commits small and focused. Pure file moves go in their own commit, separate from logic changes.
- Run `npm run verify` (typecheck + lint + unit tests) before each commit. Never commit red.
- Never force-push, never rewrite `main`, and never commit secrets.
- At the end of a phase: push the branch, open a PR with `gh pr create` if it's available (otherwise write the PR description into the phase report), then **STOP** (§0.5). Merging into `main` is the human's gate, and a merge into `main` triggers deployment.

### 0.4 Code quality bar (no garbage code)

- TypeScript `strict`, no `any`, no `@ts-ignore` without a written reason. ESLint and Prettier must be clean.
- No dead code, no commented-out blocks, no leftover `console.log`, no duplicated logic. If two places compute the same thing, extract it.
- Every server input is validated with zod. The client is never trusted for price, stock, discounts, or permissions.
- Every user-visible string goes through i18n (en + bn kept in lockstep).
- Every new piece of business logic gets unit tests. Every user flow gets an E2E test.
- Prefer boring, readable code over clever code. Name things after the domain.
- Keep components small. Split any file that grows past roughly 300 lines.

### 0.5 End-of-phase protocol (tester role)

At the end of **every** phase, before stopping:

1. Run the full suite with `npm run verify:full`: typecheck, lint, unit, integration, Playwright E2E (desktop + mobile viewports), axe accessibility checks, and Lighthouse CI on key pages.
2. **Manually test as a tester would.** Start the app locally against a seeded test DB and walk every feature touched in the phase, including edge cases: empty states, invalid input, out of stock, expired coupon, network failure, slow 3G, Bengali locale, mobile width 360px, keyboard-only navigation, and `prefers-reduced-motion`.
3. Fix everything you find. Re-run until green.
4. Write `docs/qa/phase-NN-report.md` covering: what was built, the test matrix with results, screenshots (Playwright) of key screens at desktop and mobile size, known limitations, and the deploy notes for this phase (migrations included? new env vars? new cron jobs?).
5. Update `CHANGELOG.md`, `ARCHITECTURE.md`, and `docs/` to match reality.
6. Push, open the PR, print a short summary, and **STOP. Wait for the human before starting the next phase.**

---

## 1. Known problems this plan must fix

Found by reviewing the existing docs. Verify each one in Phase 0.

| #   | Problem                                                                                                                                                                                                  | Fix (phase)                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Secrets committed in docs**: the DB password and the seeded admin password appear in plain text in `DEPLOYMENT.md`                                                                                     | Remove them, tell the human to rotate both, and scan git history (P0)                                                                      |
| 2   | `DEPLOYMENT.md` says to build and migrate **on the server**, while `ARCHITECTURE.md` says this **must never happen** (because of the ~5-thread ceiling). Deploys are manual: zip, upload, chmod, restart | CI builds, then an artifact deploy, migrations through the `mysql` CLI, and restart via `tmp/restart.txt` (P1)                             |
| 3   | Cookie-only i18n forced `/product`, `/category`, and `/brand` to `force-dynamic`. That makes them slow, uncacheable, and Bengali is invisible to Google (no indexable URLs, no hreflang)                 | Locale in the URL with the `as-needed` prefix (English URLs unchanged, Bengali under `/bn/...`), then ISR plus on-demand revalidation (P2) |
| 4   | Admin edits don't reliably appear on the storefront (an ISR timer of 300s, mock-data fallbacks)                                                                                                          | Tag-based cache invalidation on every admin write. Remove all mock fallbacks from runtime (P2)                                             |
| 5   | One-off "bootstrap via cron route" hacks (`seed-catalog`, `bootstrap-admin`)                                                                                                                             | Replace them with a proper, gated, idempotent admin "Setup / Maintenance" module (P2)                                                      |
| 6   | Image optimisation and other threaded work at runtime on a thread-limited host                                                                                                                           | Pre-generate image variants at upload time with sharp concurrency 1, serve them statically, and use a custom `next/image` loader (P2)      |
| 7   | Generic UI that looks like a template                                                                                                                                                                    | A new design system, motion system, and a unique homepage (P4–P5)                                                                          |
| 8   | Integrations scattered between `lib/` and `server/`                                                                                                                                                      | Segmented, self-contained integration modules with their own admin section, settings, logs, and health check (P7–P11)                      |
| 9   | Money precision not guaranteed                                                                                                                                                                           | All money stored as integer **poisha** with one central pricing engine (P3)                                                                |

---

## 2. Target architecture

### 2.1 Stack (keep what works)

Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4, MySQL + Prisma, zod, react-hook-form, Zustand (client UI state only), next-intl, Tiptap, Nodemailer, custom session auth (keep it).

**Additions:**

- `motion` (Motion for React, the successor to framer-motion) for animation.
- `sonner` (or an in-house equivalent) for toasts.
- `embla-carousel` for carousels.
- Vitest for unit tests and Playwright for E2E.
- `@axe-core/playwright` and Lighthouse CI.
- `pino` for logging.

**Version policy:** don't upgrade major versions for their own sake. One spike is worth doing in P2: **Prisma's Rust-free client with a MySQL/MariaDB driver adapter** (the default in Prisma 7). It removes the native query-engine binary, which is the root cause of the cold-start and thread problems on this host. Adopt it only if it passes a smoke test on the real host. Record the result as an ADR either way.

### 2.2 Folder structure (target)

Move toward this gradually. Pure moves go in their own commits.

```
src/
  app/
    [locale]/                     # next-intl, localePrefix "as-needed"
      (store)/ ...                # storefront routes
      (admin)/admin/ ...          # admin routes (admin can stay unprefixed if simpler; record an ADR)
    api/v1/ ...                   # thin route handlers: parse → call module → respond
    api/webhooks/<provider>/      # inbound webhooks, one folder per provider
    sitemap/ robots.ts            # see SEO module
  modules/                        # domain modules (business logic lives here)
    catalog/      { server/, schemas/, types.ts, components/, tests/ }
    pricing/      # the ONLY place prices, discounts, delivery, and tax are computed
    inventory/
    cart/
    checkout/
    orders/       # order state machine
    customers/
    promotions/   # coupons, flash sales, campaigns
    content/      # pages, blog, menus, homepage sections, video gallery
    media/        # upload pipeline, image variants
    auth/  access/ settings/ notifications/ audit/
  integrations/                   # segmented external systems; each is self-contained
    payments/     { core/ (PaymentProvider interface, state machine), providers/bkash, nagad, sslcommerz, aamarpay, cod/ , admin/, tests/ }
    courier/      { core/ (CourierProvider), providers/steadfast, pathao, redx/, admin/, tests/ }
    sms/          { core/ (SmsProvider), providers/..., templates/, admin/ }
    email/        { core/, templates/ (react-email or MJML), admin/ }
    meta/         { pixel/, capi/, catalog-feed/, messenger/, admin/ }      # "Facebook system"
    analytics/    { ga4/, gtm/, consent/, first-party/, reports/, admin/ }
    seo/          { metadata/, schema/ (JSON-LD builders), sitemap/, redirects/, audit/, admin/ }
    captcha/
  components/
    ui/           # design-system primitives (Button, Input, Sheet, Dialog, Toast, Skeleton…)
    motion/       # motion primitives (Reveal, Stagger, FlyToCart, CountUp, Marquee…)
    store/        # storefront compositions
    admin/        # admin compositions
  lib/            # tiny framework-agnostic utils only (formatting, ids, fetch helpers)
  styles/  locales/  i18n/  config/
prisma/  scripts/  docs/  e2e/  .github/workflows/
```

**Rules:**

- `app/` files stay thin.
- Business logic lives in `modules/` or `integrations/`.
- Modules talk to each other only through their exported `index.ts`. Enforce this with an ESLint import-boundary rule.
- Every integration exposes `isConfigured()`, `healthCheck()`, a settings zod schema, and writes to its own log table or channel.

### 2.3 Admin → storefront parity (the "100% accuracy" rule)

- **Every visible element on the storefront is data-driven from admin.** That includes logo, colours/theme, menus, homepage sections and their order, banners, videos, footer, trust badges, delivery charges, payment methods, contact info, social links, SEO, and policies. Nothing business-related is hardcoded.
- Every admin write calls `revalidateTag()` for the affected tags (e.g. `product:{id}`, `category:{slug}`, `home`, `settings`, `menu:{key}`). The change must appear on the storefront **within seconds**, not after a timer.
- Admin forms show a **live preview** where it makes sense: product card, banner, homepage section, SEO snippet (Google SERP preview), social share card.
- A parity E2E suite (`e2e/parity/*.spec.ts`) changes a value in admin, then asserts the storefront shows it. There must be one test per settings group.

---

## 3. cPanel hosting: the definitive fix

**Host facts:** CloudLinux, Node.js Selector/Passenger, a hard limit of about 5 OS threads per process, MySQL on localhost. Standalone `node`/`tsx` processes crash, and esbuild fails on the host.

**Principle:** the server **never builds, never installs dev tooling, and never runs Prisma CLI**. The server only _receives a finished artifact and restarts._

### 3.1 Pipeline

```
push/merge to main
  └─ GitHub Actions "ci":     npm ci → verify:full → next build → package artifact
  └─ GitHub Actions "deploy": (only on main, after ci passes)
       1. upload artifact to server (SSH + rsync; fallback: cPanel Git "deploy" branch, see 3.4)
       2. unpack into  ~/unibaazar/releases/<git-sha>/
       3. symlink shared dirs:  public/uploads → ~/unibaazar/shared/uploads,  .env → ~/unibaazar/shared/.env,  backups → shared/backups
       4. DB backup:            scripts/deploy/backup-db.sh  (mysqldump, keep last 14)
       5. migrations:           scripts/deploy/apply-migrations.sh   (mysql CLI, see 3.2)
       6. switch:               ln -sfn releases/<sha> ~/unibaazar/current
       7. restart:              touch ~/unibaazar/current/tmp/restart.txt   (Passenger restart, no cPanel UI needed)
       8. smoke test:           curl /api/health (checks DB, version=sha) with retries for up to 60s
       9. on failure:           re-point symlink to previous release, touch restart.txt, mark the run failed
     keep last 5 releases; scripts/deploy/rollback.sh <sha> for manual rollback
```

- The Passenger application root points at `~/unibaazar/current`. **Verify in Phase 1 that Passenger accepts a symlinked app root.** If it doesn't, use the fallback: rsync the release into a fixed dir with `--delete-after`, excluding the shared dirs. Record the result as an ADR.
- The artifact must contain everything needed to run: `.next/` (no cache), `public/`, `server.js`, `package.json`, the generated Prisma client, and **production `node_modules` built in CI** for the server's platform. Prefer `output: "standalone"` if it simplifies this. If the Rust engine is still used, set Prisma `binaryTargets` to match the host's OpenSSL version (detect it in P1 with `openssl version` and record the result). Then **nothing at all** is installed on the server.
- CI must build with the same constraints as production, to catch thread problems early: `experimental.cpus: 1`, `UV_THREADPOOL_SIZE=2`.

### 3.2 Migrations without Prisma CLI on the host

- `prisma migrate dev` runs locally only. Every migration is committed as SQL under `prisma/migrations/*/migration.sql`.
- `scripts/deploy/apply-migrations.sh` (bash + `mysql` CLI, no Node) does the following for each migration directory, in order:
  - checks `_prisma_migrations` for that `migration_name`,
  - if it's missing, applies it in a transaction where possible,
  - then inserts the row Prisma expects (id, checksum = sha256 of the file, timestamps, `applied_steps_count`).
  - This keeps `prisma migrate status` accurate from a dev machine.
- **Migrations must be backward compatible** (expand → migrate data → contract across two deploys). Never drop or rename a column in the same deploy that stops using it. The old release must run on the new schema so rollback is safe.
- Data backfills are idempotent scripts exposed through the admin **Maintenance** module (§P2). They run inside the warm process in batches, never as CLI processes on the host.

### 3.3 Runtime settings on the host

- Node App environment variables: `NODE_ENV=production`, `UV_THREADPOOL_SIZE=2`, `NEXT_TELEMETRY_DISABLED=1`.
- Add `connection_limit=3&pool_timeout=20` to `DATABASE_URL`.
- No WebSockets and no long-held SSE connections (they eat the thread budget). Admin real-time notifications use **short polling with ETag/304** (every 20s while the tab is visible, paused while it's hidden).
- No runtime image optimisation (§P2 media pipeline).
- `GET /api/health` returns `{status, version, db: "ok"|"fail", uptime}`. It must not leak anything else.

### 3.4 Fallback if SSH/rsync from GitHub is impossible

CI pushes the built artifact to an orphan branch `deploy`. The server uses **cPanel → Git Version Control** on that branch, with a `.cpanel.yml` that runs only shell steps (backup, migrations through `mysql`, symlink, `touch tmp/restart.txt`). So on the server, "git pull" means pulling a pre-built artifact, never source that needs building.

### 3.5 Cron (cPanel)

All cron jobs call HTTP endpoints inside the warm app, authenticated with an `Authorization: Bearer` header (not a query string, which leaks into logs):

- cancel unpaid orders (hourly)
- release expired stock reservations (every 10 min)
- low-stock sweep (every 30 min)
- abandoned-cart reminders (hourly)
- courier status sync fallback (every 2h)
- sitemap regeneration (daily)
- product feeds for Meta/Google (every 6h)
- analytics daily rollup (daily)
- DB backup through the shell script (daily, keep 14)

Write the final list into the new `DEPLOYMENT.md`, with one exact line per job.

---

## 4. Design direction (UI/UX)

### 4.1 Brand and concept

- **Concept: "Living Bazaar".** The energy of a Bangladeshi bazaar (colour, abundance, discovery), delivered with the calm precision of a premium 2026 product. Generous whitespace, confident type, and motion that feels physical (springs, not linear tweens).
- Keep the **orange identity** for brand continuity, refined into a full token scale (`brand-50 … brand-950`), plus a deep ink neutral, a warm paper background, and one accent for deals.
- **Multi-purpose theming:** colours, radius, font pair, and density are admin-editable tokens. Ship 4 presets: **Bazaar** (default, orange), **Luxe** (dark, gold accent, for fashion/beauty), **Fresh** (green, for grocery), **Tech** (cool blue, for electronics). Switching a preset re-skins the whole storefront through CSS variables, with no rebuild.
- **Typography:** a characterful display face for headings and a highly readable sans for body. Bengali pairs with **Hind Siliguri / Noto Sans Bengali**, with line-height tuned separately for Bengali. Self-host the fonts and subset them.
- WCAG 2.2 AA contrast for all tokens, checked automatically in CI.

### 4.2 Homepage: unique, built from admin sections

Every block is a `HomeSection` the admin can reorder, enable/disable, and configure. The default composition:

1. **Hero stage:** an editorial split hero. Layered product cut-outs float on a soft gradient mesh, a parallax shift follows the pointer and scroll, and the headline animates in word by word. Slides can be image, video, or a product spotlight with a live price and an "Add to cart" button. Autoplay pauses on hover and focus.
2. **Category ribbon:** an infinite, slow marquee of round category tiles that pauses on hover. On mobile it becomes a snap-scroll row.
3. **Bento discovery grid:** an asymmetric grid mixing a featured product, a campaign tile, a video tile, a "trending in your city" tile (from first-party analytics), and a brand tile. Tiles reveal with a stagger on scroll.
4. **Flash deal arena:** a dark band with a big flip-digit countdown, a stock-left progress bar on each card, and "X sold in last hour" taken from real order data (never fake numbers).
5. **Shoppable video reel:** vertical, story-style video cards (YouTube/self-hosted). Tapping one opens a full-screen player with the tagged products in a bottom sheet, each with add-to-cart.
6. **Curated rails:** new, best sellers, and recommended. Horizontal rails with momentum scroll and edge-fade masks.
7. **Brand wall:** a logo grid with a hover lift and colour reveal.
8. **Social proof:** testimonials plus verified-review highlights with photos.
9. **Video gallery teaser** linking to `/videos`.
10. **Trust strip and newsletter:** delivery, authenticity, returns, secure payment, and a newsletter signup with an inline success animation.

All of it must stay fast. Homepage LCP under 2.5s on mid-range Android over 4G. Hero media is preloaded correctly, and below-the-fold sections are lazy and rendered on the server.

### 4.3 Other key screens

- **Listing (shop/category/brand/search/offers):** a sticky filter bar on desktop and a filter bottom sheet on mobile. Filters update the URL, and results animate in with layout transitions. Category-specific filters come from that category's attribute set. Grid/list toggle. Infinite scroll with a "load more" fallback that keeps pagination URLs crawlable.
- **Product detail:** a gallery with pinch/hover zoom and video slides. The variant selector has swatches, image swatches, and size buttons, and greys out unavailable combinations. Price, stock, SKU, and gallery update live. A sticky buy bar on mobile. Delivery estimate by district. EMI/payment badges. Size chart. Spec table generated from attributes. Reviews with photos and a "verified purchase" badge. Q&A. Bundles/"frequently bought together". Recently viewed.
- **Cart:** a slide-in drawer plus a full page. Free-shipping progress bar, coupon field with an animated validation result, and upsell suggestions.
- **Checkout:** one page, guest-first, minimal fields, BD phone validation, and a district → upazila (thana) picker with live delivery charge. Payment method cards. Order summary that updates live. A clear error recovery path.
- **Order success:** a celebration animation (respecting reduced motion), order timeline, tracking link, and an "add to calendar"-style delivery estimate.
- **Account:** dashboard, orders with a visual timeline, returns, addresses, wishlist, reviews to write, profile, and security.
- **`/videos` video gallery:** category tabs, a masonry grid, a lightbox player, shoppable product tags, and VideoObject schema. Admin manages it in Content → Video Gallery.

### 4.4 Motion and micro-interaction system

Put these in `components/motion/` and use them everywhere instead of ad-hoc animations.

- **Tokens:** durations `fast 120ms / base 200ms / slow 320ms / page 450ms`. Easings: `standard`, `emphasized`, and a spring preset. Never animate layout-thrashing properties; use transform and opacity only.
- **Required micro-interactions:**
  - Button press: scale 0.97 with a ripple-free tactile feel.
  - Hover lift on cards.
  - **Fly-to-cart:** the product thumbnail arcs to the cart icon, then the cart count bumps.
  - Wishlist heart burst.
  - Price count-up/down when the variant changes.
  - Skeleton shimmer while loading.
  - Optimistic UI with rollback plus an error toast.
  - Toast stack with swipe-to-dismiss, icons by type, and an undo action where possible.
  - Inline form validation with a gentle shake.
  - Page transitions using the View Transitions API, with fallback.
  - Scroll reveals.
  - Admin notification bell: a swing, a badge pop, and an optional sound that the admin can toggle.
- **Alerts and dialogs:** use one accessible Dialog/AlertDialog. Destructive actions need confirmation, and the confirm button shows a loading state.
- **`prefers-reduced-motion`:** every animation degrades to a simple fade or none. Test this in E2E.
- **Haptics:** call `navigator.vibrate` (very short) on add-to-cart on supporting mobile browsers, if the user allows it.

### 4.5 Admin UI

It must be just as professional as the storefront: a command palette (Ctrl/Cmd+K), a collapsible sidebar, data tables with saved views, column chooser, bulk actions, inline edit, keyboard shortcuts, empty states with guidance, and live previews. Dark mode. Fully responsive, so an owner can manage orders from a phone.

---

## 5. Engineering specifications

### 5.1 Money and pricing (perfect calculation)

- Store **all money as integers in poisha** (1 BDT = 100 poisha) in the DB: `Int`, or `BigInt` for aggregates. No floats anywhere in calculations. Migrate existing Decimal/float columns with an expand/contract migration.
- `modules/pricing` is the **single source of truth.** `quote(cart, context)` returns:
  - line items: unit price, flash price, quantity, line discount, line total
  - subtotal
  - discounts, each with its source (coupon, flash sale, campaign, auto-promo)
  - delivery charge (by zone, weight, free-shipping threshold)
  - COD charge, if enabled
  - VAT, if enabled (inclusive or exclusive, set in admin)
  - rounding adjustment
  - grand total
  - payable now / payable on delivery (for advance-payment COD)
- **Rounding:** compute in poisha and round once, at the line level, using a documented rule (half-up). Show the result in ৳ with Bengali numerals when the locale is `bn`.
- **Promotion stacking rules** are explicit and configurable: priority, exclusivity, max discount cap, min cart value, per-user and global usage limits, date windows, and product/category/brand scope.
- Storefront display, the cart quote, order creation, invoices, and reports all use the same engine. Property-based tests (fast-check) assert invariants, e.g. the total is never negative, the sum of lines equals the subtotal, and a discount never exceeds its eligible amount.
- The order snapshot stores every computed number, so historical orders never change when prices change later.

### 5.2 Multi-purpose catalog

- Product types: `simple`, `variable`, `bundle`, and (optionally) `digital`. Each product type has its own form sections in admin.
- **Attribute sets per category:** an electronics category gets specs (RAM, storage), fashion gets size/colour/material, grocery gets weight/volume and expiry/batch. These drive the admin form fields, storefront filters, and the spec table.
- Units with decimal quantities where allowed (e.g. 0.5 kg). Per-category size charts. Warranty and return policy per product or category.
- Auto-generate variant combinations, bulk-edit grids, and per-variant price/sale/cost/stock/SKU/barcode/image/weight.
- Product import/export via CSV/XLSX with a validation preview before commit.

### 5.3 Inventory

- Stock ledger: every change is an `InventoryLog` row with a reason and actor. Stock is derived from the ledger and cached on the variant.
- **Reservations:** a checkout reserves stock for N minutes. The reservation is released on expiry, payment failure, or cancellation. Deducted stock is restored on return. There must be no overselling under concurrent checkouts. Test this with parallel requests.
- Low-stock thresholds per variant, alerts, back-in-stock notifications, and optional suppliers/purchase orders.

### 5.4 Orders

- An **explicit state machine** (`modules/orders/state-machine.ts`) with allowed transitions, guards, and side effects:
  - pending → confirmed → processing → ready_to_ship → handed_to_courier → in_transit → delivered → completed
  - plus cancelled, on_hold, returned, partially_delivered, failed, refunded
  - Side effects include stock, SMS/email, courier booking, analytics events, and the audit log.
- Every transition writes `OrderStatusHistory`, with the actor and a note.
- Fraud score shown on the order: phone order history, courier success ratio (Steadfast), duplicate detection, IP/device velocity, and blacklist.
- Manual orders (phone/Facebook), incomplete-checkout capture, invoices/packing slips/labels as PDF with a QR code, and bulk print.

### 5.5 Notifications (customer and admin)

- One `notifications` module fans out events to channels (SMS, email, in-app, admin bell) using templates with variables. Each channel can be toggled per event in admin. Every send is logged. Sends are idempotent: the same event never sends twice.

### 5.6 Security

- Keep everything that already exists (sanitiser, constant-time compares, RBAC guards, Turnstile opt-in).
- **Add:**
  - CSP with nonces and the other security headers
  - rate limiting backed by the DB (login, OTP, checkout, contact)
  - CSRF protection for cookie-authenticated mutations
  - upload magic-byte checks plus image re-encoding
  - 2FA for staff
  - session list and revoke
  - audit log on all admin writes
  - secrets encrypted at rest in `Setting` (AES-GCM with a key from env)
  - `npm audit` in CI

### 5.7 Performance budgets (CI-enforced)

- LCP < 2.5s, CLS < 0.05, INP < 200ms on key pages.
- JavaScript per storefront route ≤ 170 KB gzipped (first load).
- Lighthouse ≥ 90 on Performance, Accessibility, Best Practices, and SEO for home, a listing, a product, and checkout.

---

## 6. Phases

Each phase lists its **goal**, **tasks**, and **done when**. Follow §0.5 at the end of each one.

### Phase 0: Audit, safety, and baseline

**Goal:** understand the real code, secure it, and set up tooling. No feature work in this phase.

- Remove all secrets and real passwords from the docs. Scan git history (`gitleaks`). **Tell the human** in the phase report to rotate the DB password and the admin password, and say whether any secret exists in history. Do not rewrite history yourself; recommend it if needed.
- Write `docs/audit/current-state.md`. Go through every route, module, model, and integration and assess what's solid, what's broken, what's mock or hardcoded, what's duplicated, and where the UI doesn't match the backend. List every place where admin data doesn't reach the storefront.
- Write `CLAUDE.md` at the repo root: a condensed version of §0 and §2 plus the commands, so every future session follows the rules.
- Tooling:
  - Vitest and Playwright setup
  - `verify` / `verify:full` scripts
  - ESLint import boundaries
  - Prettier, gitleaks, and a commit lint hook
  - a seeded **test DB** via `docker compose` (MySQL 8) for local and CI use
- Add baseline E2E tests for current critical flows (browse → cart → checkout COD → admin sees the order) so regressions are caught from now on.
- **Done when:** the audit doc exists, secrets are out of tracked files, `npm run verify:full` runs green against the current app, and `CLAUDE.md` is in place.

### Phase 1: Deployment pipeline (fix cPanel for good)

**Goal:** a merge to `main` deploys safely with no manual steps, and rollback takes one command.

- Implement §3 in full: CI workflow, deploy workflow, release dirs plus shared dirs, `apply-migrations.sh`, `backup-db.sh`, `rollback.sh`, the health endpoint, restart via `restart.txt`, and the smoke test.
- Write `docs/deploy/host-facts.md` covering the OpenSSL version, symlink app-root support, Node version, and limits. For anything that can only be checked on the host, write the exact commands for the human to run and paste back, then **stop and ask**.
- List the GitHub secrets that are needed (`SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_PORT`, `APP_PATH`) and explain how to create the SSH key in cPanel.
- Rewrite `DEPLOYMENT.md`: first-time setup, normal deploy (= merge), rollback, cron lines, and troubleshooting. Include no secrets.
- **Done when:** a dry-run deploy to a staging subdirectory or subdomain on the same host succeeds end to end, including a migration and a forced-failure automatic rollback. (If staging needs the human to create a subdomain, ask.)

### Phase 2: Foundation refactor

**Goal:** the structural fixes everything else depends on.

- Move to the folder structure in §2.2 incrementally. Pure moves go in their own commits.
- **i18n:** next-intl with `localePrefix: "as-needed"` and middleware. English URLs stay unchanged. Bengali lives under `/bn`. The language switcher keeps the current path. Add `hreflang` and `x-default`. 301 redirects for any URL that changes.
- Restore **ISR plus on-demand revalidation** for product, category, brand, CMS, and blog pages. Implement the tag map and call `revalidateTag` from every admin write.
- Remove mock data from all runtime paths. Mock data may remain only in `prisma/seed`.
- **Media pipeline:** uploads are validated, re-encoded, and resized at upload to AVIF/WebP in several widths with sharp concurrency 1. A custom `next/image` loader serves the variants. Add a backfill job for existing images in the Maintenance module.
- **Admin Maintenance module** (super-admin only): run idempotent jobs (backfills, reindex, cache clear, sitemap rebuild), with progress and logs. Replace the `seed-catalog`/`bootstrap-admin` cron hacks.
- Spike the Prisma Rust-free client (§2.1) and record an ADR.
- Structured logging (pino), an error boundary per route group, and a central error-reporting hook.
- Encrypted settings store with typed accessors per settings group.
- **Done when:** every storefront page is either ISR or justified-dynamic, parity E2E tests pass for settings, menus, and products, and Bengali pages are indexable at their own URLs.

### Phase 3: Commerce core

**Goal:** correct, tested business logic.

- Implement §5.1 money/pricing, §5.2 catalog, §5.3 inventory, and §5.4 orders. Each gets unit tests and property tests.
- Delivery zones: a district/upazila dataset for Bangladesh, with zone-based charges, weight surcharges, a free-shipping threshold, and an estimated delivery date.
- Promotions: coupons, flash sales, campaigns, automatic promotions, and bundles, all following the stacking rules.
- Returns/RMA and refunds tracking.
- **Done when:** the pricing engine has at least 95% branch coverage, the concurrency test shows no oversell, and every order transition is tested.

### Phase 4: Design system and motion system

**Goal:** a professional, consistent foundation before rebuilding screens.

- Tokens (§4.1) with 4 theme presets editable from admin (Settings → Theme, with live preview).
- `components/ui` primitives and `components/motion` primitives (§4.4), all accessible, keyboard-navigable, and supporting reduced motion.
- A dev-only `/_design` route (blocked in production) that shows every component in every state, in both themes and both locales. Use it for Playwright visual snapshots.
- **Done when:** every primitive has a visual snapshot plus an axe pass, and switching theme presets works with no reload or rebuild.

### Phase 5: Storefront rebuild

**Goal:** the experience in §4.2–4.3.

- Homepage section builder (backend plus all 10 section types), listing, product detail, cart drawer/page, checkout, order success, track order, account, wishlist/compare, search with autocomplete (MySQL FULLTEXT plus typo-tolerant fallback), `/videos` gallery, blog, CMS pages, and branded 404/500 pages.
- Mobile-first: sticky bottom nav, bottom sheets, and thumb-reachable CTAs.
- Optional PWA: installable, with an offline fallback page.
- **Done when:** every screen matches the design spec at 360/768/1280/1536 widths in both locales, the Lighthouse budgets pass, and E2E covers every flow including payment-method selection and errors.

### Phase 6: Admin panel rebuild

**Goal:** a professional admin (§4.5) covering every module.

- Dashboard: KPIs for today/7d/30d with comparisons, revenue chart, order-status funnel, top products, low stock, courier success rate, conversion rate (from the analytics module), and recent orders.
- Catalog, orders, customers, inventory, marketing, content (including the video gallery and homepage builder), users and roles, settings, and reports (sales, product, category, profit, stock valuation, coupon, courier, returns, customers, tax), with CSV/XLSX/PDF export.
- Admin notification centre with the bell, sound, polling (§3.3), and per-user preferences.
- **Done when:** every admin write has an audit log entry, RBAC E2E proves each role sees only what it should, and parity tests cover every settings group.

### Phase 7: Payment module (`integrations/payments`)

- A `PaymentProvider` interface and a payment state machine: initiated → pending → authorized → paid / failed / cancelled / refunded / partially_refunded.
- Providers: COD (with optional advance), bKash (tokenized checkout), Nagad, SSLCommerz, and AamarPay.
- Server-side verification for every callback/IPN, idempotency keys, signature checks, amount and currency matching against the order, and a daily reconciliation report with mismatch alerts.
- Admin: Payments section with an enable/disable toggle per method, credentials (encrypted), sandbox/live switch, a **"Test connection"** button, transaction log, refunds, and fee display.
- **Done when:** sandbox E2E for each provider passes (success, failure, cancel, duplicate callback, tampered amount), and reconciliation is tested.

### Phase 8: Courier, SMS, and email modules

- Courier: a `CourierProvider` interface. Steadfast first (single and bulk booking, status webhook, balance, fraud check), then Pathao and RedX. Auto-selection rules, tracking links shown to the customer, and a sync fallback via cron.
- SMS: a `SmsProvider` interface with one BD provider first. Templates with variables, Unicode Bengali, a log, a balance check, and a test-send button.
- Email: SMTP with branded, responsive templates (order lifecycle, password reset, abandoned cart), a log, and a test-send button.
- Each has its own admin section with status, settings, logs, and health.
- **Done when:** webhook signature tests pass, template rendering is tested in both languages, and every send is idempotent.

### Phase 9: Facebook/Meta module (`integrations/meta`)

- Meta Pixel plus **Conversions API** with deduplication (a shared `event_id`), `fbp`/`fbc` capture, hashed user data (SHA-256 normalised email/phone), a Test Event Code field, and retry with an event log.
- Events: PageView, ViewContent, Search, AddToCart, AddToWishlist, InitiateCheckout, AddPaymentInfo, Purchase (sent server-side on confirmed payment or COD order creation), CompleteRegistration, Contact/Lead (WhatsApp/Messenger click).
- Facebook/Instagram **catalog feed** (XML/CSV, scheduled, with per-product include/exclude), Messenger and WhatsApp chat buttons, Facebook login, and optional auto-posting of new products.
- Admin: a Meta section with setup checklist, health status, recent events with dedup status, and feed status.
- Everything respects consent (§P10).
- **Done when:** Test Events confirms browser and server events arrive and dedupe correctly, and the feed validates.

### Phase 10: Analytics module (`integrations/analytics`)

- A **consent manager** (cookie banner with categories) feeding Google Consent Mode v2 and the Meta and TikTok pixels.
- GA4 (direct or via GTM, chosen in admin) with the full e-commerce event set, Google Ads conversions, TikTok Pixel, and Microsoft Clarity. Each one can be toggled.
- **First-party analytics:** a privacy-friendly event table (page views, product views, add-to-cart, checkout steps, purchases) with UTM/referrer attribution stored on sessions and orders.
- Admin Analytics section: traffic, sources/UTM, conversion funnel, product performance (views → carts → purchases), search terms (including zero-result searches), abandoned carts, and real-time visitors (polling).
- Daily rollups keep the reports fast.
- **Done when:** the funnel numbers reconcile with the orders table in tests, and no tracking fires before consent where consent is required.

### Phase 11: SEO module (`integrations/seo`)

- Per-entity SEO fields (title, description, canonical, robots, OG/Twitter, focus keyword) with an **SEO score panel** in admin (lengths, keyword use, H1, alt text, internal links) and a SERP preview.
- **JSON-LD builders** (typed, tested, and validated against schema.org shapes):
  - Organization, WebSite plus SearchAction
  - Product with Offer, AggregateRating, Review, `shippingDetails` (OfferShippingDetails), and `hasMerchantReturnPolicy`
  - ProductGroup for variants
  - BreadcrumbList, ItemList for listings
  - FAQPage, Article/BlogPosting, VideoObject (video gallery and product videos)
  - LocalBusiness (optional)
- **Sitemap generator:** a sitemap index split by type (products, categories, brands, pages, blog, videos, images), with both locales, `lastmod` taken from real `updatedAt`, regenerated on content changes and by daily cron. A `robots.txt` editor in admin. Do not implement the deprecated Google sitemap "ping". Document Search Console submission instead. IndexNow for Bing is optional.
- 301/302 redirect manager, a 404 monitor with one-click "create redirect", canonicals for filtered/sorted URLs, `noindex` for thin filter combinations, and auto-generated fallback meta and alt text.
- A Google Merchant Center product feed (shares its generator with the Meta feed).
- **Done when:** every page type produces valid JSON-LD (unit tests plus Playwright extraction checks), sitemaps validate, and Lighthouse SEO is 100 on key pages.

### Phase 12: Hardening, full QA, and launch

- A security pass (§5.6), dependency audit, and load test of checkout and listing with k6 at realistic concurrency within the host's limits.
- Full regression: every E2E suite, parity suite, accessibility suite, and visual suite. Cross-browser: Chromium, WebKit (Safari/iOS), and Firefox.
- A data migration rehearsal on a copy of the production DB dump that the human provides. Verify that historical orders, totals, and customers are intact after all v2 migrations.
- Launch checklist in `docs/launch-checklist.md`: backups, rollback tested, cron jobs set, Search Console and Merchant Center, Meta Events Manager, payment gateways switched to live, and monitoring.
- **Done when:** the human approves the rehearsal results. The final merge is then deployed by the pipeline.

---

## 7. Commands reference (keep in `package.json`)

```
dev, build, start
verify            = typecheck + lint + test:unit
verify:full       = verify + test:integration + test:e2e + test:a11y + lhci
test:unit, test:integration, test:e2e, test:e2e:mobile, test:a11y, test:visual
db:up / db:down   = docker compose test MySQL
db:migrate:dev, db:seed (local only)
deploy:package    = build artifact (used by CI)
```

## 8. Suggested `.claude/settings.json` for this repo

Create this file in Phase 0 so routine commands run without prompts and dangerous ones are blocked:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(npm ci)",
      "Bash(npm install *)",
      "Bash(npx prisma *)",
      "Bash(npx playwright *)",
      "Bash(npx vitest *)",
      "Bash(docker compose *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git checkout *)",
      "Bash(git switch *)",
      "Bash(git push origin v2/*)",
      "Bash(gh pr create *)"
    ],
    "deny": [
      "Bash(git push --force*)",
      "Bash(git push origin main*)",
      "Bash(git reset --hard*)",
      "Bash(ssh *)",
      "Bash(rm -rf /*)",
      "Bash(npx prisma migrate reset*)"
    ]
  }
}
```

---

**Start now with Phase 0. Follow §0 at all times. Stop at the end of each phase.**
