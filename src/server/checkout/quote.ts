import type {
  CouponType,
  DeliveryArea as DbArea,
  PaymentMethod as DbPayment,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { couponDiscount, variantPrice } from "@/lib/catalog/pricing";
import { siteConfig } from "@/config/site";
import type { Coupon, DeliveryArea, PaymentMethod } from "@/types/catalog";
import { ApiError } from "@/server/http";
import { activeFlashSalePrice } from "@/server/catalog/flash";

export const areaToDb = {
  "inside-dhaka": "INSIDE_DHAKA",
  "outside-dhaka": "OUTSIDE_DHAKA",
} as const satisfies Record<DeliveryArea, DbArea>;

export const paymentToDb = {
  cod: "COD",
  bkash: "BKASH",
  nagad: "NAGAD",
  rocket: "ROCKET",
  card: "CARD",
} as const satisfies Record<PaymentMethod, DbPayment>;

type QuoteLine = {
  slug: string;
  variantId: string;
  qty: number;
};

export type PricedLine = {
  variantId: string;
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type PriceQuote = {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  couponId: string | null;
};

function money(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

export async function quotedDelivery(area: DbArea, merchandise: number): Promise<number> {
  return deliveryAmount(
    area === "INSIDE_DHAKA" ? "inside-dhaka" : "outside-dhaka",
    merchandise,
  );
}

async function deliveryAmount(area: DeliveryArea, merchandise: number): Promise<number> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["delivery.inside", "delivery.outside", "delivery.freeFrom"] } },
  });
  const read = (key: string, fallback: number): number => {
    const row = rows.find((item) => item.key === key);
    return typeof row?.value === "number" ? row.value : fallback;
  };
  const freeFrom = read("delivery.freeFrom", siteConfig.freeShippingThreshold);
  if (merchandise <= 0 || merchandise >= freeFrom) {
    return 0;
  }
  return area === "inside-dhaka"
    ? read("delivery.inside", 70)
    : read("delivery.outside", 130);
}

function asCoupon(row: {
  code: string;
  type: CouponType;
  value: Prisma.Decimal;
  minSubtotal: Prisma.Decimal;
}): Coupon {
  return {
    code: row.code,
    type: row.type === "PERCENT" ? "percent" : "fixed",
    value: row.value.toNumber(),
    minSubtotal: row.minSubtotal.toNumber(),
  };
}

export async function quoteCart(input: {
  lines: QuoteLine[];
  couponCode?: string;
  area: DeliveryArea;
  phone?: string;
}): Promise<PriceQuote> {
  const priced: (PricedLine & { productId: string; categoryIds: string[] })[] = [];
  for (const line of input.lines) {
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: line.variantId,
        status: "ACTIVE",
        product: { slug: line.slug, status: "PUBLISHED" },
      },
      include: {
        product: { include: { categories: true } },
        flashItems: { include: { flashSale: true } },
      },
    });
    if (!variant) {
      throw new ApiError(400, "A cart item is no longer available");
    }
    if (variant.stock < line.qty) {
      throw new ApiError(409, `Only ${variant.stock} left for ${variant.sku}`);
    }
    const flashPrice = activeFlashSalePrice(variant.flashItems);
    const unitPrice = variantPrice({
      id: variant.id,
      sku: variant.sku,
      price: variant.price.toNumber(),
      salePrice: flashPrice ?? money(variant.salePrice),
      stock: variant.stock,
      imageHue: variant.imageHue ?? 0,
      image: null,
      attributes: {},
    });
    priced.push({
      variantId: variant.id,
      name: variant.product.name,
      sku: variant.sku,
      qty: line.qty,
      unitPrice,
      lineTotal: unitPrice * line.qty,
      productId: variant.product.id,
      categoryIds: variant.product.categories.map((row) => row.categoryId),
    });
  }

  const now = new Date();
  for (const line of priced) {
    const flash = await prisma.flashSaleItem.findFirst({
      where: {
        variantId: line.variantId,
        qtyLimit: { not: null },
        flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      },
      include: { flashSale: true },
    });
    if (!flash?.qtyLimit) {
      continue;
    }
    const soldItems = await prisma.orderItem.findMany({
      where: { variantId: line.variantId },
      include: { order: { select: { placedAt: true, status: true } } },
    });
    const sold = soldItems
      .filter(
        (item) =>
          item.order.placedAt >= flash.flashSale.startsAt &&
          item.order.status !== "CANCELLED" &&
          item.order.status !== "FAILED",
      )
      .reduce((sum, item) => sum + item.qty, 0);
    if (sold + line.qty > flash.qtyLimit) {
      throw new ApiError(409, `The flash quantity for ${line.sku} is used up`);
    }
  }

  const subtotal = priced.reduce((sum, line) => sum + line.lineTotal, 0);
  const code = input.couponCode?.trim().toUpperCase() ?? "";
  let discount = 0;
  let freeShipping = false;
  let couponId: string | null = null;
  if (code) {
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    const open =
      coupon &&
      coupon.isActive &&
      (coupon.startsAt === null || coupon.startsAt <= now) &&
      (coupon.endsAt === null || coupon.endsAt >= now) &&
      (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit);
    if (!open || !coupon) {
      throw new ApiError(400, "That coupon cannot be applied");
    }
    if (coupon.perUserLimit && input.phone) {
      const used = await prisma.order.count({
        where: { couponId: coupon.id, phone: input.phone, status: { not: "CANCELLED" } },
      });
      if (used >= coupon.perUserLimit) {
        throw new ApiError(400, "That coupon cannot be applied");
      }
    }
    const matching = priced.filter((line) => {
      if (coupon.productId) {
        return line.productId === coupon.productId;
      }
      if (coupon.categoryId) {
        return line.categoryIds.includes(coupon.categoryId);
      }
      return true;
    });
    const eligible = matching.reduce((sum, line) => sum + line.lineTotal, 0);
    if (eligible < coupon.minSubtotal.toNumber() || matching.length === 0) {
      throw new ApiError(400, "That coupon cannot be applied");
    }
    if (coupon.type === "FREE_SHIPPING") {
      freeShipping = true;
    } else {
      discount = couponDiscount(eligible, asCoupon(coupon));
      if (discount === 0) {
        throw new ApiError(400, "That coupon cannot be applied");
      }
    }
    couponId = coupon.id;
  }
  const merchandise = Math.max(0, subtotal - discount);
  const delivery = freeShipping ? 0 : await deliveryAmount(input.area, merchandise);
  return {
    lines: priced.map((line) => ({
      variantId: line.variantId,
      name: line.name,
      sku: line.sku,
      qty: line.qty,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    })),
    subtotal,
    discount,
    deliveryCharge: delivery,
    total: merchandise + delivery,
    couponId,
  };
}
