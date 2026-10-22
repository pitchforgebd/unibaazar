import { variantLabel, variantPrice } from "@/lib/catalog/pricing";
import type { CartLine, Product, ProductVariant } from "@/types/catalog";

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
 * actually charge. Delivery/total aren't computed here at all — they depend
 * on admin-set settings and the checkout page gets them from the live
 * /api/v1/cart/quote endpoint instead (see useCheckoutQuote) so they can
 * never drift from what the server actually charges. */
export function summarizeCart(
  lines: CartLine[],
  discount: number,
  catalog: Map<string, Product>,
) {
  const resolved = resolveCartLines(lines, catalog);
  const subtotal = resolved.reduce(
    (sum, item) => sum + item.unitPrice * item.line.qty,
    0,
  );
  const merchandise = Math.max(subtotal - discount, 0);

  return { resolved, subtotal, discount, merchandise };
}
