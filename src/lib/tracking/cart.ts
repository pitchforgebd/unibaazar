import { productTrackItem, type TrackItem } from "@/lib/tracking/ecommerce";
import type { CartLine, Product, ProductVariant } from "@/types/catalog";

type ResolvedLine = { line: CartLine; product: Product; variant: ProductVariant };

export function cartTrackItems(lines: ResolvedLine[]): TrackItem[] {
  return lines.map(({ line, product, variant }) =>
    productTrackItem(product, variant, line.qty),
  );
}
