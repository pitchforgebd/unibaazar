"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { Stagger, StaggerItem } from "@/components/motion";
import { ProductCard } from "@/components/store/product/ProductCard";
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
      <div className="flex flex-col items-center gap-3 rounded-theme bg-card p-8 text-center shadow-soft">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-peach text-primary"
        >
          <Heart className="size-7" />
        </span>
        <p className="font-heading font-semibold text-ink">{t("empty")}</p>
        <p className="max-w-sm text-sm text-muted">{t("emptyHint")}</p>
        <Link href="/shop" className={buttonStyles({ className: "mt-1" })}>
          {shop("browseProducts")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted" aria-live="polite">
        {t("count", { count: products.length })}
      </p>
      <Stagger className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <StaggerItem key={product.slug}>
            <ProductCard product={product} />
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
