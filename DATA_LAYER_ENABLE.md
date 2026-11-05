# Data Layer Enable

একটা e-commerce সাইটে GA4 ecommerce data layer, Google Tag Manager, Consent
Mode v2, Meta/TikTok/Pinterest/Snap pixel আর server-side Conversions API পুরোটা
চালু করার গাইড। UniBaazar-এ (Next.js) এটা বানানো আর live-এ পরীক্ষা করা হয়েছে।
এখানে দুটো রূপ আছে:

- **§৩: যেকোনো প্রজেক্টের জন্য plain JavaScript** (Laravel, WordPress, PHP, যা খুশি)। নতুন প্রজেক্টে এটা কপি করলেই হবে।
- **§৯: UniBaazar-এ কোন ফাইলে কী আছে** (Next.js/TypeScript সংস্করণ)।

---

## ১. পুরো সিস্টেম এক নজরে

```
সাইটের যেকোনো জায়গা  ──►  track("AddToCart", data)      (একটাই function)
                              │
        ┌─────────────────────┼──────────────────────────┬──────────────────────┐
        ▼                     ▼                          ▼                      ▼
  dataLayer.push         GA4 (gtag, আলাদা           Meta / TikTok /        Server:
  (GTM পড়ে)             data layer-এ)             Pinterest / Snap       Meta CAPI + TikTok
                                                    pixel                  Events API
```

মূল নিয়ম:

1. **একটা event, একটা `event_id`।** Browser আর server একই id পাঠায়, তাই Meta/TikTok দুবার গোনে না।
2. **একটা mapper প্রতিটা platform-এর জন্য।** `AddToCart` থেকে GA4-এ `add_to_cart`, Meta-তে `AddToCart`, TikTok-এ `AddToCart`। নাম একবারই লেখা।
3. **Google tag সবসময় load হয়, Consent Mode মেনে।** অন্য pixel শুধু cookie Accept করলে।
4. **`item_id` = variant SKU**, Facebook/Google catalog feed-এর id-র সাথে মিলিয়ে।

---

## ২. Event তালিকা: কোনটা কখন

| আমাদের নাম             | GA4 (`dataLayer.event`) | Meta                   | TikTok                 | কখন fire হয়                   |
| ---------------------- | ----------------------- | ---------------------- | ---------------------- | ------------------------------ |
| `PageView`             | `page_view`             | `PageView`             | `ttq.page()`           | প্রতিটা page / route change    |
| `ViewItemList`         | `view_item_list`        | —                      | —                      | Shop / category / brand page   |
| `SelectItem`           | `select_item`           | —                      | —                      | List থেকে product-এ click      |
| `ViewContent`          | `view_item`             | `ViewContent`          | `ViewContent`          | Product page                   |
| `AddToCart`            | `add_to_cart`           | `AddToCart`            | `AddToCart`            | Cart-এ যোগ                     |
| `RemoveFromCart`       | `remove_from_cart`      | —                      | —                      | Cart থেকে বাদ                  |
| `ViewCart`             | `view_cart`             | —                      | —                      | Cart page                      |
| `AddToWishlist`        | `add_to_wishlist`       | `AddToWishlist`        | `AddToWishlist`        | Wishlist-এ যোগ                 |
| `InitiateCheckout`     | `begin_checkout`        | `InitiateCheckout`     | `InitiateCheckout`     | Checkout page খুললে            |
| `AddShippingInfo`      | `add_shipping_info`     | —                      | —                      | Order submit                   |
| `AddPaymentInfo`       | `add_payment_info`      | `AddPaymentInfo`       | `AddPaymentInfo`       | Order submit                   |
| `Purchase`             | `purchase`              | `Purchase`             | `CompletePayment`      | Order success page, **একবারই** |
| `Search`               | `search`                | `Search`               | `Search`               | Search result                  |
| `CompleteRegistration` | `sign_up`               | `CompleteRegistration` | `CompleteRegistration` | Account খোলা                   |
| `Login`                | `login`                 | —                      | —                      | Login                          |
| `Lead`                 | `generate_lead`         | `Lead`                 | `Contact`              | WhatsApp বাটনে click           |

Pinterest: `pagevisit`, `viewcategory`, `addtocart`, `checkout`, `search`, `signup`, `lead`।
Snap: `VIEW_CONTENT`, `ADD_CART`, `ADD_TO_WISHLIST`, `START_CHECKOUT`, `ADD_BILLING`, `PURCHASE`, `SEARCH`, `SIGN_UP`।

### Data layer-এ ঠিক কী যায় (live থেকে নেওয়া আসল উদাহরণ)

```js
dataLayer.push({ ecommerce: null }); // আগের ecommerce মুছে ফেলা, Google-এর নিয়ম
dataLayer.push({
  event: "view_item",
  event_id: "c2c957aa-9c7a-4f71-b4d3-60687d5fea36",
  ecommerce: {
    currency: "BDT",
    value: 999,
    items: [
      {
        item_id: "001", // variant SKU
        item_name: "Ayan 52 Pages Intelligent Book",
        affiliation: "UniBaazar",
        index: 0,
        item_brand: "Ayan",
        item_category: "Book", // category-র নাম, slug না
        item_category2: "Story books", // parent → child, ৫ ধাপ পর্যন্ত
        price: 999, // সংখ্যা, string না
        quantity: 1, // view_item-এ 1, stock না
      },
    ],
  },
});
```

`purchase`-এ এর সাথে আরও যায়: `transaction_id`, `value`, `tax`, `shipping`, `coupon`,
আর GTM-এর জন্য `ecommerce.customer` (§৬)।

---

## ৩. Plain JavaScript সংস্করণ (যেকোনো প্রজেক্টে কপি করুন)

### ৩.১ `<head>`-এর একদম শুরুতে, অন্য সব script-এর আগে

এই ক্রম বদলাবেন না: data layer → consent default (denied) → সংরক্ষিত পছন্দ →
GTM → GA4। Google-এর নিয়ম, ক্রম ভুল হলে consent কাজ করে না।

```html
<script>
  // ১. দুটো আলাদা data layer: GTM-এর জন্য dataLayer, সরাসরি GA4-এর জন্য ubGtagLayer।
  //    একটাতে রাখলে GTM gtag-এর event-কেও event ধরে, ফলে প্রতিটা tag দুবার fire হয়।
  window.dataLayer = window.dataLayer || [];
  window.ubGtagLayer = window.ubGtagLayer || [];
  function gtmGtag() {
    dataLayer.push(arguments);
  } // arguments, array না!
  function ubGtag() {
    ubGtagLayer.push(arguments);
  }
  window.ubGtag = ubGtag;
  // consent দুটো layer-এই যায়, event শুধু একটায়
  function gtag() {
    gtmGtag.apply(null, arguments);
    ubGtag.apply(null, arguments);
  }
  window.gtag = gtag;
  window.__ubGoogle = { ga4: "G-XXXXXXXXXX", ads: "", adsLabel: "" };

  // ২. Consent Mode v2: শুরুতে সব denied
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    wait_for_update: 500,
  });

  // ৩. আগে Accept/Reject করে থাকলে সেটা এখনই প্রয়োগ
  (function () {
    var c = null;
    try {
      var r = localStorage.getItem("site:cookie");
      c =
        r === "accept"
          ? { analytics: true, marketing: true }
          : r === "reject"
            ? null
            : JSON.parse(r);
    } catch (e) {}
    if (c) {
      var a = c.analytics === true,
        m = c.marketing === true;
      gtag("consent", "update", {
        analytics_storage: a ? "granted" : "denied",
        ad_storage: m ? "granted" : "denied",
        ad_user_data: m ? "granted" : "denied",
        ad_personalization: m ? "granted" : "denied",
      });
    }
  })();

  // ৪. GTM (Google-এর নিজের snippet)
  (function (w, d, s, l, i) {
    w[l] = w[l] || [];
    w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var f = d.getElementsByTagName(s)[0],
      j = d.createElement(s),
      dl = l != "dataLayer" ? "&l=" + l : "";
    j.async = true;
    j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
    f.parentNode.insertBefore(j, f);
  })(window, document, "script", "dataLayer", "GTM-XXXXXXX");

  // ৫. সরাসরি GA4 (GTM-এর ভেতরে GA4 tag থাকলে এই অংশ আর নিচের script বাদ দিন)
  ubGtag("js", new Date());
  ubGtag("config", "G-XXXXXXXXXX");
</script>
<!-- &l=ubGtagLayer: gtag.js-কে আলাদা layer পড়তে বলে -->
<script
  async
  src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX&l=ubGtagLayer"
></script>

<!-- Search Console (HTML tag পদ্ধতি) — অবশ্যই <head>-এ -->
<meta name="google-site-verification" content="আপনার-কোড" />
```

`<body>` খোলার ঠিক পরে:

```html
<noscript
  ><iframe
    src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
    height="0"
    width="0"
    style="display:none;visibility:hidden"
  ></iframe
></noscript>
```

### ৩.২ `tracking.js`: একটাই `track()` function

```js
// ---------- consent ----------
const CONSENT_KEY = "site:cookie";

function readConsent() {
  const raw = localStorage.getItem(CONSENT_KEY);
  if (!raw) return null;
  if (raw === "accept") return { analytics: true, marketing: true };
  if (raw === "reject") return { analytics: false, marketing: false };
  try {
    const c = JSON.parse(raw);
    return { analytics: c.analytics === true, marketing: c.marketing === true };
  } catch {
    return null;
  }
}

// Cookie banner-এর Accept/Reject/Save বাটন এটা ডাকবে
function saveConsent(c) {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(c));
  window.gtag?.("consent", "update", {
    analytics_storage: c.analytics ? "granted" : "denied",
    ad_storage: c.marketing ? "granted" : "denied",
    ad_user_data: c.marketing ? "granted" : "denied",
    ad_personalization: c.marketing ? "granted" : "denied",
  });
  if (c.marketing) startPixels();
  flushTracking();
}

// ---------- mapping ----------
const CURRENCY = "BDT";
const AFFILIATION = "UniBaazar";

const GA4 = {
  PageView: "page_view",
  ViewItemList: "view_item_list",
  SelectItem: "select_item",
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  RemoveFromCart: "remove_from_cart",
  ViewCart: "view_cart",
  AddToWishlist: "add_to_wishlist",
  InitiateCheckout: "begin_checkout",
  AddShippingInfo: "add_shipping_info",
  AddPaymentInfo: "add_payment_info",
  Purchase: "purchase",
  Search: "search",
  CompleteRegistration: "sign_up",
  Login: "login",
  Lead: "generate_lead",
};
const ECOMMERCE = [
  "ViewItemList",
  "SelectItem",
  "ViewContent",
  "AddToCart",
  "RemoveFromCart",
  "ViewCart",
  "AddToWishlist",
  "InitiateCheckout",
  "AddShippingInfo",
  "AddPaymentInfo",
  "Purchase",
];
const META = {
  PageView: "PageView",
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  AddToWishlist: "AddToWishlist",
  InitiateCheckout: "InitiateCheckout",
  AddPaymentInfo: "AddPaymentInfo",
  Purchase: "Purchase",
  Search: "Search",
  CompleteRegistration: "CompleteRegistration",
  Lead: "Lead",
};
const TIKTOK = {
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  AddToWishlist: "AddToWishlist",
  InitiateCheckout: "InitiateCheckout",
  AddPaymentInfo: "AddPaymentInfo",
  Purchase: "CompletePayment",
  Search: "Search",
  CompleteRegistration: "CompleteRegistration",
  Lead: "Contact",
};

const compact = (o) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ""));
const sumItems = (items) => items.reduce((s, i) => s + i.price * i.quantity, 0);
const valueOf = (d) => d.value ?? (d.items?.length ? sumItems(d.items) : undefined);
const CAT_KEYS = [
  "item_category",
  "item_category2",
  "item_category3",
  "item_category4",
  "item_category5",
];

// item: { id, name, price, quantity, brand?, categories?: ["Book","Story books"], variant? }
function toGa4(name, d) {
  const ecommerce = ECOMMERCE.includes(name);
  const params = ecommerce
    ? compact({
        currency: d.currency ?? CURRENCY,
        value: valueOf(d),
        transaction_id: d.transactionId,
        tax: name === "Purchase" ? (d.tax ?? 0) : undefined,
        shipping: d.shipping,
        coupon: d.coupon,
        payment_type: d.paymentType,
        shipping_tier: d.shippingTier,
        item_list_name: d.listName,
        items: d.items?.map((it, index) =>
          compact({
            item_id: it.id,
            item_name: it.name,
            affiliation: AFFILIATION,
            coupon: d.coupon,
            index,
            item_brand: it.brand,
            ...Object.fromEntries(
              (it.categories ?? []).slice(0, 5).map((n, at) => [CAT_KEYS[at], n]),
            ),
            item_list_name: d.listName,
            item_variant: it.variant,
            price: it.price,
            quantity: it.quantity,
          }),
        ),
      })
    : compact({
        search_term: d.searchTerm,
        method: d.method,
        channel: d.channel,
        page_path: d.path,
        page_title: d.title,
        page_location: d.url,
      });
  return { event: GA4[name], params, ecommerce };
}

function toMeta(name, d) {
  if (!META[name]) return null;
  const items = d.items ?? [];
  return {
    event: META[name],
    params: compact({
      currency: items.length || d.value ? (d.currency ?? CURRENCY) : undefined,
      value: valueOf(d),
      content_type: items.length ? "product" : undefined,
      content_ids: items.length ? items.map((i) => i.id) : undefined,
      content_name: items.length === 1 ? items[0].name : undefined,
      contents: items.length
        ? items.map((i) => ({ id: i.id, quantity: i.quantity, item_price: i.price }))
        : undefined,
      num_items: items.length ? items.reduce((s, i) => s + i.quantity, 0) : undefined,
      search_string: d.searchTerm,
      order_id: d.transactionId,
    }),
  };
}

function toTiktok(name, d) {
  if (!TIKTOK[name]) return null;
  const items = d.items ?? [];
  return {
    event: TIKTOK[name],
    params: compact({
      currency: items.length || d.value ? (d.currency ?? CURRENCY) : undefined,
      value: valueOf(d),
      content_type: items.length ? "product" : undefined,
      contents: items.length
        ? items.map((i) => ({
            content_id: i.id,
            content_type: "product",
            content_name: i.name,
            quantity: i.quantity,
            price: i.price,
          }))
        : undefined,
      query: d.searchTerm,
    }),
  };
}

// ---------- sending ----------
function sendToGoogle(name, d, id) {
  const { event, params, ecommerce } = toGa4(name, d);
  if (ecommerce) {
    dataLayer.push({ ecommerce: null });
    dataLayer.push({
      event,
      event_id: id,
      ecommerce: d.customer ? { ...params, customer: d.customer } : params,
    });
  } else {
    dataLayer.push({ event, event_id: id, ...params });
  }
  const g = window.__ubGoogle;
  if (!g || name === "PageView") return; // page_view gtag config নিজেই পাঠায়
  if (g.ga4) ubGtag("event", event, { ...params, event_id: id, send_to: g.ga4 }); // customer কখনো GA4-এ না
  if (name === "Purchase" && g.ads && g.adsLabel) {
    ubGtag("event", "conversion", {
      send_to: `${g.ads}/${g.adsLabel}`,
      value: params.value,
      currency: params.currency,
      transaction_id: d.transactionId ?? id,
    });
  }
}

function sendToMarketing(name, d, id) {
  if (name === "PageView") {
    window.fbq?.("track", "PageView", {}, { eventID: id });
    window.ttq?.page();
    return;
  }
  const meta = toMeta(name, d);
  if (meta) window.fbq?.("track", meta.event, meta.params, { eventID: id });
  const tt = toTiktok(name, d);
  if (tt) window.ttq?.track(tt.event, tt.params, { event_id: id });
}

function sendToServer(name, d, id, marketing) {
  fetch("/api/tracking", {
    method: "POST",
    headers: { "content-type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      name,
      eventId: id,
      relay: marketing
        ? {
            url: location.href,
            items: d.items,
            value: d.value,
            currency: d.currency ?? CURRENCY,
            searchTerm: d.searchTerm,
            ...readAdIdentifiers(),
          }
        : undefined,
    }),
  }).catch(() => {});
}

// Pixel চালু হওয়ার আগে বা consent দেওয়ার আগের event হারিয়ে না যায়
let deferred = [];
let pixelsReady = false;
function flushTracking() {
  pixelsReady = true;
  if (!readConsent()) return;
  const pending = deferred;
  deferred = [];
  pending.forEach((send) => send());
}

function sendToVendors(name, d, id) {
  const c = readConsent();
  if (!c) return;
  if (c.marketing) sendToMarketing(name, d, id);
  if (c.analytics || c.marketing) sendToServer(name, d, id, c.marketing);
}

function track(name, data = {}, eventId) {
  const id = eventId ?? crypto.randomUUID();
  const c = readConsent();
  if (c && !c.analytics && !c.marketing) return; // Reject করলে কিছুই না
  if (!c || c.analytics) sendToGoogle(name, data, id); // Google: consent mode সামলায়
  if (c && pixelsReady) {
    sendToVendors(name, data, id);
    return;
  }
  deferred = [...deferred, () => sendToVendors(name, data, id)].slice(-25);
}
window.track = track;
```

### ৩.৩ Pixel চালু করা (শুধু marketing consent পেলে)

```js
const META_PIXEL_ID = "123456789012345";
const TIKTOK_PIXEL_ID = "CXXXXXXXXXXXXXXXXXXX";

function loadScript(id, src) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function startPixels() {
  if (META_PIXEL_ID && !window.fbq) {
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.push = fbq;
    fbq.disablePushState = true; // নিজে নিজে PageView পাঠানো বন্ধ, আমরা id দিয়ে পাঠাই
    window.fbq = window._fbq = fbq;
    loadScript("px-meta", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", META_PIXEL_ID);
  }
  if (TIKTOK_PIXEL_ID && !window.ttq) {
    window.TiktokAnalyticsObject = "ttq";
    const ttq = (window.ttq = []);
    ttq.methods = [
      "page",
      "track",
      "identify",
      "instances",
      "debug",
      "on",
      "off",
      "once",
      "ready",
      "alias",
      "group",
      "enableCookie",
      "disableCookie",
    ];
    ttq.methods.forEach((m) => {
      ttq[m] = (...args) => ttq.push([m, ...args]);
    });
    const src = "https://analytics.tiktok.com/i18n/pixel/events.js";
    ttq._i = { [TIKTOK_PIXEL_ID]: Object.assign([], { _u: src }) };
    ttq._t = { [TIKTOK_PIXEL_ID]: Date.now() };
    ttq._o = { [TIKTOK_PIXEL_ID]: {} };
    loadScript("px-tiktok", `${src}?sdkid=${TIKTOK_PIXEL_ID}&lib=ttq`);
  }
}

// Page load-এ: আগে Accept করা থাকলে pixel চালু, তারপর জমে থাকা event পাঠানো
document.addEventListener("DOMContentLoaded", () => {
  if (readConsent()?.marketing) startPixels();
  flushTracking();
  track("PageView", {
    path: location.pathname,
    title: document.title,
    url: location.href,
  });
});
```

### ৩.৪ Ad click id ধরে রাখা (`fbclid`, `ttclid`)

Pixel শুধু consent-এর পরে চলে, ততক্ষণে URL থেকে `fbclid` চলে যেতে পারে। তাই
প্রথম page-এই রেখে দিন:

```js
(function () {
  const q = new URLSearchParams(location.search);
  const saved = JSON.parse(localStorage.getItem("site:click-ids") || "{}");
  if (q.get("fbclid"))
    Object.assign(saved, { fbclid: q.get("fbclid"), fbclidAt: Date.now() });
  if (q.get("ttclid")) saved.ttclid = q.get("ttclid");
  localStorage.setItem("site:click-ids", JSON.stringify(saved));
})();

function readCookie(name) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

function readAdIdentifiers() {
  const c = JSON.parse(localStorage.getItem("site:click-ids") || "{}");
  return compact({
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc") ?? (c.fbclid ? `fb.1.${c.fbclidAt}.${c.fbclid}` : undefined),
    ttp: readCookie("_ttp"),
    ttclid: c.ttclid,
  });
}
```

Checkout-এর সময় `readAdIdentifiers()` order-এর সাথে server-এ পাঠান, order-এ
সংরক্ষণ করুন (`fbp`, `fbc`, `ttp`, `ttclid`, `user_agent`, `ip`)।

---

## ৪. কোথায় কোন event ডাকবেন (উদাহরণ)

```js
// Product page
track("ViewContent", {
  items: [
    {
      id: "001",
      name: "Ayan Book",
      price: 999,
      quantity: 1,
      brand: "Ayan",
      categories: ["Book", "Story books"],
    },
  ],
});

// Shop / category list
track("ViewItemList", { listName: "Shop", items: products.map(toItem) });

// Add to cart বাটন
track("AddToCart", { items: [{ ...toItem(product), quantity: qty }] });

// Checkout page খুললে (coupon থাকলে দিন)
track("InitiateCheckout", { items: cartItems, coupon: cart.couponCode });

// Order submit
track("AddShippingInfo", { items: cartItems, coupon, shippingTier: "inside-dhaka" });
track("AddPaymentInfo", { items: cartItems, coupon, paymentType: "cod" });

// Search
track("Search", { searchTerm: "lego" });
```

**Laravel/Blade-এ:** server-এর data JSON করে দিন, হাতে string বানাবেন না:

```blade
<script>
  track("ViewContent", @json(['items' => [[
      'id' => $product->sku,
      'name' => $product->name,
      'price' => (float) $product->price,   // সংখ্যা
      'quantity' => 1,
      'brand' => $product->brand?->name,
      'categories' => $product->categories->pluck('name')->take(5)->values(),
  ]]]));
</script>
```

---

## ৫. Purchase: একবারই, order id দিয়ে

```js
async function trackPurchase(order) {
  // Reload করলে আবার গোনা হবে না
  const done = JSON.parse(localStorage.getItem("site:tracked-orders") || "[]");
  if (done.includes(order.id)) return;
  localStorage.setItem(
    "site:tracked-orders",
    JSON.stringify([order.id, ...done].slice(0, 50)),
  );

  const customer =
    readConsent()?.marketing === false ? undefined : await purchaseCustomer(order);
  track(
    "Purchase",
    {
      transactionId: order.id,
      value: order.total,
      shipping: order.deliveryCharge,
      tax: 0,
      coupon: order.couponCode,
      customer,
      items: order.items.map((i) => ({
        id: i.sku,
        name: i.name,
        price: i.unitPrice,
        quantity: i.qty,
      })),
    },
    order.id,
  ); // event id = order id → server-এর Purchase-এর সাথে মিলে যায়
}
```

---

## ৬. Purchase-এ customer data (GTM-এর জন্য)

`ecommerce.customer`-এ প্রতিটা তথ্য আর তার SHA-256 hash যায়। **এটা কখনো GA4-এ
যাবে না**, কারণ Google GA4-এ ব্যক্তিগত তথ্য নিষেধ করে।

```js
// 01XXXXXXXXX → 8801XXXXXXXXX (Meta/Google এই রূপে মিলায়)
const intlPhone = (p) => {
  const d = p.replace(/\D/g, "").replace(/^0+/, "");
  return d.startsWith("880") ? d : `880${d}`;
};

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function purchaseCustomer(order) {
  const fields = {
    name: [order.name, order.name.trim().toLowerCase()],
    phone: [order.phone, intlPhone(order.phone)],
    email: [order.email, order.email.trim().toLowerCase()],
    address: [order.address, order.address.trim().toLowerCase()],
    ...(order.area === "inside-dhaka" ? { city: ["Dhaka", "dhaka"] } : {}),
    country: ["BD", "bd"],
  };
  const customer = {};
  for (const [key, [value, normalised]] of Object.entries(fields)) {
    if (!value?.trim()) continue;
    customer[key] = value.trim();
    customer[`${key}_hash`] = await sha256(normalised);
  }
  return customer;
}
```

ফলাফল: `{ name, name_hash, phone, phone_hash, email, email_hash, address, address_hash, city, city_hash, country, country_hash }`

---

## ৭. Server-side: Meta Conversions API ও TikTok Events API

Ad blocker থাকলেও event পৌঁছায়। Browser-এর **একই `event_id`** পাঠান, তাহলে
platform দুবার গোনে না। Purchase-এর value সবসময় database-এর order থেকে নিন,
browser থেকে না।

### নিয়ম (ভুল করলে match হয় না)

| ঘর                  | নিয়ম                                                          |
| ------------------- | -------------------------------------------------------------- |
| `ph`                | SHA-256 of `8801XXXXXXXXX` (country code সহ, শুরুর 0 ছাড়া)    |
| `em`                | SHA-256 of trimmed + lowercase                                 |
| `client_user_agent` | Hash না, **website event-এ বাধ্যতামূলক**                       |
| `client_ip_address` | Hash না, আসল IP                                                |
| `fbp`, `fbc`        | Hash না, cookie থেকে                                           |
| TikTok `phone`      | SHA-256 of `+8801XXXXXXXXX`                                    |
| `test_event_code`   | শুধু পরীক্ষার সময়, পরে মুছে দিন (test event ad-এ গোনা হয় না) |

### Meta (PHP/Laravel উদাহরণ)

```php
$hash = fn ($v) => hash('sha256', $v);
$phone = preg_replace('/\D/', '', ltrim($order->phone, '0'));
$phone = str_starts_with($phone, '880') ? $phone : '880'.$phone;

Http::timeout(5)->post("https://graph.facebook.com/v21.0/{$pixelId}/events?access_token={$token}", [
    'data' => [[
        'event_name' => 'Purchase',
        'event_time' => time(),
        'event_id' => $order->number,            // browser-এর eventID-র সমান
        'action_source' => 'website',
        'event_source_url' => url("/order-success/{$order->number}"),
        'user_data' => array_filter([
            'ph' => [$hash($phone)],
            'em' => $order->email ? [$hash(strtolower(trim($order->email)))] : null,
            'client_ip_address' => $order->ip,
            'client_user_agent' => $order->user_agent,
            'fbp' => $order->fbp,
            'fbc' => $order->fbc,
        ]),
        'custom_data' => [
            'currency' => 'BDT',
            'value' => (float) $order->total,
            'content_type' => 'product',
            'content_ids' => $order->items->pluck('sku'),
            'order_id' => $order->number,
        ],
    ]],
    // 'test_event_code' => 'TEST12345',
]);
```

### TikTok

```php
Http::timeout(5)->withHeaders(['Access-Token' => $tiktokToken])
  ->post('https://business-api.tiktok.com/open_api/v1.3/event/track/', [
    'event_source' => 'web',
    'event_source_id' => $tiktokPixelId,
    'data' => [[
        'event' => 'CompletePayment',
        'event_time' => time(),
        'event_id' => $order->number,
        'user' => array_filter([
            'phone' => $hash('+'.$phone),
            'email' => $order->email ? $hash(strtolower(trim($order->email))) : null,
            'ip' => $order->ip,
            'user_agent' => $order->user_agent,
            'ttp' => $order->ttp,
            'ttclid' => $order->ttclid,
        ]),
        'page' => ['url' => url("/order-success/{$order->number}")],
        'properties' => ['currency' => 'BDT', 'value' => (float) $order->total],
    ]],
]);
```

প্রতিটা send-এর ফলাফল (sent/failed + platform-এর error message) একটা log table-এ
রাখুন, failed গুলো দিনে একবার retry করুন (সর্বোচ্চ ৫ বার)।

**অন্য event (AddToCart, ViewContent ইত্যাদি) server থেকে:** browser
`/api/tracking`-এ `relay` পাঠায় (§৩.২), server request-এর IP আর User-Agent যোগ
করে একই `event_id` দিয়ে Meta/TikTok-এ পাঠায়। এটা করা হয় শুধু marketing consent
থাকলে।

---

## ৮. GTM-এর ভেতরে যা করতে হবে

### GA4 GTM দিয়ে চালালে (তখন §৩.১-এর ধাপ ৫ আর gtag.js script বাদ দিন)

1. **Google tag**: আপনার `G-` ID, trigger: Initialization - All Pages।
2. **Trigger → Custom Event**, regex চালু করে:
   `view_item_list|select_item|view_item|add_to_cart|remove_from_cart|view_cart|add_to_wishlist|begin_checkout|add_shipping_info|add_payment_info|purchase`
3. **GA4 Event tag**: Event name `{{Event}}`, **Send Ecommerce data** টিক, source: Data Layer, trigger: উপরেরটা।
4. Page view-এর জন্য GA4-এর Enhanced Measurement-এ "browser history events" চালু রাখুন, আলাদা page_view tag দেবেন না।
5. **Submit → Publish।** Publish না করলে সাইটে কিছুই বদলায় না।

**GA4 হয় GTM-এ, নয়তো সরাসরি (admin ফিল্ডে), দুটো একসাথে না।** দুটোই থাকলে সব
দুবার গোনা হয়।

### Meta pixel GTM দিয়ে চালালে

1. **Meta pixel একটা জায়গাতেই রাখুন:** GTM-এ থাকলে সাইটের admin-এর Meta pixel ID ফাঁকা রাখুন।
2. প্রতিটা Meta tag-এর **Event ID** ঘরে Data Layer Variable `event_id` দিন। না দিলে browser আর server event মেলানো যায় না।
3. Purchase tag-এর Advanced Matching-এ `ecommerce.customer.email_hash`, `phone_hash` ইত্যাদি Data Layer Variable map করুন।
4. Trigger: Custom Event `add_to_cart`, `begin_checkout`, `purchase` ইত্যাদি।

---

## ৯. UniBaazar-এ কোন ফাইলে কী (Next.js)

| ফাইল                                                          | কাজ                                                                   |
| ------------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/lib/tracking/names.ts`                                   | সব event-এর নাম, আর কোনগুলো server-এ relay হয়                        |
| `src/lib/tracking/ecommerce.ts`                               | Mapper: GA4, Meta, TikTok, Pinterest, Snap, আর `productTrackItem()`   |
| `src/lib/tracking/browser.ts`                                 | `track()`, consent, queue, data layer push                            |
| `src/lib/tracking/googleSnippet.ts`                           | `<head>`-এর Google script (§৩.১), দুটো data layer                     |
| `src/lib/tracking/vendors.ts`                                 | Meta/TikTok/Pinterest/Snap/Clarity/Hotjar pixel loader                |
| `src/lib/tracking/customer.ts`                                | Purchase-এর customer data + hash                                      |
| `src/lib/tracking/events.ts`                                  | `trackPurchase()`, একবারই                                             |
| `src/lib/tracking/fbclid.ts`                                  | `fbclid`/`ttclid` ধরে রাখা, `_fbp`/`_fbc`/`_ttp` পড়া                 |
| `src/lib/tracking/cart.ts`                                    | Cart line → item                                                      |
| `src/components/layout/TrackingTags.tsx`                      | `<head>` আর `<body>`-এ tag render (server-side, raw HTML-এ দেখা যায়) |
| `src/components/store/tracking/StorePixels.tsx`               | Consent অনুযায়ী pixel চালু, PageView                                 |
| `src/components/store/tracking/TrackOnce.tsx`                 | Page-এ একবার event (ViewContent, ViewCart ইত্যাদি)                    |
| `src/components/store/tracking/SelectItemTracker.tsx`         | List থেকে product click → `select_item`                               |
| `src/app/api/v1/tracking/route.ts`                            | Browser event গ্রহণ, server relay                                     |
| `src/server/tracking/capi.ts`                                 | Meta/TikTok server payload, hash, phone normalization                 |
| `src/server/tracking/signals.ts`                              | পাঠানো, log, retry                                                    |
| `src/server/tracking/snippets.ts`                             | Admin-এর custom head/body code যাচাই                                  |
| `src/app/(admin)/admin/tracking/page.tsx`                     | Admin → Tracking পেজ                                                  |
| `e2e/parity/tracking.spec.ts`                                 | পুরো সিস্টেমের browser test                                           |
| `docs/tracking.md`, `docs/decisions/0038-tracking-rebuild.md` | সেটআপ গাইড আর সিদ্ধান্তের কারণ                                        |

---

## ১০. যে ভুলগুলো আমরা ধরেছি (পরের প্রজেক্টে এগুলো আগেই এড়িয়ে চলুন)

| সমস্যা                                                       | সমাধান                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| `gtag` array push করত, gtag.js সেটা পড়ে না                  | `function gtag(){dataLayer.push(arguments);}`, **arguments**          |
| GA4 সরাসরি + GTM: প্রতিটা event GTM-এ দুবার fire             | সরাসরি GA4-এর জন্য আলাদা data layer (`&l=ubGtagLayer`)                |
| GTM container খালি, তাই data layer থাকলেও GA4-এ কিছু যায় না | GTM-এ tag বানিয়ে **Publish**, অথবা admin-এ GA4 ID                    |
| Consent default tag-এর পরে বসানো                             | সবার আগে consent default                                              |
| CSP সব tag block করত                                         | Storefront CSP-তে `https:` আর `'unsafe-eval'` (GTM custom JS-এর জন্য) |
| TikTok/Pinterest/Snap script load হত কিন্তু `init` হত না     | §৩.৩-এর মতো stub + `init`                                             |
| প্রথম page load-এর event (ViewContent) হারিয়ে যেত           | Pixel চালুর আগের event queue-তে রাখা, পরে flush                       |
| `item_category`-তে slug যেত                                  | Category-র নাম, parent থেকে child, ৫ ধাপ পর্যন্ত                      |
| `price` string                                               | সংখ্যা                                                                |
| Phone hash-এ country code ছিল না, তাই কখনো match হত না       | `8801XXXXXXXXX` (Meta), `+8801XXXXXXXXX` (TikTok)                     |
| Server event-এ `client_user_agent` ছিল না (Meta বাধ্যতামূলক) | Order-এ user agent সংরক্ষণ                                            |
| Purchase reload করলে আবার যেত                                | Order id localStorage-এ রেখে একবারই                                   |
| Browser autofill admin-এর ঘরে email/password বসিয়ে দিত      | `autocomplete="off"` / `"new-password"`                               |
| Search Console tag streaming-এ `<head>`-এর বাইরে চলে যেত     | Server-side সরাসরি `<head>`-এ render                                  |
| Meta pixel নিজে প্রতিটা pushState-এ বাড়তি PageView পাঠাত    | `fbq.disablePushState = true`                                         |

---

## ১১. পরীক্ষার চেকলিস্ট

- [ ] `view-source:` এ `<head>`-এ consent default আছে, তারপর GTM; `<body>`-র শুরুতে GTM noscript।
- [ ] Browser console-এ `dataLayer`: প্রতিটা ecommerce event-এর আগে `{ecommerce: null}`, আর প্রতিটা event **একবারই**।
- [ ] `dataLayer`-এ `["event", ...]` রূপের কোনো gtag entry নেই (থাকলে GTM দুবার fire করবে)।
- [ ] GTM **Preview / Tag Assistant**: প্রতিটা tag একবার fire।
- [ ] GA4 **Realtime**: incognito-তে cookie **Accept** করে product খুলুন, cart-এ দিন, event দেখা যাবে।
- [ ] Meta **Events Manager → Test events**: test code দিয়ে দেখুন, প্রতিটা event একবার, Browser + Server হলে "Deduplicated"। পরে test code মুছুন।
- [ ] TikTok **Events Manager → Test events**, একইভাবে।
- [ ] Cookie **Reject** করলে নতুন কোনো event যায় না।
- [ ] Order success page reload করলে `purchase` আবার যায় না।
- [ ] Search Console: HTML tag দিয়ে Verify।

---

## ১২. বাকি / জানা সীমাবদ্ধতা

- Online payment-এ browser `purchase` success page-এ পৌঁছালেই যায়, payment শেষ না হলেও। Server event payment নিশ্চিত হলে তবেই যায়। Gateway চালুর আগে ঠিক করতে হবে।
- `refund`, `view_promotion`, `select_promotion` পাঠানো হয় না। Refund-এর জন্য GA4 Measurement Protocol লাগবে।
- Cart-এ quantity বদলালে event যায় না, শুধু যোগ/বাদ দিলে।
- TikTok আর Snap-এর ঘরের নাম অফিসিয়াল doc পড়ে নিশ্চিত করা যায়নি; তাদের Test events দিয়ে যাচাই করুন।

## সূত্র

- [GA4 ecommerce (gtag)](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce?client_type=gtag)
- [GTM data layer](https://developers.google.com/tag-platform/tag-manager/datalayer)
- [Consent Mode](https://developers.google.com/tag-platform/security/guides/consent)
- [Google tags ও CSP](https://developers.google.com/tag-platform/security/guides/csp)
- [Meta Pixel reference](https://developers.facebook.com/docs/meta-pixel/reference)
- [Meta customer parameters](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters)
- [Meta deduplication](https://developers.facebook.com/docs/marketing-api/conversions-api/deduplicate-pixel-and-server-events)
- [Search Console verification](https://support.google.com/webmasters/answer/9008080?hl=en)
