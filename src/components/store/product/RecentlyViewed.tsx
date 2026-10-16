"use client";

import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/store/common/SectionHeading";
import { ProductGrid } from "@/components/store/product/ProductCard";
import { useResolvedProducts } from "@/lib/catalog/useResolvedProducts";

const storageKey = "unibaazar:recent";

function readSlugs(): string[] {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

type RecentlyViewedProps = {
  currentSlug: string;
};

export function RecentlyViewed({ currentSlug }: RecentlyViewedProps) {
  const [otherSlugs, setOtherSlugs] = useState<string[]>([]);

  useEffect(() => {
    const next = [
      currentSlug,
      ...readSlugs().filter((slug) => slug !== currentSlug),
    ].slice(0, 8);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setOtherSlugs(next.filter((slug) => slug !== currentSlug));
  }, [currentSlug]);

  const { catalog } = useResolvedProducts(otherSlugs);
  const products = otherSlugs.flatMap((slug) => {
    const product = catalog.get(slug);
    return product ? [product] : [];
  });

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <SectionHeading title="Recently viewed" />
      <ProductGrid products={products} />
    </section>
  );
}
