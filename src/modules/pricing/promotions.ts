import {
  add,
  clampMin0,
  min,
  percentOf,
  poisha,
  ZERO,
  type Poisha,
} from "@/modules/pricing/money";
import type { CouponInput, DiscountLine } from "@/modules/pricing/types";

export class CouponRejectedError extends Error {
  constructor(message = "That coupon cannot be applied") {
    super(message);
    this.name = "CouponRejectedError";
  }
}

type ScopedLine = {
  productId: string;
  categoryIds: string[];
  lineTotal: Poisha;
};

function eligibleSubtotal(coupon: CouponInput, lines: ScopedLine[]): Poisha {
  const matching = lines.filter((line) => {
    if (coupon.productId) {
      return line.productId === coupon.productId;
    }
    if (coupon.categoryId) {
      return line.categoryIds.includes(coupon.categoryId);
    }
    return true;
  });
  if (matching.length === 0) {
    return ZERO;
  }
  return add(...matching.map((line) => line.lineTotal));
}

/**
 * One coupon per order (today's only supported configuration — no
 * stacking/priority/exclusivity flags exist on `Coupon` yet; see ADR
 * 0012's research note). A pure function so every eligibility rule is
 * property-testable without a database: active flag, date window, global
 * usage limit, per-customer usage limit, scope (product/category),
 * scoped minimum subtotal, and "a computed discount of exactly 0 is
 * rejected rather than silently treated as a no-op" — all preserved from
 * today's real behavior in `src/server/checkout/quote.ts`.
 *
 * Throws `CouponRejectedError` (never says *why* — matches today's
 * behavior of not revealing whether a code is expired vs. unknown vs. used
 * up, so a guesser can't enumerate valid-but-expired codes) whenever the
 * coupon can't be applied.
 */
export function applyCoupon(
  coupon: CouponInput,
  lines: ScopedLine[],
  alreadyUsedByCustomer: number,
  now: Date = new Date(),
): { discounts: DiscountLine[]; discount: Poisha; freeShipping: boolean } {
  const withinWindow =
    (coupon.startsAt === null || coupon.startsAt <= now) &&
    (coupon.endsAt === null || coupon.endsAt >= now);
  const underGlobalLimit =
    coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit;
  if (!coupon.isActive || !withinWindow || !underGlobalLimit) {
    throw new CouponRejectedError();
  }
  if (coupon.perUserLimit !== null && alreadyUsedByCustomer >= coupon.perUserLimit) {
    throw new CouponRejectedError();
  }
  const eligible = eligibleSubtotal(coupon, lines);
  if (eligible < coupon.minSubtotal) {
    throw new CouponRejectedError();
  }
  if (coupon.type === "FREE_SHIPPING") {
    return { discounts: [], discount: ZERO, freeShipping: true };
  }
  const amount =
    coupon.type === "PERCENT"
      ? percentOf(eligible, coupon.value as number)
      : clampMin0(min(poisha(coupon.value as Poisha), eligible));
  if (amount === 0) {
    throw new CouponRejectedError();
  }
  return {
    discounts: [{ source: "coupon", label: coupon.code, amount }],
    discount: amount,
    freeShipping: false,
  };
}
