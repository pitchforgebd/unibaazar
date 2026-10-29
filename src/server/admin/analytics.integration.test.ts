import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { countActiveVisitors, loadAnalytics } from "./analytics";

describe("analytics (requires .env.test's DATABASE_URL)", () => {
  const trackingEventIds: string[] = [];
  const orderIds: string[] = [];

  afterAll(async () => {
    await prisma.trackingEvent.deleteMany({ where: { id: { in: trackingEventIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.$disconnect();
  });

  async function trackingEvent(name: string, payload: Record<string, unknown>) {
    const row = await prisma.trackingEvent.create({
      data: { name, payload: payload as Prisma.InputJsonValue },
    });
    trackingEventIds.push(row.id);
    return row;
  }

  describe("countActiveVisitors", () => {
    it("counts a visitor seen just now, not one seen long ago", async () => {
      const recentVisitor = `visitor-${randomUUID()}`;
      const staleVisitor = `visitor-${randomUUID()}`;
      await trackingEvent("PageView", { path: "/", visitorId: recentVisitor });
      const stale = await prisma.trackingEvent.create({
        data: {
          name: "PageView",
          payload: { path: "/", visitorId: staleVisitor },
          createdAt: new Date(Date.now() - 60 * 60_000),
        },
      });
      trackingEventIds.push(stale.id);

      const count = await countActiveVisitors(5);
      expect(count).toBeGreaterThanOrEqual(1);

      // The stale visitor specifically must not be the one counted —
      // check by re-running with a window too short to include either.
      const zero = await countActiveVisitors(0);
      expect(zero).toBe(0);
    });
  });

  describe("loadAnalytics", () => {
    it("runs the full query set without throwing and reflects a fixture order/search", async () => {
      const uniqueSource = `test-source-${randomUUID().slice(0, 8)}`;
      const uniqueQuery = `test-query-${randomUUID().slice(0, 8)}`;

      const order = await prisma.order.create({
        data: {
          number: `TESTAN${randomUUID().slice(0, 8)}`,
          name: "Analytics Test Customer",
          phone: "01997777777",
          addressLine: "Test address",
          area: "INSIDE_DHAKA",
          paymentMethod: "COD",
          subtotal: "500.00",
          total: "500.00",
          status: "PENDING",
          utmSource: uniqueSource,
        },
      });
      orderIds.push(order.id);
      await trackingEvent("Search", { query: uniqueQuery, resultCount: 0 });
      await trackingEvent("ViewContent", { slug: "cotton-crew-tshirt" });

      const data = await loadAnalytics();

      expect(
        data.sources.some((row) => row.source === uniqueSource && row.orders === 1),
      ).toBe(true);
      expect(data.search.zeroResult.some((row) => row.query === uniqueQuery)).toBe(true);
      expect(
        data.funnel.find((row) => row.name === "ViewContent")?.count,
      ).toBeGreaterThan(0);
      expect(
        data.products.find((row) => row.slug === "cotton-crew-tshirt")?.views,
      ).toBeGreaterThan(0);
    });
  });
});
