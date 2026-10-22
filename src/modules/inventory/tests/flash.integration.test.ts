import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { incrementFlashSold, releaseFlashSold } from "@/modules/inventory/server/flash";
import { FlashLimitReachedError } from "@/modules/inventory/types";

describe("flash-sale qty-limit guard (requires .env.test's DATABASE_URL)", () => {
  let brandId: string;
  const flashSaleIds: string[] = [];

  beforeAll(async () => {
    const brand = await prisma.brand.create({
      data: { slug: `test-brand-${randomUUID()}`, name: "Test Brand", description: "" },
    });
    brandId = brand.id;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { brandId } });
    await prisma.flashSale.deleteMany({ where: { id: { in: flashSaleIds } } });
    await prisma.brand.delete({ where: { id: brandId } });
    await prisma.$disconnect();
  });

  async function makeFlashItem(qtyLimit: number | null) {
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
        stock: 1000,
      },
    });
    const flashSale = await prisma.flashSale.create({
      data: {
        name: "Test Flash Sale",
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 60_000),
      },
    });
    flashSaleIds.push(flashSale.id);
    const item = await prisma.flashSaleItem.create({
      data: {
        flashSaleId: flashSale.id,
        variantId: variant.id,
        salePrice: "80.00",
        qtyLimit,
      },
    });
    return item;
  }

  it("lets exactly one concurrent sale through at qtyLimit = 1", async () => {
    const item = await makeFlashItem(1);

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        prisma.$transaction((tx) => incrementFlashSold(tx, item.id, 1)),
      ),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled");
    expect(succeeded).toHaveLength(1);

    const after = await prisma.flashSaleItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(after.soldCount).toBe(1);
  });

  it("rejects a sale that would exceed qtyLimit even for a single caller", async () => {
    const item = await makeFlashItem(2);
    await prisma.$transaction((tx) => incrementFlashSold(tx, item.id, 2));

    await expect(
      prisma.$transaction((tx) => incrementFlashSold(tx, item.id, 1)),
    ).rejects.toBeInstanceOf(FlashLimitReachedError);
  });

  it("is a no-op for an unlimited flash item", async () => {
    const item = await makeFlashItem(null);
    await prisma.$transaction((tx) => incrementFlashSold(tx, item.id, 500));
    const after = await prisma.flashSaleItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(after.soldCount).toBe(0);
  });

  it("releaseFlashSold reverses an increment", async () => {
    const item = await makeFlashItem(5);
    await prisma.$transaction((tx) => incrementFlashSold(tx, item.id, 3));
    await prisma.$transaction((tx) => releaseFlashSold(tx, item.id, 3));
    const after = await prisma.flashSaleItem.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(after.soldCount).toBe(0);
  });
});
