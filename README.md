# UniBaazar

E-commerce storefront built with Next.js (App Router), TypeScript, and Tailwind CSS. It is meant to run as a Node.js app on cPanel.

## Stack

- Next.js 15, React 19, TypeScript (strict)
- Tailwind CSS with the project color, radius, and shadow tokens
- ESLint, Prettier, and Husky
- Poppins with Noto Sans Bengali as the Bangla fallback (`next/font`)

## Getting started

```bash
npm install
copy .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The storefront still reads mock data in `src/lib/mock`. The MySQL schema is in `prisma/schema.prisma` and is not wired to the pages yet.

## Scripts

| Command              | What it does                              |
| -------------------- | ----------------------------------------- |
| `npm run dev`        | Start the local site                      |
| `npm run lint`       | Run ESLint                                |
| `npm run format`     | Format with Prettier                      |
| `npm run typecheck`  | Type-check without emitting files         |
| `npm run build`      | Production build (`output: 'standalone'`) |
| `npm run db:migrate` | Apply Prisma migrations to MySQL          |
| `npm run db:seed`    | Seed the six staff roles                  |

## Check the storefront

With `npm run dev` open, walk through:

- Home: hero, categories, flash countdown, product grids, trust badges, blog cards.
- Shop filters and sort. Open a category and a brand.
- A product with options, such as `/product/cotton-crew-tshirt`. Change size and color and confirm price, stock, and SKU update. Add to cart. The header cart opens a drawer, and a toast confirms the add.
- Cart: change quantity, remove a line, apply coupon `SAVE10`. Refresh the page and confirm the cart is still there (`localStorage` key `unibaazar:cart`).
- Language: use EN / বাংলা in the top bar. Header, footer, and cart labels switch. Product names stay in the catalog language.
- Cookie bar: Accept or Reject. The floating WhatsApp and Messenger buttons stay on the page.
- Share buttons on a product page, including Copy link.
- Checkout: an invalid phone should be rejected. A valid `01XXXXXXXXX` number places an order and opens the success page.
- Track order with sample `UB10021` and `01711111111`.
- Account, wishlist, compare, flash deals, offers, blog, search, and a footer page such as `/faq`.

The first visit starts with two sample lines from `src/lib/mock/cart.ts`, then the cart is saved in this browser. Shop, product, checkout, track, and login read MySQL. The cart drawer still prices lines from the mock catalog, using the same variant ids.

## Production entry

`next.config.ts` sets `output: 'standalone'`. After `npm run build`, cPanel can start the app with `node server.js` (set `NODE_ENV=production` and `PORT`).

## Progress

- [x] 1.1 Setup — project, theme, global layout
- [x] 1.2 Pages — customer pages with mock data
- [x] 1.3 Frontend features — cart drawer, saved cart, toasts, skeletons, share, JSON-LD, cookie bar, chat buttons, EN/BN toggle
- [x] 2.1 Database schema — Prisma models and the initial MySQL migration
- [x] 2.2 Variant model — combination generator, bulk price/stock edit, product page resolves the selected variant
- [x] 2.3 API — auth, catalog, cart quote, checkout, orders, payments, and public CMS
- [x] 2.4 Security — hashing, cookies, CSRF origin check, rate limits, Turnstile, headers, RBAC, audit log, fraud checks, backup script
- [x] 3.1 Dashboard home — staff sales, orders, stock, and courier rate at `/admin`
- [x] 3.2 Catalog — products, categories, brands, attributes, units, labels, tags, reviews, and questions at `/admin`
- [x] 3.3 Orders — list, detail, manual orders, returns, and print at `/admin/orders`
- [x] 3.4 Customers — list, profile, addresses, tags, block, and CSV export at `/admin/customers`
- [x] 3.5 Inventory — stock, ledger, suppliers, purchases, and barcode labels at `/admin/inventory`
- [x] 3.6 Marketing — coupons, flash sales, banners, campaigns, and product rules at `/admin/marketing`
- [x] 3.7 Content — pages, blog, menus, homepage sections, FAQ, and testimonials at `/admin/content`
- [x] 3.8 Website settings — general, theme, checkout, gateways, invoice, social, and system at `/admin/settings`
- [x] 3.9 Tracking — pixels, server purchase events, and product feeds at `/admin/tracking`
- [x] 3.10 SEO — metadata, robots, redirects, sitemaps, and schema at `/admin/seo`
- [x] 3.11 Reports — sales, stock, profit, coupons, and exports at `/admin/reports`
- [x] 3.12 Social — login, share, embeds, WhatsApp order, catalog feeds, and review import
- [x] 3.13 Users & security — staff, roles, 2FA, login history, audit log, sessions, IP allow-list
- [x] 3.14 Notifications — admin bell, sound, email/SMS queues, low stock, Telegram/WhatsApp options

## Notifications

Staff see an alert bell in the admin header. New store and manual orders create in-app alerts. Low stock uses the product threshold and avoids duplicate alerts for six hours. Sound plays when the unread count rises (enable under Settings → Alerts).

Settings → Alerts turns channels on or off and sets the admin email, phone, WhatsApp phone, and Telegram chat ID. Email and SMS are queued to the existing logs (same pattern as gateway tests). Telegram sends when a bot token is saved. WhatsApp queues an SMS-style row with provider `whatsapp`.

## Users & security

Staff who can manage users open `/admin/users`. The sample admin phone is `01700000000` and the password is `pass1234`. Super admin and admin roles include `users.manage`.

Staff accounts are created and edited on the Users screen. Roles shows a permission matrix; Sync defaults restores the seeded grants. Audit log and Login history list recent actions and sign-in attempts. Sessions lists active devices and can revoke one. The IP allow-list is optional — leave it blank to allow any admin IP.

Any staff member can open Users → My 2FA to enable an authenticator app. After 2FA is on, login asks for a 6-digit code. Sign out other devices ends every session except the current one.

## Social

Staff who can manage settings open `/admin/settings/social`. The sample admin phone is `01700000000` and the password is `pass1234`.

Google and Facebook sign-in appear on `/login` and `/register` after a client ID and secret are saved. New social shoppers finish on `/register/social` with a phone number. Callbacks are `/api/v1/auth/oauth/google/callback` and `/api/v1/auth/oauth/facebook/callback`.

Product pages keep share buttons for Facebook, WhatsApp, and X, plus an Order on WhatsApp link that uses the saved WhatsApp URL. A YouTube URL on the product embeds under the buy buttons.

Homepage Instagram and YouTube blocks turn on under Content → Home. Paste Instagram post URLs and a YouTube video URL on the social settings screen. Facebook Catalog and Google Merchant feeds stay at `/feeds/facebook` and `/feeds/google`. Auto-post to a Facebook page runs when a product is published and a page token is saved.

Reviews can import UGC from a CSV with slug, author, rating, and comment on `/admin/reviews`.

## Reports

Staff who can view reports open `/admin/reports`. The sample admin phone is `01700000000` and the password is `pass1234`. An accountant can open reports. A content editor cannot.

The range is today, the last 7 days, the last 30 days, or a custom pair of dates in Asia/Dhaka. Sales leave out cancelled orders. The stock report is a current snapshot. VAT is calculated from the invoice rate and is not added to the order total.

CSV, Excel, and PDF download the table on screen. PDF is a real generated file (not a browser print dialog).

Traffic lists page views that include `utm_source`. Abandoned carts are open carts saved for a signed-in shopper.

## SEO

Staff who can manage settings open `/admin/seo`. The sample admin phone is `01700000000` and the password is `pass1234`.

Each product, category, page, and blog post has a meta title, description, canonical path, Open Graph image, focus keyword, and a hide-from-search option. The form shows length hints for the title, description, alt text, and H1. A blank product image alt is saved as the product name. Slugs stay lowercase with hyphens.

`/robots.txt` is edited on the SEO screen. `/sitemap.xml` lists published products, categories, posts, and pages that are allowed to be indexed. `/image-sitemap.xml` lists product images. Shop and category filters keep a canonical URL on the clean path. English and Bengali share each URL (locale is a cookie preference), so no hreflang tags are emitted — there is no separate URL per language to point them at.

JSON-LD covers the organization, the website search box, products with price and rating, breadcrumbs, FAQs, and articles. Redirects use 301 or 302. Missing store pages are listed in the 404 log. Product images use the image optimizer, and the store fonts are preloaded.

## Tracking

Staff who can manage settings open `/admin/tracking`. The sample admin phone is `01700000000` and the password is `pass1234`.

Meta, Google Tag Manager, Google Analytics 4, Google Ads, TikTok, Pinterest, Snap, Clarity, and Hotjar load after the shopper accepts cookies. Search Console verification is a meta tag when that field is saved.

Browser events are PageView, ViewContent, AddToCart, InitiateCheckout, AddPaymentInfo, Purchase, Search, CompleteRegistration, and Lead for a WhatsApp click. Purchase also sends a server event with the same event id. Meta Conversions API and TikTok Events API run when a pixel ID and token are both saved. A Meta test event code is sent with that server call.

The sitemap is `/sitemap.xml`. Facebook Catalog XML is `/feeds/facebook`. Google Merchant CSV is `/feeds/google`.

## Settings

Staff who can manage settings open `/admin/settings`. The sample admin phone is `01700000000` and the password is `pass1234`. A content editor cannot open this area.

General settings cover the site name, logo and favicon URLs, contact details, business hours, currency, and timezone. The footer uses the phone, email, address, and hours. The default hours are Sat–Thu, 10:00–20:00.

Theme sets the top bar color, the font, and whether the top bar and chat buttons show. Checkout sets inside and outside Dhaka charges, the free-shipping amount, guest checkout, the minimum order, cash on delivery, and the order ID prefix. Those delivery numbers are what a placed order is charged. The cart drawer still previews free shipping from ৳6,500.

Gateways store bKash, Nagad, SMS, SMTP, and courier details. Password fields stay blank after a save so the secret is not sent back to the browser. Test SMS and test email queue a log. Test payment and test courier record an audit and do not charge a customer or book a parcel.

Invoice settings set the VAT rate shown on a printed invoice, the invoice prefix, a footer note, and a signature name. VAT is not added on top of the order total. Social links drive the footer icons and the WhatsApp and Messenger buttons.

System settings turn on maintenance mode for shoppers. Staff can still browse the store and the admin. Cookie banner text, header and footer scripts, a database export, restore, and cache clear are on the same screen. Type `RESTORE` before a backup replaces the database.

## Content

Staff who can manage content open `/admin/content`. The sample admin phone is `01700000000` and the password is `pass1234`. A content editor can open this area. A staff account that only manages orders cannot.

Saving a page slug that already exists updates that page. The body uses the rich text editor. SEO title and description are stored with the page and used on the public page. Published pages replace the sample text at `/{slug}`. Drafts stay off the store.

Blog categories and posts work the same way. A published post appears on `/blog`. Menus cover header, footer, mobile, and the footer service group. The public menu API reads those links.

Homepage sections can be reordered by dragging or with Up and Down, then saved. Uncheck Show to hide a section. Featured can take a category slug such as `fashion`. Testimonials stay hidden until that section is shown and a quote is saved. FAQ answers appear on `/faq` after the first question is saved. Until then the sample FAQ list stays.

## Marketing

Staff who can manage the catalog open `/admin/marketing`. The sample admin phone is `01700000000` and the password is `pass1234`.

Coupons can be a percent, a fixed amount, or free shipping. Each coupon can set a minimum cart, a total usage limit, a per-customer limit, a date range, and an optional category or product slug. Checkout applies those rules. A free-shipping coupon sets delivery to zero when the cart qualifies. The per-customer limit is checked against the phone used at checkout.

Flash sales have a start, an end, a sale price, and an optional quantity limit. The store countdown uses the end time. Checkout refuses the SKU once sold units reach that limit.

Banners use placements home, category, popup, and exit. Popup and exit are the popup and exit-intent offers. Sliders are the home slides. The public banners API returns active banners whose dates include now.

Audience holds newsletter subscribers and email or SMS campaigns. Sending queues the messages until a gateway is connected. Abandoned carts can queue a reminder when the cart has a phone or email.

Product rules link two product slugs as an upsell, cross-sell, bundle, or related product. Loyalty points and referrals are a later optional slice.

## Inventory

Staff who can manage the catalog open `/admin/inventory`. The sample admin phone is `01700000000` and the password is `pass1234`.

The stock page lists each variant, with low-stock and out-of-stock alerts. Adjust stock with a signed quantity, a reason, and a note. That writes a row on the ledger. Order placement already reduces stock and writes a sale movement. Confirming an order does not reduce stock again. Cancelling, returning, failing, or refunding an order puts the stock back.

Assign barcode copies the SKU into the barcode field when it is empty. Print labels opens a sheet with a Code 39 barcode. Use the browser print dialog and choose Save as PDF.

Add a warehouse when you want movements and received purchases recorded against a location. The first warehouse is the default. Add a supplier, create a draft purchase by SKU, then receive it once. Receiving adds the quantities and writes a purchase movement.

## Customers

Staff who can manage customers open `/admin/customers`. The sample admin phone is `01700000000` and the password is `pass1234`.

Search matches name, phone, or email. Filter by open or blocked, or by a tag such as `vip`. Lifetime value is the sum of that customer's orders except cancelled ones. The profile shows order history, addresses used on orders, and saved addresses. Tags are also the customer segments. Block stops checkout for that phone. Export CSV downloads the current filter.

## Orders

Staff who can manage orders open `/admin/orders`. The sample admin phone is `01700000000` and the password is `pass1234`.

The list filters by status, date, payment method, payment status, courier, and area. Search matches the order ID, phone, or customer name. Changing a status queues an SMS, and an email when the order has an address. Those rows stay queued until an SMS gateway and SMTP are connected.

Send to Steadfast stores consignment `LOCAL-{order number}` and the tracking code while `STEADFAST_API_KEY` and `STEADFAST_SECRET_KEY` are empty. With both keys set, the button books the parcel and stores the consignment id and tracking code. Sync reads the courier status for real consignments.

Invoice, packing slip, and shipping label open a print view with the UniBaazar name, a Code 39 barcode, and a QR code. Use the browser print dialog and choose Save as PDF. Bulk print uses the same page. An order's detail page also has an "Invoice PDF" button that downloads a real generated PDF directly (no browser print dialog); the order list has the same as a bulk "Invoice PDFs" action.

## Variants

A variable product stores one row per option combination. Each row has its own price, sale price, SKU, stock, and image. A simple product stores one default variant with no options.

On `/product/cotton-crew-tshirt`, change size and color. The price, SKU, stock, and image follow that combination. L + Black is out of stock. L + White is ৳750, SKU `TEE-L-WHT`. A simple product such as `/product/redmi-buds-4` has one price and no option buttons.

`npm run test:variants` checks combination generation and bulk edits.

## Database

Create the database, then point `.env` at it. On this Laragon install, root has no password:

```bash
copy .env.example .env
```

Set `DATABASE_URL=mysql://root@127.0.0.1:3306/unibaazar`, then:

```bash
npm run db:migrate
npm run db:seed
```

The migrations are applied on the local `unibaazar` database. Set `AUTH_SECRET` in `.env` before login. `npm run db:seed` loads the catalog, coupons, pages, and the sample customer. It resets variant stock to the sample quantities and does not delete orders.

Sample customer: phone `01711111111`, password `pass1234`. Staff dashboard: phone `01700000000`, password `pass1234`, then open `/admin`. The same staff login can manage products at `/admin/products`. Track `UB10021` with the customer phone. Checkout ignores a client price and stores the database price. A non-COD payment stays pending until Phase 4. In development, forgot-password includes `previewCode` in the JSON response.

## Security

Passwords are bcrypt hashes. The session cookie `ub_session` is httpOnly, SameSite=Lax, and Secure in production. State-changing API calls that send an `Origin` header must match this site. Login and registration allow 8 attempts per 15 minutes per IP. OTP and password reset allow 5. Checkout allows 10 per hour.

Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` to require Cloudflare Turnstile on login, registration, password reset, and checkout. Both can stay blank while developing locally.

Checkout blocks a blacklisted phone or IP (`security.blockedPhones` and `security.blockedIps` settings), a repeat of the same cart within 10 minutes, a phone with 3 cancelled orders and no delivery, and more than 5 orders from one IP or browser in a Dhaka day. When `STEADFAST_API_KEY` and `STEADFAST_SECRET_KEY` are set, checkout also checks the Steadfast fraud ratio.

Staff permissions are seeded for super-admin, admin, manager, staff, content-editor, and accountant. Login, order placement, and payment callbacks are written to the audit log. Webhook callbacks must send `x-webhook-secret` matching `AUTH_SECRET`.

On the cPanel server, schedule a daily backup:

```bash
0 2 * * * cd /home/USER/unibaazar && /bin/sh scripts/backup-db.sh
```

`mysqldump` must be on the server `PATH`. Dump files go in `backups/`, which is gitignored.

Set `CRON_SECRET` in `.env` to a random string, then schedule these cPanel Cron Jobs:

```bash
# Cancel unpaid non-COD orders stuck in PENDING for over 24h (hourly)
0 * * * * curl -fsS -X POST "https://example.com/api/v1/cron/cancel-unpaid-orders?secret=$CRON_SECRET"

# Catch any variant that drifted below its low-stock threshold (every 30 min)
*/30 * * * * curl -fsS -X POST "https://example.com/api/v1/cron/low-stock-sweep?secret=$CRON_SECRET"
```

Both endpoints also accept the secret as `Authorization: Bearer <CRON_SECRET>` and return 401 without it. Low-stock alerts still fire immediately on order placement and manual stock adjustment — the sweep is only a safety net for stock changes outside those two paths.
