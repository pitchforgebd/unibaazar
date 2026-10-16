"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/controls";
import { ProductGrid } from "@/components/store/product/ProductCard";
import { useResolvedProducts } from "@/lib/catalog/useResolvedProducts";
import { useWishlistStore } from "@/store/lists";

export function WishlistView() {
  const slugs = useWishlistStore((state) => state.slugs);
  const { catalog, loading } = useResolvedProducts(slugs);
  const products = slugs.flatMap((slug) => {
    const product = catalog.get(slug);
    return product ? [product] : [];
  });

  if (products.length === 0 && loading) {
    return null;
  }

  if (products.length === 0) {
    return (
      <div className="rounded-lg bg-card p-8 text-center shadow-soft">
        <p className="font-semibold">Your wishlist is empty.</p>
        <Link href="/shop" className={`${buttonClass("primary")} mt-4`}>
          Browse products
        </Link>
      </div>
    );
  }

  return <ProductGrid products={products} />;
}
