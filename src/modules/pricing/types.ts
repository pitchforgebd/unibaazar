import type { Poisha } from "@/modules/pricing/money";
import type { DeliveryArea } from "@/modules/pricing/delivery";

export type { DeliveryArea };

export type QuoteLineInput = {
  variantId: string;
  sku: string;
  name: string;
  qty: number;
  /** Regular unit price (already resolved to the sale price if one is
   * manually set — flash-sale substitution is applied separately below). */
  unitPrice: Poisha;
  /** Active flash-sale unit price for this variant, if any, and the
   * flash-sale item id (needed to enforce/consume its qtyLimit). */
  flashPrice: Poisha | null;
  flashSaleItemId: string | null;
  productId: string;
  categoryIds: string[];
};

export type CouponInput = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: Poisha | number; // number only for PERCENT (a percentage, not money)
  minSubtotal: Poisha;
  productId: string | null;
  categoryId: string | null;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number | null;
};

export type DiscountSource = "coupon" | "flash-sale";

export type DiscountLine = {
  source: DiscountSource;
  label: string;
  amount: Poisha;
};

export type QuoteLine = {
  variantId: string;
  sku: string;
  name: string;
  qty: number;
  /** The price actually charged per unit (flash price if active, else the
   * regular/sale unit price) — what gets snapshotted onto OrderItem. */
  unitPrice: Poisha;
  lineTotal: Poisha;
  flashSaleItemId: string | null;
};

export type Quote = {
  lines: QuoteLine[];
  subtotal: Poisha;
  discounts: DiscountLine[];
  discount: Poisha;
  deliveryCharge: Poisha;
  /** Modeled per the master plan's §5.1 quote shape but not wired to a
   * live admin toggle yet — always 0. See ADR 0012's addendum before
   * changing that; VAT especially is a deliberate reporting-only figure
   * today and turning it into a real charge is a pricing-behavior change,
   * not a bug fix. */
  codCharge: Poisha;
  vat: Poisha;
  total: Poisha;
  couponId: string | null;
};

export type QuoteInput = {
  lines: QuoteLineInput[];
  area: DeliveryArea;
  coupon: CouponInput | null;
  /** Precomputed because it requires a DB count scoped to the coupon and
   * customer phone — the pure quote function just enforces the limit. */
  couponAlreadyUsedByCustomer: number;
  deliverySettings: import("@/modules/pricing/delivery").DeliverySettings;
};
