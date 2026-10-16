# E-Commerce Website — Master Build Plan

> Reference design: Shop Mart (shopmart.borbila.net) — orange/black Bangladeshi marketplace style.
> Build order: **Phase 1 Frontend → Phase 2 Backend/API → Phase 3 Admin Dashboard → Phase 4 Integrations → Phase 5 SEO/Tracking → Phase 6 Deploy.**
> Rule for Claude Code: finish and confirm one phase (and one task inside it) before moving to the next.

---

## 1. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | SSR/SSG/ISR = fast + SEO friendly |
| Styling | **Tailwind CSS** + shadcn/ui (admin) | Fast, consistent UI |
| Database | **MySQL 8** (MariaDB on cPanel is fine) | Requested |
| ORM | **Prisma** (MySQL) | Type-safe, migrations |
| Auth | **Auth.js (NextAuth) / custom JWT httpOnly cookies** | Customer + Admin roles |
| Validation | **Zod** | Shared front/back schemas |
| State | Zustand (cart) + TanStack Query (admin) | Light, fast |
| Forms | React Hook Form + Zod | |
| Images | `next/image` + Sharp, WebP/AVIF, upload to `/public/uploads` or S3-compatible | Speed |
| Rich text | TipTap | Product description, blog, pages |
| Charts | Recharts | Reports |
| Email | Nodemailer (SMTP) | Order mails |
| PDF | `@react-pdf/renderer` or Puppeteer | Invoice |
| Process | Node.js app via **cPanel "Setup Node.js App"** (Passenger) | Hosting |

### cPanel hosting notes (important)
- Hosting must support **Node.js Selector (CloudLinux/Passenger)** with Node 20+. Confirm with host before starting.
- Use `output: 'standalone'` in `next.config.js`; build locally/CI, upload build, run via custom `server.js`.
- MySQL created from cPanel → "MySQL Databases"; connect via `DATABASE_URL` in `.env`.
- Cron jobs (cPanel Cron) for: abandoned cart, sitemap refresh, low-stock alerts, report snapshots.
- If shared hosting RAM is low, prefer **static export for marketing pages + ISR** and keep API light. Otherwise consider a small VPS later.

---

## 2. Design System (from reference screenshots)

### Colors
- Primary orange: `#F95B09` (buttons, header, accents)
- Dark orange (top bar): `#E64A00`
- Peach tint (hero strips / page titles / cards): `#FFF0E8`
- Black: `#000000` (Buy Now, Track Now, FAQ bars)
- Page background: `#F5F5F5`; card: `#FFFFFF`
- Success green (WhatsApp): `#1F7A0F` / `#25D366`
- Text: `#111827`, muted `#6B7280`

### Typography
- Font: **Poppins** (Google font, `next/font`), Bangla fallback: **Hind Siliguri / Noto Sans Bengali**
- Headings 600–700, body 400, price 600

### Components / Patterns
- Container max-width 1200–1280px, 8px spacing grid, radius 6–10px, soft shadow.
- Top bar: free-shipping notice (left) + Newsletter / Track Order / Login-Register / Help & Support / FAQs (right).
- Main header: logo, big search with orange button, cart icon with count + total.
- Footer: about + contact, Customer Service links, Useful Links, social icons, app download, **We Accept** logos (bKash, Nagad, Rocket, Visa, Mastercard, Amex), **Delivery Partners** logos (Pathao, Steadfast, RedX, iEX), black copyright bar.
- Product card: image, discount badge (-19%), title, price (strike old price), star rating, quick add.
- Mobile: sticky bottom nav (Home, Categories, Cart, Account), drawer menu, mini-cart slide-in drawer.

---

## 3. Phase 1 — Frontend (Customer Site)

> Use mock/static JSON first; swap to API in Phase 2.

### 1.1 Setup
- [ ] Next.js + TS + Tailwind + ESLint + Prettier + Husky
- [ ] Folder structure (see §10), env handling, absolute imports
- [ ] Theme tokens, fonts, global layout (TopBar, Header, Footer, MobileNav)

### 1.2 Pages
| Page | Route | Notes |
|---|---|---|
| Home | `/` | Hero slider + side banner, category grid, flash sale (countdown), banner, featured, recent, best sellers, trust badges (fast delivery / authorized / support / payments), blogs |
| Shop / All products | `/shop` | Filters: category, brand, price range, attributes (size/color…), rating, availability; sort; pagination / infinite |
| Category | `/category/[slug]` | Same as shop, SEO text block |
| Brand | `/brand/[slug]` | |
| Product details | `/product/[slug]` | Gallery + zoom, **variant selector (attributes) with live price/stock/SKU/image**, qty, Buy Now, Add to Cart, WhatsApp order, return & warranty box, tabs (Description / Reviews / Q&A), related products, recently viewed |
| Cart | `/cart` | Qty update, remove, coupon, totals |
| Checkout | `/checkout` | **Single-page guest checkout**: name, phone (BD validation), email (optional), address, delivery area (Inside Dhaka / Outside Dhaka with charge), payment method, order summary, coupon, place order |
| Order success | `/order-success/[id]` | Summary, tracking ID, Purchase event |
| Track order | `/track-order` | Order ID + phone, timeline |
| Auth | `/login`, `/register`, `/forgot-password` | Phone/email + password; OTP optional |
| My account | `/account` | Dashboard, orders, order details, addresses, wishlist, profile, password |
| Wishlist / Compare | `/wishlist`, `/compare` | |
| Flash deals / Offers | `/flash-deals`, `/offers` | |
| Blog | `/blog`, `/blog/[slug]` | |
| Static/CMS | `/about-us`, `/contact-us`, `/faq`, `/return-policy`, `/shipping-policy`, `/privacy-policy`, `/terms-and-conditions`, `/how-to-buy`, `/size-guide`, `/order-returns` | Content editable from admin |
| Search | `/search?q=` | Suggestions (autocomplete) |
| 404 / 500 | | Branded |

### 1.3 Frontend features
- Mini-cart drawer, persistent cart (localStorage → synced to DB on login)
- Variant selector component (buttons for size, swatches for color)
- Skeleton loaders, optimistic cart updates, toast notifications
- Lazy-loaded images, blur placeholders, `loading="lazy"`
- Share buttons, breadcrumbs, JSON-LD (Product, Breadcrumb, Organization)
- Cookie consent banner (for pixels)
- Floating WhatsApp / Messenger chat button
- Multi-language-ready (EN + BN) structure with `next-intl` (optional toggle)
- Fully responsive + Lighthouse ≥ 90 target

---

## 4. Phase 2 — Backend (API + Database)

### 2.1 Database schema (Prisma models — core)
`User, Role, Permission, Address, Category (nested), Brand, Unit, Label (Hot/New/Sale), Attribute, AttributeValue, Product, ProductImage, ProductVariant, VariantAttributeValue, ProductAttribute, Stock/InventoryLog, Warehouse (optional), Coupon, FlashSale, FlashSaleItem, Cart, CartItem, Wishlist, Review, Order, OrderItem, OrderStatusHistory, Payment, Shipment (courier), Invoice, Return/Refund, Customer, Supplier, PurchaseOrder, Page, BlogPost, BlogCategory, Banner, Slider, Menu, MenuItem, Setting (key/value), SeoMeta (polymorphic), Redirect, SmsLog, EmailLog, Notification, AuditLog, TrackingEvent`

### 2.2 Variant model (important)
```
Product (name, slug, type: simple | variable, base price, ...)
Attribute (Size, Color, Material...)  -> AttributeValue (S, M, L / Red, Black)
ProductVariant (productId, sku, barcode, price, salePrice, costPrice,
                stock, weight, image, status)
VariantAttributeValue (variantId, attributeId, attributeValueId)
```
- Each variant has **its own price, sale price, SKU, stock, image**.
- Auto-generate all combinations from selected attributes; bulk edit price/stock.
- Frontend picks variant by selected attribute combination → updates price, stock, gallery.
- Simple products use a single default variant internally (keeps cart/order logic uniform).

### 2.3 API (Next.js Route Handlers `/api/v1/*`, or Server Actions)
- Auth: register, login, logout, refresh, OTP, forgot/reset
- Catalog: products, categories, brands, search, filters, related, reviews
- Cart & checkout: price calculation server-side (never trust client prices), coupon validation, delivery charge, stock check
- Orders: create, track, cancel request, return request
- Payments: initiate, callback/IPN, verify
- CMS: pages, blogs, banners, menus, settings (public read endpoints, cached)
- Admin APIs: everything in Phase 3 (RBAC protected)

### 2.4 Security (non-negotiable)
- Password hashing (argon2/bcrypt), httpOnly + Secure + SameSite cookies
- CSRF protection, rate limiting (login, OTP, checkout), CAPTCHA (Cloudflare Turnstile/reCAPTCHA) on forms
- Zod validation on every input; Prisma parameterized queries (no raw SQL)
- File upload validation (type, size, magic bytes), image re-encode
- Security headers (CSP, HSTS, X-Frame-Options, etc.), CORS lock-down
- RBAC (Super Admin, Admin, Manager, Staff, Content Editor, Accountant)
- Audit log for admin actions; webhook signature verification
- `.env` secrets only server-side; daily DB backup (cPanel cron + mysqldump)
- **Fraud protection:** phone-number order history check, duplicate-order block, courier success-ratio check (Steadfast fraud API), IP/device limit, blacklist phone/IP

---

## 5. Phase 3 — Admin Dashboard (`/admin`)

### 3.1 Dashboard home
Today/7d/30d sales, orders by status, revenue chart, top products, low-stock alerts, new customers, pending orders, recent orders, courier delivery success rate, traffic summary.

### 3.2 Catalog
- **Add Product**: name, slug, SKU, short & long description (TipTap), category (multi), brand, unit, labels, tags, gallery (drag & drop, reorder, alt text), video URL, simple/variable toggle, **attributes → auto variants (price/sale price/cost/stock/SKU/image per variant)**, regular & sale price, sale schedule, stock & low-stock threshold, weight/dimensions, warranty/return info, shipping class, **SEO block** (meta title/desc, canonical, OG image, schema), status (draft/published/scheduled), featured toggle
- **All Products**: search, filters (category/brand/status/stock), bulk actions (publish, delete, price update, category change), quick edit, duplicate, export/import CSV/Excel
- **Product Edit** (same form), revision-safe
- Categories (nested, image, SEO), Brands, **Attributes & Values** (color swatch/image/label type), **Units** (pcs, kg, litre…), **Labels/Badges** (New, Hot, Sale), Tags
- Reviews moderation, Q&A moderation

### 3.3 Orders
- All orders: filters (status, date, payment, courier, area), search (ID/phone/name), bulk actions
- Order detail: customer, items, edit items/qty/price/discount/delivery charge, notes (internal/customer), status timeline, payment status, fraud score
- **Order statuses:** Pending → Confirmed → Processing → Ready to Ship → Sent to Courier → Shipped → Delivered → Completed; Cancelled, Returned, Failed, On Hold, Partial Delivered, Refunded
- **Send to Steadfast** button (single + bulk) → stores consignment ID, tracking code, status sync
- Manual order creation (phone/Facebook orders), incomplete/abandoned orders
- **Invoice / Packing slip / Shipping label**: print + PDF + bulk print, with logo, QR/barcode
- Returns & refunds management
- SMS/Email trigger on status change (templates)

### 3.4 Customers
List, profile with order history, lifetime value, addresses, tags/segments, block/unblock, export.

### 3.5 Inventory
- Stock overview, per-variant stock, low/out-of-stock alerts
- Stock adjustment with reason + **stock movement ledger**
- Suppliers, Purchase orders/receiving (optional), multiple warehouses (optional)
- Barcode/SKU generation & label print
- Auto stock deduction on order confirm, restore on cancel/return

### 3.6 Marketing
- Coupons (%, fixed, free shipping, min cart, usage limits, per-user, date range, category/product specific)
- Flash sales (schedule, countdown, qty limit)
- Banners & sliders (home, category, popup), Popup/exit-intent offers
- Abandoned cart recovery (SMS/Email)
- Email/SMS campaigns, newsletter subscribers
- Upsell / cross-sell / bundle, related products rules
- Loyalty points / referral (phase 2 optional)

### 3.7 Content / Pages management
- Pages (About, Policies, FAQ, Contact…) with rich editor + SEO
- Blog posts, categories, authors
- Menus builder (header/footer/mobile), footer link groups
- Homepage section manager (drag-and-drop order, enable/disable, choose products/categories)
- FAQ manager, testimonials

### 3.8 Website Settings
- General: site name, logo, favicon, contact info, address, business hours, currency, timezone
- Theme: colors, fonts, layout toggles
- Checkout: delivery areas & charges, free-shipping threshold (e.g. 6500৳), guest checkout, min order, COD toggle, order ID format
- Payment gateways, SMS gateway, Courier, Email SMTP (config + test buttons)
- Tax/VAT, invoice settings (prefix, footer note, signature)
- Social links, WhatsApp/Messenger numbers, chat widget
- Maintenance mode, cookie banner text, custom header/footer scripts
- Backup/restore (DB export), cache clear

### 3.9 Tracking & Marketing Integrations (admin-configurable)
- **Meta Pixel** + **Conversions API (server-side)** with event dedup (`event_id`), Test Event Code field
- **Google Tag Manager** container ID
- **Google Analytics 4**, Google Ads conversion
- **Search Console** verification + sitemap submit helper
- TikTok Pixel (+ Events API), Pinterest/Snap optional
- Microsoft Clarity / Hotjar
- Events to fire: `PageView, ViewContent, AddToCart, InitiateCheckout, AddPaymentInfo, Purchase, Search, CompleteRegistration, Lead (WhatsApp click)`
- Product feed for **Facebook Catalog / Google Merchant** (XML/CSV auto-generated)

### 3.10 Full SEO System
- Per-page/product/category/blog: meta title, description, canonical, robots (index/noindex), OG/Twitter, focus keyword
- SEO score hints (title length, description length, alt text, H1)
- Auto `sitemap.xml` (products, categories, blogs, pages) + `robots.txt` editor
- JSON-LD: Organization, WebSite+SearchAction, Product (price, availability, review), BreadcrumbList, FAQ, Article
- 301/302 **redirect manager**, 404 log monitor
- Clean slugs, auto-generated alt text fallback
- Image sitemap, hreflang-ready, canonical for filtered URLs
- Core Web Vitals focus: ISR, image optimization, font preloading, minimal JS

### 3.11 Reports
Sales (daily/weekly/monthly/custom), by product/category/brand/variant, by payment method, by delivery area, orders by status, customer report (new/returning/top), coupon usage, **profit report (cost vs sale)**, stock report & valuation, low stock, returns/refunds, courier performance (delivered/returned %), traffic source (UTM), abandoned carts, tax report. Export CSV/Excel/PDF.

### 3.12 Social Media Integration
- Social login (Google, Facebook)
- Share buttons, Instagram feed widget, YouTube video embed
- Facebook/Instagram Shop catalog sync, Messenger/WhatsApp click-to-chat & **WhatsApp order**
- Auto-post new product to Facebook page (optional)
- Review import / UGC (optional)

### 3.13 Users & Security
Staff accounts, roles & permissions matrix, 2FA for admins, login history, audit log, IP allow-list (optional), session management.

### 3.14 Notifications
In-dashboard bell + sound for new order, email/SMS alerts to admin, low stock alerts, Telegram/WhatsApp admin alert (optional).

---

## 6. Phase 4 — Integrations

### Payment
- **COD** (default), **bKash**, **Nagad**, **Rocket**, cards via **SSLCommerz** or **AamarPay** (both cover cards + mobile wallets), optional Stripe for international
- Flow: create order (pending payment) → redirect → IPN/webhook verify → mark paid; failed/cancel pages; refund API where supported
- Partial/advance payment for COD (e.g. delivery charge advance) — configurable

### SMS Gateway (BD)
- Providers: BulkSMSBD, Alpha SMS, GreenWeb, SSL Wireless, Banglalink/GP bulk (choose one; adapter pattern to swap)
- Use cases: order placed, confirmed, shipped (with tracking), delivered, OTP login/verify, abandoned cart, campaigns
- Template manager with variables `{name} {order_id} {total} {tracking}`; SMS log + balance check; Bangla (Unicode) support

### Courier
- **Steadfast** (create consignment, bulk create, status check, webhook, balance, fraud/success-ratio check)
- **Pathao**, **RedX**, **eCourier/Paperfly** via same adapter interface (`CourierProvider`)
- Auto/manual courier selection, COD amount, note, tracking link in SMS/customer page

### Others
- SMTP/transactional email, Google reCAPTCHA/Turnstile, Facebook/Google login, Cloudflare (CDN/WAF), WhatsApp Business link

---

## 7. Extra Ecommerce Features (you may have missed)

**Storefront**
- Wishlist, compare, recently viewed, back-in-stock notify, pre-order, size guide, product Q&A, verified-purchase reviews with photos
- Smart search with autocomplete, typo tolerance (MySQL FULLTEXT or Meilisearch later)
- Free-shipping progress bar in cart, upsell at checkout, order bump
- Guest checkout + auto account creation, saved addresses
- Multi-image zoom, video, 360° (optional)
- Estimated delivery date, delivery area/district-thana-wise charges (BD district/upazila dataset)
- Gift wrap / order note, bulk/wholesale pricing tiers, customer-group pricing
- Multi-currency (optional), BN/EN language

**Operations**
- Duplicate/fake order detection & phone blacklist, order confirmation call list
- Incomplete order capture (name+phone saved before submit)
- Return/exchange workflow with RMA, refund tracking
- Purchase & supplier management, cost-price tracking for profit
- Batch/expiry date for grocery items
- POS (counter sale) — optional later
- Barcode scanner support in inventory
- Auto-cancel unpaid orders (cron), auto-complete delivered orders
- Staff activity tracking, daily sales summary email/SMS to owner

**Growth**
- Referral & loyalty points, gift cards, affiliate links (optional)
- Product feed (Facebook/Google), UTM capture saved on orders
- Exit-intent popup, spin-to-win (optional), live sales popup ("X bought…")
- Review request SMS after delivery

**Legal/Compliance**
- Privacy policy, cookie consent, terms, return policy pages, GDPR-style data export/delete for customers

---

## 8. Phase Roadmap (Execution Order)

| Phase | Scope | Deliverable |
|---|---|---|
| **0** | Confirm hosting (Node.js support), domain, SSL, brand assets, gateway/SMS/Steadfast accounts | Checklist done |
| **1** | Frontend (all pages with mock data), responsive, design system | Clickable site |
| **2** | MySQL schema, Prisma, auth, catalog/cart/checkout/order APIs, connect frontend | Working store (COD) |
| **3** | Admin dashboard: catalog, variants, orders, invoice, customers, settings | Manage store |
| **4** | Steadfast, SMS, payment gateways, email | Automated fulfilment |
| **5** | Tracking (Pixel/CAPI/GTM/GA4), SEO system, sitemap, schema, reports, inventory | Marketing ready |
| **6** | Security hardening, performance, testing, cPanel deploy, backups, monitoring | Go-live |
| **7** | Post-launch: loyalty, POS, mobile app, advanced search | Optional |

### Definition of done per phase
Typed code, no TS errors, Zod validation, responsive check (mobile/tablet/desktop), Lighthouse check, manual test notes, README updated.

---

## 9. Testing & QA
- Unit: pricing, coupon, delivery charge, stock logic (Vitest)
- API: Postman/Thunder collection or Playwright API tests
- E2E: Playwright — add to cart → checkout → order → admin sees order → send to courier
- Security: OWASP top-10 checklist, dependency audit (`npm audit`)
- Performance: Lighthouse, WebPageTest; Core Web Vitals targets LCP < 2.5s, CLS < 0.1
- Payment sandbox tests, SMS test numbers, Steadfast sandbox/test consignment

---

## 10. Suggested Folder Structure

```
/src
  /app
    (store)/
      page.tsx
      shop/ category/[slug]/ product/[slug]/
      cart/ checkout/ order-success/[id]/ track-order/
      account/ login/ register/ blog/ [page-slug]/
    (admin)/admin/
      dashboard/ products/ orders/ customers/ inventory/
      marketing/ content/ reports/ seo/ settings/ users/
    api/v1/ (auth, products, cart, orders, payments/webhooks, courier, sms, admin/*)
    sitemap.ts  robots.ts
  /components (ui, store, admin, forms, seo)
  /lib (db, auth, pricing, courier/, payment/, sms/, tracking/, seo/, utils)
  /server (services, repositories, validators)
  /hooks  /store (zustand)  /types  /styles  /config  /locales
/prisma (schema.prisma, migrations, seed.ts)
/public (uploads, icons, fonts)
.env.example  server.js  next.config.js  README.md
```

---

## 11. Environment Variables (`.env.example`)
```
DATABASE_URL=mysql://user:pass@localhost:3306/dbname
NEXT_PUBLIC_SITE_URL=https://example.com
AUTH_SECRET=
SMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS=
STEADFAST_API_KEY= STEADFAST_SECRET_KEY=
SMS_PROVIDER= SMS_API_KEY= SMS_SENDER_ID=
SSLCOMMERZ_STORE_ID= SSLCOMMERZ_STORE_PASS= (or AAMARPAY_*)
BKASH_APP_KEY= BKASH_APP_SECRET= BKASH_USERNAME= BKASH_PASSWORD=
META_PIXEL_ID= META_CAPI_TOKEN= GTM_ID= GA4_ID=
TURNSTILE_SITE_KEY= TURNSTILE_SECRET=
```
(Store integration keys in DB settings, encrypted, so admin can change them without redeploy; env as fallback.)

---

## 12. Instructions for Claude Code
1. Read this file fully; ask only blocking questions.
2. Work **phase by phase, task by task**; after each task summarize what changed and wait for confirmation.
3. Always TypeScript strict mode; no `any`; shared Zod schemas.
4. Never trust client-side prices/stock; recompute on the server.
5. Keep integrations behind adapter interfaces (`PaymentProvider`, `SmsProvider`, `CourierProvider`).
6. Commit small, meaningful changes; keep `README.md` and `.env.example` updated.
