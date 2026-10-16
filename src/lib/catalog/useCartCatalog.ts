"use client";

import { useResolvedProducts } from "@/lib/catalog/useResolvedProducts";
import type { CartLine, Product } from "@/types/catalog";

export function useCartCatalog(lines: CartLine[]): {
  catalog: Map<string, Product>;
  loading: boolean;
} {
  return useResolvedProducts(lines.map((line) => line.slug));
}
