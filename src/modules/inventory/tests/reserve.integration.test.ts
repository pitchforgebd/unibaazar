import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  commitStock,
  reserveStock,
  releaseReservation,
} from "@/modules/inventory/server/reserve";
import { StockUnavailableError } from "@/modules/inventory/types";

describe("inventory reservations (requires .env.test's DATABASE_URL)", () => {
  let brandId: string;

  beforeAll(async () => {
    const brand = await prisma.brand.create({
      data: { slug: `test-brand-${randomUUID()}`, name: "Test Brand", description: "" },
    });
    brandId = brand.id;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { brandId } });
    await prisma.brand.delete({ where: { id: brandId } });
    await prisma.$disconnect();
  });

  async function makeVariant(stock: number) {
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
    return variant;
  }

  it("reserveStock lets exactly one concurrent reservation win the last unit", async () => {
    const variant = await makeVariant(1);
    const attempts = Array.from({ length: 8 }, () => randomUUID());

    const results = await Promise.allSettled(
      attempts.map((token) =>
        reserveStock(prisma, token, [{ variantId: variant.id, qty: 1 }]),
      ),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected");
    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(7);
    failed.forEach((r) => {
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(StockUnavailableError);
    });

    const after = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(after.stock).toBe(0);

    const activeReservations = await prisma.stockReservation.count({
      where: { variantId: variant.id, status: "ACTIVE" },
    });
    expect(activeReservations).toBe(1);
  });

  it("releaseReservation credits the held stock back", async () => {
    const variant = await makeVariant(1);
    const token = randomUUID();
    await reserveStock(prisma, token, [{ variantId: variant.id, qty: 1 }]);
    let after = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(after.stock).toBe(0);

    await releaseReservation(prisma, token);
    after = await prisma.productVariant.findUniqueOrThrow({ where: { id: variant.id } });
    expect(after.stock).toBe(1);
  });

  it("commitStock consumes a matching reservation without double-decrementing", async () => {
    const variant = await makeVariant(1);
    const token = randomUUID();
    await reserveStock(prisma, token, [{ variantId: variant.id, qty: 1 }]);

    await prisma.$transaction((tx) =>
      commitStock(tx, token, [{ variantId: variant.id, qty: 1 }]),
    );

    const after = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(after.stock).toBe(0);
    const reservation = await prisma.stockReservation.findUniqueOrThrow({
      where: { token_variantId: { token, variantId: variant.id } },
    });
    expect(reservation.status).toBe("CONSUMED");
  });

  it("commitStock without a prior reservation decrements fresh and atomically under concurrency", async () => {
    const variant = await makeVariant(1);

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        prisma.$transaction((tx) =>
          commitStock(tx, null, [{ variantId: variant.id, qty: 1 }]),
        ),
      ),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled");
    expect(succeeded).toHaveLength(1);

    const after = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(after.stock).toBe(0);
  });

  it("reconciles an expired reservation back into stock on the next attempt", async () => {
    const variant = await makeVariant(1);
    const token = randomUUID();
    await reserveStock(prisma, token, [{ variantId: variant.id, qty: 1 }], -1);

    const other = randomUUID();
    await reserveStock(prisma, other, [{ variantId: variant.id, qty: 1 }]);

    const after = await prisma.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(after.stock).toBe(0);
    const original = await prisma.stockReservation.findUniqueOrThrow({
      where: { token_variantId: { token, variantId: variant.id } },
    });
    expect(original.status).toBe("EXPIRED");
  });
});
