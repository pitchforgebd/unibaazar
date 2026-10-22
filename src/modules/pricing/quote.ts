import {
  add,
  clampMin0,
  multiplyByQty,
  subtract,
  ZERO,
  type Poisha,
} from "@/modules/pricing/money";
import { deliveryCharge } from "@/modules/pricing/delivery";
import { applyCoupon } from "@/modules/pricing/promotions";
import type { Quote, QuoteInput, QuoteLine } from "@/modules/pricing/types";

/**
 * The single place a cart/order total is computed — storefront display,
 * the cart quote endpoint, and order creation all call this (via
 * `src/modules/pricing/server/quoteCart.ts`), so none of them can
 * disagree. Pure: no DB access, so every invariant below is
 * property-tested directly (see tests/quote.test.ts) rather than only
 * through an integration test.
 *
 * Invariants this function guarantees:
 * - the total is never negative
 * - the sum of line totals equals the subtotal
 * - a discount never exceeds the subtotal it was computed from
 */
export function computeQuote(input: QuoteInput): Quote {
  const lines: QuoteLine[] = input.lines.map((line) => {
    const unitPrice = line.flashPrice ?? line.unitPrice;
    return {
      variantId: line.variantId,
      sku: line.sku,
      name: line.name,
      qty: line.qty,
      unitPrice,
      lineTotal: multiplyByQty(unitPrice, line.qty),
      flashSaleItemId: line.flashPrice !== null ? line.flashSaleItemId : null,
    };
  });

  const subtotal = add(...lines.map((line) => line.lineTotal));

  let discount: Poisha = ZERO;
  let discounts: Quote["discounts"] = [];
  let freeShipping = false;
  let couponId: string | null = null;
  if (input.coupon) {
    const result = applyCoupon(
      input.coupon,
      input.lines.map((line, index) => ({
        productId: line.productId,
        categoryIds: line.categoryIds,
        lineTotal: lines[index]!.lineTotal,
      })),
      input.couponAlreadyUsedByCustomer,
    );
    discount = result.discount;
    discounts = result.discounts;
    freeShipping = result.freeShipping;
    couponId = input.coupon.id;
  }

  const merchandise = clampMin0(subtract(subtotal, discount));
  const delivery = freeShipping
    ? ZERO
    : deliveryCharge(input.area, merchandise, input.deliverySettings);
  const codCharge = ZERO; // modeled, not wired — see ADR 0012's addendum
  const vat = ZERO; // modeled, not wired — see ADR 0012's addendum
  const total = add(merchandise, delivery, codCharge, vat);

  return {
    lines,
    subtotal,
    discounts,
    discount,
    deliveryCharge: delivery,
    codCharge,
    vat,
    total,
    couponId,
  };
}
