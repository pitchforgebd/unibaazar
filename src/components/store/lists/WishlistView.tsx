"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/controls";
import { ProductGrid } from "@/components/store/product/ProductCard";
import { useResolvedProducts } from "@/lib/catalog/useResolvedProducts";
import { useWishlistStore } from "@/store/lists";

export function WishlistView() {
  const t = useTranslations("wishlist");
  const shop = useTranslations("shop");
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
        <p className="font-semibold">{t("empty")}</p>
        <Link href="/shop" className={`${buttonClass("primary")} mt-4`}>
          {shop("browseProducts")}
        </Link>
      </div>
    );
  }

  return <ProductGrid products={products} />;
}
