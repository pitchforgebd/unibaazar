import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { transitionOrder } from "@/modules/orders/server/transition";
import { IllegalTransitionError } from "@/modules/orders/state-machine";

describe("transitionOrder (requires .env.test's DATABASE_URL)", () => {
  let brandId: string;

  beforeAll(async () => {
    const brand = await prisma.brand.create({
      data: { slug: `test-brand-${randomUUID()}`, name: "Test Brand", description: "" },
    });
    brandId = brand.id;
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { phone: "01999999999" } });
    await prisma.product.deleteMany({ where: { brandId } });
    await prisma.brand.delete({ where: { id: brandId } });
    await prisma.$disconnect();
  });

  async function makeOrder(stock: number, qty: number) {
    const product = await prisma.product.create({
      data: {
        brandId,
        type: "SIMPLE",
        status: "PUBLISHED",
        slug: `test-product-${randomUUID()}`,
        name: "Test Product",
        shortDescription: "",
        description: "",
        warranty: "",
        returns: "",
        basePrice: "100.00",
      },
    });
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `TEST-${randomUUID()}`,
        price: "100.00",
        stock,
      },
    });
    const order = await prisma.order.create({
      data: {
        number: `TEST${randomUUID().slice(0, 8)}`,
        name: "Test Customer",
        phone: "01999999999",
        addressLine: "Test address",
        area: "INSIDE_DHAKA",
        paymentMethod: "COD",
        subtotal: "100.00",
        total: "100.00",
        status: "PENDING",
        items: {
          create: [
            {
              variantId: variant.id,
              name: "Test Product",
              sku: variant.sku,
              qty,
              unitPrice: "100.00",
              lineTotal: "100.00",
            },
          ],
        },
      },
      include: { items: true },
    });
    return { order, variant };
  }

  it("rejects an illegal transition and leaves stock/status/history untouched", async () => {
    const { order, variant } = await makeOrder(10, 1);
    await expect(
      prisma.$transaction((tx) => transitionOrder(tx, order, "DELIVERED", "skip ahead")),
    ).rejects.toBeInstanceOf(IllegalTransitionError);

    const unchanged = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(unchanged.status).toBe("PENDING");
    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: order.id },
    });
    expect(history).toHaveLength(0);
    const variantAfter = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(variantAfter.stock).toBe(10);
  });

  it("releases stock when moving into a released status, and writes history", async () => {
    const { order, variant } = await makeOrder(10, 3);
    await prisma.$transaction((tx) => transitionOrder(tx, order, "CONFIRMED", "ok"));
    const confirmed = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });

    await prisma.$transaction((tx) =>
      transitionOrder(tx, confirmed, "CANCELLED", "customer cancelled"),
    );

    const variantAfter = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(variantAfter.stock).toBe(13); // 10 - 0 (CONFIRMED still holds) + 3 released on cancel
    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" },
    });
    expect(history.map((h) => h.status)).toEqual(["CONFIRMED", "CANCELLED"]);
  });

  it("a cancelled order is final — every further transition is rejected", async () => {
    const { order, variant } = await makeOrder(2, 2);
    await prisma.$transaction((tx) => transitionOrder(tx, order, "CANCELLED", "oops"));
    const cancelled = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });
    const afterCancel = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(afterCancel.stock).toBe(4); // released back

    await expect(
      prisma.$transaction((tx) =>
        transitionOrder(tx, cancelled, "CONFIRMED", "re-raise"),
      ),
    ).rejects.toBeInstanceOf(IllegalTransitionError);
    await expect(
      prisma.$transaction((tx) => transitionOrder(tx, cancelled, "ON_HOLD", "re-raise")),
    ).rejects.toBeInstanceOf(IllegalTransitionError);
  });
});
