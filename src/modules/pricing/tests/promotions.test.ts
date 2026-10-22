import { describe, expect, it } from "vitest";
import { applyCoupon, CouponRejectedError } from "@/modules/pricing/promotions";
import { poisha, ZERO } from "@/modules/pricing/money";
import type { CouponInput } from "@/modules/pricing/types";

const base: CouponInput = {
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

const line = { productId: "p1", categoryIds: ["cat1"], lineTotal: poisha(10000) };

describe("applyCoupon — eligibility gates", () => {
  it("rejects an inactive coupon", () => {
    expect(() => applyCoupon({ ...base, isActive: false }, [line], 0)).toThrow(
      CouponRejectedError,
    );
  });

  it("rejects a coupon before its start date", () => {
    const future = new Date(Date.now() + 86_400_000);
    expect(() => applyCoupon({ ...base, startsAt: future }, [line], 0)).toThrow(
      CouponRejectedError,
    );
  });

  it("rejects a coupon after its end date", () => {
    const past = new Date(Date.now() - 86_400_000);
    expect(() => applyCoupon({ ...base, endsAt: past }, [line], 0)).toThrow(
      CouponRejectedError,
    );
  });

  it("accepts a coupon within its start/end window", () => {
    const past = new Date(Date.now() - 86_400_000);
    const future = new Date(Date.now() + 86_400_000);
    expect(() =>
      applyCoupon({ ...base, startsAt: past, endsAt: future }, [line], 0),
    ).not.toThrow();
  });

  it("rejects a coupon that has reached its global usage limit", () => {
    expect(() =>
      applyCoupon({ ...base, usageLimit: 5, usedCount: 5 }, [line], 0),
    ).toThrow(CouponRejectedError);
  });

  it("accepts a coupon under its global usage limit", () => {
    expect(() =>
      applyCoupon({ ...base, usageLimit: 5, usedCount: 4 }, [line], 0),
    ).not.toThrow();
  });

  it("rejects a coupon this customer has already used up to their per-user limit", () => {
    expect(() => applyCoupon({ ...base, perUserLimit: 2 }, [line], 2)).toThrow(
      CouponRejectedError,
    );
  });

  it("accepts a coupon this customer hasn't reached their per-user limit on", () => {
    expect(() => applyCoupon({ ...base, perUserLimit: 2 }, [line], 1)).not.toThrow();
  });

  it("rejects when the scoped-eligible subtotal is below minSubtotal", () => {
    expect(() => applyCoupon({ ...base, minSubtotal: poisha(20000) }, [line], 0)).toThrow(
      CouponRejectedError,
    );
  });

  it("scopes eligibility to productId when set — non-matching lines don't count", () => {
    expect(() => applyCoupon({ ...base, productId: "other-product" }, [line], 0)).toThrow(
      CouponRejectedError,
    ); // eligible subtotal is 0 -> amount 0 -> rejected
  });

  it("scopes eligibility to categoryId when set — matching lines count", () => {
    const result = applyCoupon({ ...base, categoryId: "cat1" }, [line], 0);
    expect(result.discount).toBeGreaterThan(0);
  });

  it("scopes eligibility to categoryId when set — non-matching lines don't count", () => {
    expect(() => applyCoupon({ ...base, categoryId: "other-cat" }, [line], 0)).toThrow(
      CouponRejectedError,
    );
  });
});

describe("applyCoupon — discount computation", () => {
  it("PERCENT computes a percentage of the eligible subtotal", () => {
    const result = applyCoupon({ ...base, type: "PERCENT", value: 10 }, [line], 0);
    expect(result.discount).toBe(1000); // 10% of 10000
    expect(result.freeShipping).toBe(false);
    expect(result.discounts).toEqual([
      { source: "coupon", label: "SAVE10", amount: 1000 },
    ]);
  });

  it("FIXED discounts the flat amount when it's under the eligible subtotal", () => {
    const result = applyCoupon({ ...base, type: "FIXED", value: poisha(500) }, [line], 0);
    expect(result.discount).toBe(500);
  });

  it("FIXED caps the discount at the eligible subtotal, never going negative", () => {
    const result = applyCoupon(
      { ...base, type: "FIXED", value: poisha(999_999_00) },
      [line],
      0,
    );
    expect(result.discount).toBe(line.lineTotal);
  });

  it("FREE_SHIPPING returns no money discount but sets the flag", () => {
    const result = applyCoupon({ ...base, type: "FREE_SHIPPING", value: 0 }, [line], 0);
    expect(result.discount).toBe(ZERO);
    expect(result.discounts).toEqual([]);
    expect(result.freeShipping).toBe(true);
  });

  it("rejects a coupon that would discount exactly 0 rather than treating it as a no-op", () => {
    expect(() => applyCoupon({ ...base, type: "FIXED", value: ZERO }, [line], 0)).toThrow(
      CouponRejectedError,
    );
  });
});
