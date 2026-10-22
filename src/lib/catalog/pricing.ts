import type { Product, ProductImage, ProductVariant } from "@/types/catalog";

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
