import type { DeliveryArea as DbArea, PaymentMethod as DbPayment } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { DeliveryArea, PaymentMethod } from "@/types/catalog";
import { ApiError } from "@/server/http";
import { activeFlashSalePrice } from "@/server/catalog/flash";
import {
  releaseReservation,
  reserveStock,
  StockUnavailableError,
} from "@/modules/inventory";
import {
  computeQuote,
  deliveryCharge,
  fromDecimalTaka,
  fromTakaNumber,
  parseDeliverySettings,
  toTakaNumber,
  type CouponInput,
  type DeliverySettings,
  type QuoteLineInput,
} from "@/modules/pricing";

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
  /** Set when this line's price came from an active, qty-limited flash
   * membership — placeOrder() needs this to enforce the limit atomically. */
  flashSaleItemId: string | null;
};

export type PriceQuote = {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  couponId: string | null;
  /** The reservation token this quote held stock under, if any — pass the
   * same value to placeOrder so it can consume (not re-decrement) it. */
  reservationToken: string | null;
};

async function loadDeliverySettings(): Promise<DeliverySettings> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["delivery.inside", "delivery.outside", "delivery.freeFrom"] } },
  });
  const raw = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return parseDeliverySettings(raw);
}

/** Kept for src/server/admin/orders-admin.ts's manual-order flow, which
 * needs a delivery estimate without a full cart quote. */
export async function quotedDelivery(area: DbArea, merchandise: number): Promise<number> {
  const settings = await loadDeliverySettings();
  const area2 = area === "INSIDE_DHAKA" ? "inside-dhaka" : "outside-dhaka";
  return toTakaNumber(deliveryCharge(area2, fromTakaNumber(merchandise), settings));
}

export async function quoteCart(input: {
  lines: QuoteLine[];
  couponCode?: string;
  area: DeliveryArea;
  phone?: string;
  /** Opaque per-cart id the client mints and reuses across quote/place-order
   * calls, so stock can be held between the two — see src/store/cart.ts.
   * Optional: omitted, this degrades to a read-only availability check
   * with no hold, exactly like before Phase 3. */
  reservationToken?: string;
}): Promise<PriceQuote> {
  const variantRows = await Promise.all(
    input.lines.map((line) =>
      prisma.productVariant.findFirst({
        where: {
          id: line.variantId,
          status: "ACTIVE",
          product: { slug: line.slug, status: "PUBLISHED" },
        },
        include: {
          product: { include: { categories: true } },
          flashItems: { include: { flashSale: true } },
        },
      }),
    ),
  );

  const now = new Date();
  const lineInputs: QuoteLineInput[] = [];
  for (let i = 0; i < input.lines.length; i += 1) {
    const variant = variantRows[i];
    const line = input.lines[i]!;
    if (!variant) {
      throw new ApiError(400, "A cart item is no longer available");
    }
    const activeFlashItem = variant.flashItems.find(
      (item) =>
        item.flashSale.isActive &&
        item.flashSale.startsAt <= now &&
        item.flashSale.endsAt >= now,
    );
    const flashPrice = activeFlashSalePrice(variant.flashItems, now);
    lineInputs.push({
      variantId: variant.id,
      sku: variant.sku,
      name: variant.product.name,
      qty: line.qty,
      unitPrice: fromDecimalTaka(variant.salePrice ?? variant.price),
      flashPrice: flashPrice !== null ? fromTakaNumber(flashPrice) : null,
      flashSaleItemId: activeFlashItem?.id ?? null,
      productId: variant.product.id,
      categoryIds: variant.product.categories.map((row) => row.categoryId),
    });
  }

  // Availability: hold stock atomically if the client gave us a token
  // (closes the quote->place-order oversell window — see
  // src/modules/inventory); otherwise fall back to the pre-Phase-3
  // read-only check so older/stateless callers still work.
  if (input.reservationToken) {
    try {
      await reserveStock(
        prisma,
        input.reservationToken,
        lineInputs.map((line) => ({ variantId: line.variantId, qty: line.qty })),
      );
    } catch (error) {
      if (error instanceof StockUnavailableError) {
        const first = error.failures[0];
        throw new ApiError(
          409,
          `Only ${first?.available ?? 0} left for ${first?.sku ?? "an item"}`,
        );
      }
      throw error;
    }
  } else {
    for (let i = 0; i < variantRows.length; i += 1) {
      const variant = variantRows[i]!;
      const line = input.lines[i]!;
      if (variant.stock < line.qty) {
        throw new ApiError(409, `Only ${variant.stock} left for ${variant.sku}`);
      }
    }
  }

  // Informational only at quote time — the atomic, order-placement-time
  // guard is src/modules/inventory's incrementFlashSold(). This just gives
  // a nicer error before the customer fills out the whole checkout form.
  for (const line of lineInputs) {
    if (!line.flashSaleItemId) {
      continue;
    }
    const flash = await prisma.flashSaleItem.findUnique({
      where: { id: line.flashSaleItemId },
    });
    if (!flash?.qtyLimit) {
      continue;
    }
    if (flash.soldCount + line.qty > flash.qtyLimit) {
      if (input.reservationToken) {
        await releaseReservation(prisma, input.reservationToken).catch(() => undefined);
      }
      throw new ApiError(409, `The flash quantity for ${line.sku} is used up`);
    }
  }

  let coupon: CouponInput | null = null;
  const code = input.couponCode?.trim().toUpperCase() ?? "";
  let couponAlreadyUsedByCustomer = 0;
  if (code) {
    const row = await prisma.coupon.findUnique({ where: { code } });
    if (!row) {
      if (input.reservationToken) {
        await releaseReservation(prisma, input.reservationToken).catch(() => undefined);
      }
      throw new ApiError(400, "That coupon cannot be applied");
    }
    if (row.perUserLimit && input.phone) {
      couponAlreadyUsedByCustomer = await prisma.order.count({
        where: { couponId: row.id, phone: input.phone, status: { not: "CANCELLED" } },
      });
    }
    coupon = {
      id: row.id,
      code: row.code,
      type: row.type,
      value: row.type === "PERCENT" ? row.value.toNumber() : fromDecimalTaka(row.value),
      minSubtotal: fromDecimalTaka(row.minSubtotal),
      productId: row.productId,
      categoryId: row.categoryId,
      isActive: row.isActive,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      usageLimit: row.usageLimit,
      usedCount: row.usedCount,
      perUserLimit: row.perUserLimit,
    };
  }

  const deliverySettings = await loadDeliverySettings();

  let quote;
  try {
    quote = computeQuote({
      lines: lineInputs,
      area: input.area,
      coupon,
      couponAlreadyUsedByCustomer,
      deliverySettings,
    });
  } catch {
    // computeQuote only ever throws CouponRejectedError (it's a pure
    // function — no DB access of its own), so this is always "the coupon
    // can't be applied" — but the stock hold it already took must still
    // be released since the quote as a whole failed.
    if (input.reservationToken) {
      await releaseReservation(prisma, input.reservationToken).catch(() => undefined);
    }
    throw new ApiError(400, "That coupon cannot be applied");
  }

  return {
    lines: quote.lines.map((line) => ({
      variantId: line.variantId,
      name: line.name,
      sku: line.sku,
      qty: line.qty,
      unitPrice: toTakaNumber(line.unitPrice),
      lineTotal: toTakaNumber(line.lineTotal),
      flashSaleItemId: line.flashSaleItemId,
    })),
    subtotal: toTakaNumber(quote.subtotal),
    discount: toTakaNumber(quote.discount),
    deliveryCharge: toTakaNumber(quote.deliveryCharge),
    total: toTakaNumber(quote.total),
    couponId: quote.couponId,
    reservationToken: input.reservationToken ?? null,
  };
}
