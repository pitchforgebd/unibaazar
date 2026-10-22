import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { computeQuote } from "@/modules/pricing/quote";
import { CouponRejectedError } from "@/modules/pricing/promotions";
import { poisha, ZERO } from "@/modules/pricing/money";
import { DEFAULT_DELIVERY_SETTINGS } from "@/modules/pricing/delivery";
import type { CouponInput, QuoteLineInput } from "@/modules/pricing/types";

const lineArb: fc.Arbitrary<QuoteLineInput> = fc.record({
  variantId: fc.uuid(),
  sku: fc.string({ minLength: 1, maxLength: 10 }),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  qty: fc.integer({ min: 1, max: 20 }),
  unitPrice: fc.integer({ min: 0, max: 1_000_00 }).map((v) => poisha(v)),
  flashPrice: fc.constant(null),
  flashSaleItemId: fc.constant(null),
  productId: fc.uuid(),
  categoryIds: fc.constant([]),
});

const baseInput = (lines: QuoteLineInput[]) => ({
  lines,
  area: "inside-dhaka" as const,
  coupon: null,
  couponAlreadyUsedByCustomer: 0,
  deliverySettings: DEFAULT_DELIVERY_SETTINGS,
});

describe("computeQuote (no coupon)", () => {
  it("the total is never negative", () => {
    fc.assert(
      fc.property(fc.array(lineArb, { minLength: 0, maxLength: 10 }), (lines) => {
        const quote = computeQuote(baseInput(lines));
        expect(quote.total).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it("the sum of line totals equals the subtotal", () => {
    fc.assert(
      fc.property(fc.array(lineArb, { minLength: 0, maxLength: 10 }), (lines) => {
        const quote = computeQuote(baseInput(lines));
        const sumOfLines = quote.lines.reduce((sum, line) => sum + line.lineTotal, 0);
        expect(sumOfLines).toBe(quote.subtotal);
      }),
    );
  });

  it("each line total equals unitPrice * qty", () => {
    fc.assert(
      fc.property(fc.array(lineArb, { minLength: 1, maxLength: 10 }), (lines) => {
        const quote = computeQuote(baseInput(lines));
        quote.lines.forEach((line) => {
          expect(line.lineTotal).toBe(line.unitPrice * line.qty);
        });
      }),
    );
  });

  it("an active flash price always wins over the regular unit price", () => {
    fc.assert(
      fc.property(
        lineArb,
        fc.integer({ min: 0, max: 1_000_00 }).map((v) => poisha(v)),
        (line, flashPrice) => {
          const flashed = { ...line, flashPrice, flashSaleItemId: "flash-1" };
          const quote = computeQuote(baseInput([flashed]));
          expect(quote.lines[0]!.unitPrice).toBe(flashPrice);
        },
      ),
    );
  });

  it("with no coupon, total equals subtotal plus delivery, and discount is zero", () => {
    fc.assert(
      fc.property(fc.array(lineArb, { minLength: 1, maxLength: 10 }), (lines) => {
        const quote = computeQuote(baseInput(lines));
        expect(quote.discount).toBe(ZERO);
        expect(quote.total).toBe(quote.subtotal + quote.deliveryCharge);
      }),
    );
  });

  it("free shipping applies once merchandise reaches the threshold", () => {
    const line: QuoteLineInput = {
      variantId: "v1",
      sku: "SKU1",
      name: "Item",
      qty: 1,
      unitPrice: poisha(700000),
      flashPrice: null,
      flashSaleItemId: null,
      productId: "p1",
      categoryIds: [],
    };
    const quote = computeQuote(baseInput([line]));
    expect(quote.deliveryCharge).toBe(ZERO);
  });
});

describe("computeQuote (with a coupon)", () => {
  const percentCoupon: CouponInput = {
    id: "c1",
    code: "SAVE10",
    type: "PERCENT",
    value: 10,
    minSubtotal: ZERO,
    productId: null,
    categoryId: null,
    isActive: true,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    usedCount: 0,
    perUserLimit: null,
  };

  // A coupon that would discount exactly 0 (e.g. every line is free) is
  // rejected rather than silently applied as a no-op — matches today's
  // real behavior (see promotions.ts) — so that's an expected outcome
  // here, not a violation of the invariant under test.
  it("a discount never exceeds the subtotal it was computed from", () => {
    fc.assert(
      fc.property(fc.array(lineArb, { minLength: 1, maxLength: 10 }), (lines) => {
        try {
          const quote = computeQuote({ ...baseInput(lines), coupon: percentCoupon });
          expect(quote.discount).toBeLessThanOrEqual(quote.subtotal);
        } catch (error) {
          expect(error).toBeInstanceOf(CouponRejectedError);
        }
      }),
    );
  });

  it("a FIXED coupon never discounts below zero merchandise", () => {
    const fixedCoupon: CouponInput = {
      ...percentCoupon,
      type: "FIXED",
      value: poisha(999999900),
    };
    fc.assert(
      fc.property(fc.array(lineArb, { minLength: 1, maxLength: 5 }), (lines) => {
        try {
          const quote = computeQuote({ ...baseInput(lines), coupon: fixedCoupon });
          expect(quote.total).toBeGreaterThanOrEqual(0);
        } catch (error) {
          expect(error).toBeInstanceOf(CouponRejectedError);
        }
      }),
    );
  });

  it("FREE_SHIPPING sets delivery to zero and discount to zero", () => {
    const freeShip: CouponInput = { ...percentCoupon, type: "FREE_SHIPPING", value: 0 };
    const line: QuoteLineInput = {
      variantId: "v1",
      sku: "SKU1",
      name: "Item",
      qty: 1,
      unitPrice: poisha(100),
      flashPrice: null,
      flashSaleItemId: null,
      productId: "p1",
      categoryIds: [],
    };
    const quote = computeQuote({ ...baseInput([line]), coupon: freeShip });
    expect(quote.deliveryCharge).toBe(ZERO);
    expect(quote.discount).toBe(ZERO);
  });

  it("an inactive coupon is rejected", () => {
    const line: QuoteLineInput = {
      variantId: "v1",
      sku: "SKU1",
      name: "Item",
      qty: 1,
      unitPrice: poisha(1000),
      flashPrice: null,
      flashSaleItemId: null,
      productId: "p1",
      categoryIds: [],
    };
    expect(() =>
      computeQuote({
        ...baseInput([line]),
        coupon: { ...percentCoupon, isActive: false },
      }),
    ).toThrow();
  });
});
