import { siteConfig } from "@/config/site";
import type {
  Coupon,
  DeliveryArea,
  Product,
  ProductImage,
  ProductVariant,
} from "@/types/catalog";

export const deliveryCharges: Record<DeliveryArea, number> = {
  "inside-dhaka": 70,
  "outside-dhaka": 130,
};

export function variantPrice(variant: ProductVariant): number {
  return variant.salePrice ?? variant.price;
}

export function productImage(
  product: Pick<Product, "images">,
  variant?: Pick<ProductVariant, "image"> | null,
): ProductImage | null {
  return variant?.image ?? product.images[0] ?? null;
}

export function discountPercent(regular: number, current: number): number {
  if (regular <= 0 || current >= regular) {
    return 0;
  }
  return Math.round(((regular - current) / regular) * 100);
}

export function displayPrice(product: Product): {
  current: number;
  regular: number | null;
} {
  const current = Math.min(...product.variants.map((variant) => variantPrice(variant)));
  const regular = Math.max(...product.variants.map((variant) => variant.price));
  return {
    current,
    regular: regular > current ? regular : null,
  };
}

export function totalStock(product: Product): number {
  return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
}

export function couponDiscount(subtotal: number, coupon: Coupon | null): number {
  if (!coupon || subtotal < coupon.minSubtotal) {
    return 0;
  }
  if (coupon.type === "percent") {
    return Math.round((subtotal * coupon.value) / 100);
  }
  return Math.min(coupon.value, subtotal);
}

export function deliveryCharge(area: DeliveryArea, merchandiseTotal: number): number {
  if (merchandiseTotal <= 0 || merchandiseTotal >= siteConfig.freeShippingThreshold) {
    return 0;
  }
  return deliveryCharges[area];
}

export function defaultVariant(product: Product): ProductVariant {
  return product.variants.find((variant) => variant.stock > 0) ?? product.variants[0];
}

export { findVariant } from "@/lib/catalog/variants";

export function variantLabel(variant: ProductVariant): string {
  const parts = Object.entries(variant.attributes).map(
    ([name, value]) => `${name}: ${value}`,
  );
  return parts.join(", ");
}
