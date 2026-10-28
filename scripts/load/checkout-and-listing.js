// k6 load test for the two paths the master plan names for Phase 12:
// the product listing and the checkout pricing path.
//
//   k6 run -e BASE_URL=http://127.0.0.1:3100 scripts/load/checkout-and-listing.js
//
// Concurrency is deliberately modest. The production host is cPanel +
// CloudLinux with roughly a 5-OS-thread ceiling (ARCHITECTURE.md §12) —
// the point of this test is "does the real host hold up under realistic
// Bangladesh-market traffic for a store this size", not "how many
// requests per second can Node theoretically serve". Pushing hundreds of
// VUs at this host would only measure the hosting plan's limiter, and on
// a live site risks taking the storefront down for real customers.
//
// It never places an order: /api/v1/cart/quote exercises the same
// server-side pricing, stock and coupon logic a real checkout does
// (src/server/checkout/quote.ts) without writing rows, tripping the
// per-IP fraud guard (src/server/security/fraud.ts), or decrementing
// real stock.

import http from "k6/http";
import { check, group, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:3100";
const PRODUCT_SLUG = __ENV.PRODUCT_SLUG || "cotton-crew-tshirt";
const VARIANT_ID = __ENV.VARIANT_ID || "tee-s-black";

export const options = {
  scenarios: {
    browsing: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 8 },
        { duration: "1m", target: 8 },
        { duration: "30s", target: 15 },
        { duration: "1m", target: 15 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "15s",
    },
  },
  thresholds: {
    // Mirrors §5.7's performance budgets, as server-side latency rather
    // than browser metrics: a listing page that takes >2.5s to respond
    // can't hit an LCP under 2.5s no matter how fast the client is.
    http_req_failed: ["rate<0.01"],
    "http_req_duration{route:listing}": ["p(95)<2500"],
    "http_req_duration{route:product}": ["p(95)<2500"],
    "http_req_duration{route:quote}": ["p(95)<1500"],
  },
};

export default function run() {
  group("listing", () => {
    const res = http.get(`${BASE_URL}/shop`, { tags: { route: "listing" } });
    check(res, { "listing 200": (r) => r.status === 200 });
  });

  group("listing filtered", () => {
    const res = http.get(`${BASE_URL}/shop?sort=price-asc&page=2`, {
      tags: { route: "listing" },
    });
    check(res, { "filtered listing 200": (r) => r.status === 200 });
  });

  group("product", () => {
    const res = http.get(`${BASE_URL}/product/${PRODUCT_SLUG}`, {
      tags: { route: "product" },
    });
    check(res, { "product 200": (r) => r.status === 200 });
  });

  group("checkout quote", () => {
    const res = http.post(
      `${BASE_URL}/api/v1/cart/quote`,
      JSON.stringify({
        lines: [{ slug: PRODUCT_SLUG, variantId: VARIANT_ID, qty: 1 }],
        area: "inside-dhaka",
      }),
      {
        headers: { "content-type": "application/json" },
        tags: { route: "quote" },
      },
    );
    check(res, {
      "quote 200": (r) => r.status === 200,
      "quote returns a total": (r) => {
        try {
          return typeof r.json("data.total") === "number";
        } catch {
          return false;
        }
      },
    });
  });

  // Think time — a real shopper doesn't fire four requests back to back.
  sleep(Math.random() * 3 + 1);
}
