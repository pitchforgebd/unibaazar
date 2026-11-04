# 0038 — Tracking rebuild against each platform's documentation

Date: 2026-11-04
Status: accepted

## Context

The owner asked for every field in Admin → Tracking to work, for GTM's data
layer to follow Google's GA4 ecommerce guide, and for two boxes for custom
`<head>` and `<body>` code. Reading the code against the platform docs showed
that almost nothing had ever worked in production:

- **Saving failed.** Browsers autofilled login details: the email into "Meta test
  event code" (which validation then rejected, so nothing saved) and the password
  into the token box.
- **The CSP blocked every tag.** It listed none of the tag domains.
- **`gtag` was a no-op.** It pushed a plain array; gtag.js only reads `arguments`
  objects.
- **TikTok, Pinterest and Snap never started.** The script files loaded, but with
  no init call, so `ttq`, `pintrk` and `snaptr` never existed.
- **Consent defaults were set after tags, and only when GA4 was configured.**
  Google requires them before any tag.
- **Events carried no product data.** `dataLayer` got `{event: "AddToCart", slug}`
  rather than GA4's `ecommerce.items`, and Meta got no `content_ids`.
- **First events were lost.** `ViewContent` fired from a child effect, before
  `StorePixels` had started the pixels, on every full page load.
- **Server Purchase was weak or rejected.** No `client_user_agent` (required for
  website events), and phones hashed without the country code, which can never
  match.
- **Search Console's tag went through streamed metadata**, which can land outside
  `<head>` on dynamic pages.
- **System → Header/Footer script** wrapped input in `<script>`, so pasting a real
  tag was a syntax error, and it also ran inside the admin.

## Decision

**One event, many mappers.** `src/lib/tracking/ecommerce.ts` holds pure functions
turning one event into GA4, Meta, TikTok, Pinterest and Snap shapes. Browser and
server use the same mappers, so `event_name` can't drift, which Meta's
deduplication depends on. Item ids are variant SKUs, matching the catalog feeds.

**Google tags load on every page under Consent Mode v2.** Server-rendered in
`<head>`, in Google's required order: data layer, consent default denied, saved
choice, then tags. This replaces load-after-consent for Google only. Google's tags
adapt to denied consent, and it's what makes GTM preview and Tag Assistant work.
After an explicit **Reject**, the data layer gets nothing further. Other platforms
have no consent mode, so they still load only after consent.

**Events raised early are queued, not lost,** until the pixels have started and the
shopper has decided. Rejecting discards them.

**Server events** go to Meta and TikTok for the main funnel, relayed from
`/api/v1/tracking` when marketing consent was given, with the browser's event id.
Purchase is never relayed: its value comes only from the order.

**Custom code** is stored with the tracking settings and replaces the System
fields, which are removed. Head code is parsed and rendered as real tags so
crawlers see it in raw HTML. Saving refuses anything that would break the page: an
unclosed `<script>` or comment, tags that can't go in the head, or an ID also set
in its own field. It doesn't run in the admin.

**CSP is now split.** The storefront allows any `https:` origin plus
`'unsafe-eval'`. GTM containers and custom code load tags from domains nobody can
list at build time, and Google's guide needs `'unsafe-eval'` for GTM custom
JavaScript variables. Since `script-src` already had `'unsafe-inline'`, this gives
up little real XSS protection. The admin keeps its original narrow policy.

## Consequences

- New migration `20261104010000_order_ad_identifiers`: `Order.userAgent`, `ttp`,
  `ttclid`, so a gateway payment confirmed later can still send a complete event.
- `htmlparser2` is now a direct dependency (already installed via sanitize-html).
- Anything stored in System → Header/Footer script stops rendering and must be
  re-entered in Admin → Tracking.
- ConversionApiLog gets a row per relayed event, so `sent` rows older than 30 days
  are pruned by the daily retry job.
- Verified with stubbed vendors in `e2e/parity/tracking.spec.ts`, and once by hand
  against the real scripts over the network (zero CSP or page errors, hits observed
  to Meta, TikTok, Pinterest and GA4).

## Known limits

- TikTok's and Snap's developer docs couldn't be read (a JS-only portal, and the
  CAPI page only for Snap). Field names come from integrator docs and the tags'
  well-known base code, so confirm with each platform's test tool. Snap sent no hit
  with a dummy pixel id.
- For gateway payments, the browser `purchase` fires when the shopper reaches the
  success page, whether or not the payment finished. The server events do wait for
  payment. Worth fixing when a real gateway goes live.
- `refund`, `view_promotion` and `select_promotion` aren't sent. Refunds need GA4's
  Measurement Protocol.
- Changing quantity in the cart sends no event; only adding and removing do.
- GTM's noscript can't be the literal first node in `<body>`, because Next.js
  renders its own element first. Only Search Console's GTM verification method
  cares, and the HTML tag method works.
