import { prisma } from "@/lib/db";

const WINDOW_DAYS = 30;

function startOfDhakaDay(now: Date): Date {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${key}T00:00:00+06:00`);
}

function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayLabel(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(Date.UTC(year ?? 2026, (month ?? 1) - 1, day ?? 1, 6)));
}

export function payloadString(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value ? value : null;
}

export function payloadNumber(payload: unknown, key: string): number | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

// --- Traffic -----------------------------------------------------------

export type DailyCount = { label: string; count: number };
export type PathCount = { path: string; count: number };

/** Pure bucketing, same split dashboard.ts's bucketStatusFunnel() uses —
 * given every PageView in the window, buckets by Dhaka-local day and
 * tallies the top paths. */
export function aggregateTraffic(
  pageViews: { createdAt: Date; path: string | null }[],
  windowStart: Date,
  now: Date,
): { daily: DailyCount[]; topPaths: PathCount[] } {
  const days = Math.max(
    1,
    Math.round((now.getTime() - windowStart.getTime()) / 86_400_000),
  );
  const keys = Array.from({ length: days }, (_, index) =>
    dayKey(new Date(windowStart.getTime() + index * 86_400_000)),
  );
  const daily = new Map(keys.map((key) => [key, 0]));
  const paths = new Map<string, number>();
  for (const view of pageViews) {
    const key = dayKey(view.createdAt);
    if (daily.has(key)) {
      daily.set(key, (daily.get(key) ?? 0) + 1);
    }
    if (view.path) {
      paths.set(view.path, (paths.get(view.path) ?? 0) + 1);
    }
  }
  return {
    daily: keys.map((key) => ({ label: dayLabel(key), count: daily.get(key) ?? 0 })),
    topPaths: Array.from(paths.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 10),
  };
}

// --- Sources / UTM -------------------------------------------------------

export type SourceRow = { source: string; orders: number; revenue: number };

/** Revenue attribution by last-touch UTM source, read from Order's own
 * columns — the attributable version of "traffic sources," distinct
 * from (and more reliable than) counting raw PageView events, since
 * every order carries the UTM set that was active when it was placed. */
export function aggregateSources(
  orders: { utmSource: string | null; total: number }[],
): SourceRow[] {
  const bySource = new Map<string, { orders: number; revenue: number }>();
  for (const order of orders) {
    const key = order.utmSource || "(direct / no UTM)";
    const row = bySource.get(key) ?? { orders: 0, revenue: 0 };
    row.orders += 1;
    row.revenue += order.total;
    bySource.set(key, row);
  }
  return Array.from(bySource.entries())
    .map(([source, row]) => ({ source, ...row }))
    .sort((left, right) => right.revenue - left.revenue);
}

// --- Conversion funnel -----------------------------------------------------

export type FunnelStage = { name: string; count: number };

const funnelSteps = ["ViewContent", "AddToCart", "InitiateCheckout", "Purchase"] as const;

/** Counts, not a per-visitor conversion path — each stage counts
 * however many events of that name fired in the window, which is what
 * the master plan's "done when the funnel numbers reconcile with the
 * orders table" actually asks to verify (Purchase here should match
 * orders placed in the same window, give or take COD-vs-gateway timing
 * from Phase 9's fix). */
export function aggregateFunnel(events: { name: string }[]): FunnelStage[] {
  const counts = new Map<string, number>(funnelSteps.map((name) => [name, 0]));
  for (const event of events) {
    if (counts.has(event.name)) {
      counts.set(event.name, (counts.get(event.name) ?? 0) + 1);
    }
  }
  return funnelSteps.map((name) => ({ name, count: counts.get(name) ?? 0 }));
}

// --- Product performance ---------------------------------------------------

export type ProductPerformanceRow = {
  slug: string;
  name: string;
  views: number;
  addsToCart: number;
  purchases: number;
  revenue: number;
};

/** Joins three independent signals on product slug: ViewContent/
 * AddToCart events (both already carry `slug` in their payload) and
 * purchased OrderItems (carry `sku`, resolved to a slug/name via
 * `variantIndex` — a product has many variants, so this is a many-to-
 * one fold, not a 1:1 join). */
export function aggregateProductPerformance(
  views: { slug: string }[],
  carts: { slug: string }[],
  purchasedItems: { sku: string; qty: number; lineTotal: number }[],
  variantIndex: Map<string, { slug: string; name: string }>,
): ProductPerformanceRow[] {
  const rows = new Map<string, ProductPerformanceRow>();
  function ensure(slug: string, name: string): ProductPerformanceRow {
    const existing = rows.get(slug);
    if (existing) {
      return existing;
    }
    const created: ProductPerformanceRow = {
      slug,
      name,
      views: 0,
      addsToCart: 0,
      purchases: 0,
      revenue: 0,
    };
    rows.set(slug, created);
    return created;
  }
  for (const view of views) {
    ensure(view.slug, view.slug).views += 1;
  }
  for (const cart of carts) {
    ensure(cart.slug, cart.slug).addsToCart += 1;
  }
  for (const item of purchasedItems) {
    const product = variantIndex.get(item.sku);
    if (!product) {
      continue;
    }
    const row = ensure(product.slug, product.name);
    row.name = product.name;
    row.purchases += item.qty;
    row.revenue += item.lineTotal;
  }
  return Array.from(rows.values()).sort((left, right) => right.views - left.views);
}

// --- Search terms ------------------------------------------------------

export type SearchTermRow = { query: string; count: number };

export function aggregateSearchTerms(
  searches: { query: string; resultCount: number | null }[],
): { top: SearchTermRow[]; zeroResult: SearchTermRow[] } {
  const totals = new Map<string, number>();
  const zero = new Map<string, number>();
  for (const search of searches) {
    const key = search.query.trim().toLowerCase();
    if (!key) {
      continue;
    }
    totals.set(key, (totals.get(key) ?? 0) + 1);
    if (search.resultCount === 0) {
      zero.set(key, (zero.get(key) ?? 0) + 1);
    }
  }
  const toRows = (map: Map<string, number>): SearchTermRow[] =>
    Array.from(map.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 15);
  return { top: toRows(totals), zeroResult: toRows(zero) };
}

// --- DB wrapper ----------------------------------------------------------

export type AnalyticsData = {
  windowDays: number;
  traffic: { daily: DailyCount[]; topPaths: PathCount[] };
  sources: SourceRow[];
  funnel: FunnelStage[];
  products: ProductPerformanceRow[];
  search: { top: SearchTermRow[]; zeroResult: SearchTermRow[] };
};

export async function loadAnalytics(now: Date = new Date()): Promise<AnalyticsData> {
  const windowStart = new Date(
    startOfDhakaDay(now).getTime() - (WINDOW_DAYS - 1) * 86_400_000,
  );

  const [events, orders, purchasedItems, variants] = await Promise.all([
    prisma.trackingEvent.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { name: true, payload: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { placedAt: { gte: windowStart }, status: { not: "CANCELLED" } },
      select: { utmSource: true, total: true },
    }),
    prisma.orderItem.findMany({
      where: { order: { placedAt: { gte: windowStart }, status: { not: "CANCELLED" } } },
      select: { sku: true, qty: true, lineTotal: true },
    }),
    prisma.productVariant.findMany({
      select: { sku: true, product: { select: { slug: true, name: true } } },
    }),
  ]);

  const pageViews = events
    .filter((event) => event.name === "PageView")
    .map((event) => ({
      createdAt: event.createdAt,
      path: payloadString(event.payload, "path"),
    }));
  const views = events
    .filter((event) => event.name === "ViewContent")
    .flatMap((event) => {
      const slug = payloadString(event.payload, "slug");
      return slug ? [{ slug }] : [];
    });
  const carts = events
    .filter((event) => event.name === "AddToCart")
    .flatMap((event) => {
      const slug = payloadString(event.payload, "slug");
      return slug ? [{ slug }] : [];
    });
  const searches = events
    .filter((event) => event.name === "Search")
    .flatMap((event) => {
      const query = payloadString(event.payload, "query");
      return query
        ? [{ query, resultCount: payloadNumber(event.payload, "resultCount") }]
        : [];
    });

  const variantIndex = new Map(
    variants.map((variant) => [
      variant.sku,
      { slug: variant.product.slug, name: variant.product.name },
    ]),
  );

  return {
    windowDays: WINDOW_DAYS,
    traffic: aggregateTraffic(pageViews, windowStart, now),
    sources: aggregateSources(
      orders.map((order) => ({ ...order, total: order.total.toNumber() })),
    ),
    funnel: aggregateFunnel(events),
    products: aggregateProductPerformance(
      views,
      carts,
      purchasedItems.map((item) => ({ ...item, lineTotal: item.lineTotal.toNumber() })),
      variantIndex,
    ),
    search: aggregateSearchTerms(searches),
  };
}

export async function countActiveVisitors(
  minutes = 5,
  now: Date = new Date(),
): Promise<number> {
  const since = new Date(now.getTime() - minutes * 60_000);
  const rows = await prisma.trackingEvent.findMany({
    where: { name: "PageView", createdAt: { gte: since } },
    select: { payload: true },
  });
  const visitors = new Set<string>();
  for (const row of rows) {
    const id = payloadString(row.payload, "visitorId");
    if (id) {
      visitors.add(id);
    }
  }
  return visitors.size;
}
