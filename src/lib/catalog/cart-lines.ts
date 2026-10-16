import { deliveryCharge, variantLabel, variantPrice } from "@/lib/catalog/pricing";
import type { CartLine, DeliveryArea, Product, ProductVariant } from "@/types/catalog";

export type ResolvedCartLine = {
  line: CartLine;
  product: Product;
  variant: ProductVariant;
  unitPrice: number;
  label: string;
};

export function resolveCartLines(
  lines: CartLine[],
  catalog: Map<string, Product>,
): ResolvedCartLine[] {
  return lines.flatMap((line) => {
    const product = catalog.get(line.slug);
    const variant = product?.variants.find((item) => item.id === line.variantId);
    if (!product || !variant) {
      return [];
    }
    return [
      {
        line,
        product,
        variant,
        unitPrice: variantPrice(variant),
        label: variantLabel(variant),
      },
    ];
  });
}

/** `discount` is the server-validated coupon discount for the current lines
 * (see `useCartStore.applyCoupon`/`refreshCoupon`) — never recomputed from a
 * client-side coupon table, so the preview always matches what checkout will
 * actually charge. */
export function summarizeCart(
  lines: CartLine[],
  discount: number,
  catalog: Map<string, Product>,
  area?: DeliveryArea,
) {
  const resolved = resolveCartLines(lines, catalog);
  const subtotal = resolved.reduce(
    (sum, item) => sum + item.unitPrice * item.line.qty,
    0,
  );
  const merchandise = Math.max(subtotal - discount, 0);
  const shipping = area ? deliveryCharge(area, merchandise) : null;
  const total = merchandise + (shipping ?? 0);

  return { resolved, subtotal, discount, merchandise, shipping, total };
}
