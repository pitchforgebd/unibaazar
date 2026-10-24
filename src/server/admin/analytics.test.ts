import { describe, expect, it } from "vitest";
import {
  aggregateFunnel,
  aggregateProductPerformance,
  aggregateSearchTerms,
  aggregateSources,
  aggregateTraffic,
  payloadNumber,
  payloadString,
} from "./analytics";

describe("payloadString / payloadNumber", () => {
  it("reads a matching string/number field", () => {
    expect(payloadString({ slug: "tee" }, "slug")).toBe("tee");
    expect(payloadNumber({ resultCount: 0 }, "resultCount")).toBe(0);
  });

  it("returns null for a missing, wrong-typed, or empty-string field", () => {
    expect(payloadString({ slug: "tee" }, "other")).toBeNull();
    expect(payloadString({ slug: 5 }, "slug")).toBeNull();
    expect(payloadString({ slug: "" }, "slug")).toBeNull();
    expect(payloadNumber({ resultCount: "0" }, "resultCount")).toBeNull();
  });

  it("returns null for a non-object payload instead of throwing", () => {
    expect(payloadString(null, "slug")).toBeNull();
    expect(payloadString("a string", "slug")).toBeNull();
    expect(payloadString(["array"], "slug")).toBeNull();
  });
});

describe("aggregateTraffic", () => {
  const windowStart = new Date("2026-10-01T00:00:00+06:00");
  const now = new Date("2026-10-03T12:00:00+06:00");

  it("buckets page views per Dhaka-local day and fills days with zero", () => {
    const { daily } = aggregateTraffic(
      [
        { createdAt: new Date("2026-10-01T10:00:00+06:00"), path: "/" },
        { createdAt: new Date("2026-10-01T18:00:00+06:00"), path: "/shop" },
        { createdAt: new Date("2026-10-02T09:00:00+06:00"), path: "/" },
      ],
      windowStart,
      now,
    );
    expect(daily).toHaveLength(3);
    expect(daily[0]?.count).toBe(2);
    expect(daily[1]?.count).toBe(1);
    expect(daily[2]?.count).toBe(0);
  });

  it("ranks the top paths by hit count, capped at 10", () => {
    const { topPaths } = aggregateTraffic(
      [
        { createdAt: now, path: "/shop" },
        { createdAt: now, path: "/" },
        { createdAt: now, path: "/shop" },
      ],
      windowStart,
      now,
    );
    expect(topPaths[0]).toEqual({ path: "/shop", count: 2 });
  });

  it("ignores a page view with no path recorded", () => {
    const { topPaths } = aggregateTraffic(
      [{ createdAt: now, path: null }],
      windowStart,
      now,
    );
    expect(topPaths).toHaveLength(0);
  });
});

describe("aggregateSources", () => {
  it("groups order count and revenue by UTM source", () => {
    const rows = aggregateSources([
      { utmSource: "facebook", total: 500 },
      { utmSource: "facebook", total: 300 },
      { utmSource: "google", total: 900 },
    ]);
    expect(rows).toEqual([
      { source: "google", orders: 1, revenue: 900 },
      { source: "facebook", orders: 2, revenue: 800 },
    ]);
  });

  it("buckets an order with no UTM as direct", () => {
    const rows = aggregateSources([{ utmSource: null, total: 100 }]);
    expect(rows).toEqual([{ source: "(direct / no UTM)", orders: 1, revenue: 100 }]);
  });
});

describe("aggregateFunnel", () => {
  it("counts each known stage and ignores unrelated event names", () => {
    const rows = aggregateFunnel([
      { name: "ViewContent" },
      { name: "ViewContent" },
      { name: "AddToCart" },
      { name: "Purchase" },
      { name: "Lead" },
    ]);
    expect(rows).toEqual([
      { name: "ViewContent", count: 2 },
      { name: "AddToCart", count: 1 },
      { name: "InitiateCheckout", count: 0 },
      { name: "Purchase", count: 1 },
    ]);
  });
});

describe("aggregateProductPerformance", () => {
  const variantIndex = new Map([
    ["tee-s-black", { slug: "cotton-crew-tshirt", name: "Cotton Crew T-Shirt" }],
    ["tee-m-black", { slug: "cotton-crew-tshirt", name: "Cotton Crew T-Shirt" }],
  ]);

  it("joins views, carts, and purchases onto the same product by slug", () => {
    const rows = aggregateProductPerformance(
      [{ slug: "cotton-crew-tshirt" }, { slug: "cotton-crew-tshirt" }],
      [{ slug: "cotton-crew-tshirt" }],
      [
        { sku: "tee-s-black", qty: 1, lineTotal: 690 },
        { sku: "tee-m-black", qty: 2, lineTotal: 1380 },
      ],
      variantIndex,
    );
    expect(rows).toEqual([
      {
        slug: "cotton-crew-tshirt",
        name: "Cotton Crew T-Shirt",
        views: 2,
        addsToCart: 1,
        purchases: 3,
        revenue: 2070,
      },
    ]);
  });

  it("ignores a purchased sku with no matching variant instead of throwing", () => {
    const rows = aggregateProductPerformance(
      [],
      [],
      [{ sku: "unknown-sku", qty: 1, lineTotal: 100 }],
      variantIndex,
    );
    expect(rows).toHaveLength(0);
  });
});

describe("aggregateSearchTerms", () => {
  it("counts total searches per query and separately flags zero-result ones", () => {
    const { top, zeroResult } = aggregateSearchTerms([
      { query: "shoes", resultCount: 4 },
      { query: "shoes", resultCount: 4 },
      { query: "xyz123", resultCount: 0 },
    ]);
    expect(top).toEqual([
      { query: "shoes", count: 2 },
      { query: "xyz123", count: 1 },
    ]);
    expect(zeroResult).toEqual([{ query: "xyz123", count: 1 }]);
  });

  it("treats query text case-insensitively", () => {
    const { top } = aggregateSearchTerms([
      { query: "Saree", resultCount: 2 },
      { query: "saree", resultCount: 2 },
    ]);
    expect(top).toEqual([{ query: "saree", count: 2 }]);
  });

  it("skips a blank query", () => {
    const { top } = aggregateSearchTerms([{ query: "   ", resultCount: 0 }]);
    expect(top).toHaveLength(0);
  });
});
