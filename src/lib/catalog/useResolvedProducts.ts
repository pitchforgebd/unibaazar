"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/types/catalog";

/** Resolves a list of product slugs against the real database via
 * `/api/v1/products/[slug]`, caching what's already been fetched. Shared by
 * the cart (`useCartCatalog`) and by Wishlist/Compare/Recently-Viewed, which
 * only ever persist a slug list client-side and need the real product behind
 * each one — not a hardcoded mock catalog. */
export function useResolvedProducts(slugs: string[]): {
  catalog: Map<string, Product>;
  loading: boolean;
} {
  const [catalog, setCatalog] = useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Map<string, Product>>(new Map());
  const slugKey = Array.from(new Set(slugs)).sort().join(",");

  useEffect(() => {
    const wanted = slugKey ? slugKey.split(",") : [];
    const missing = wanted.filter((slug) => !cacheRef.current.has(slug));
    if (missing.length === 0) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      missing.map(async (slug) => {
        try {
          const response = await fetch(`/api/v1/products/${slug}`);
          if (!response.ok) {
            return;
          }
          const body: unknown = await response.json();
          const record = typeof body === "object" && body !== null ? body : {};
          const product = "data" in record ? (record.data as Product) : null;
          if (product) {
            cacheRef.current.set(slug, product);
          }
        } catch {
          // network error — the slug stays unresolved until the next render retries
        }
      }),
    ).then(() => {
      if (!cancelled) {
        setCatalog(new Map(cacheRef.current));
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slugKey]);

  return { catalog, loading };
}
