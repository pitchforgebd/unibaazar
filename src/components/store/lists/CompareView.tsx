"use client";

import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { MoveHorizontal, Scale, ShoppingCart, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { Reveal } from "@/components/motion";
import { ProductMedia } from "@/components/store/product/ProductMedia";
import { defaultVariant, displayPrice, totalStock } from "@/lib/catalog/pricing";
import { useResolvedProducts } from "@/lib/catalog/useResolvedProducts";
import { formatTaka } from "@/lib/utils/currency";
import { useCompareStore } from "@/store/lists";
import { useCartStore } from "@/store/cart";
import type { Product } from "@/types/catalog";

// Row-label column stays pinned while product columns scroll underneath it,
// so at 360px a three-product comparison is still readable side by side.
const labelCell =
  "sticky start-0 z-10 w-24 min-w-24 bg-card p-3 text-start align-top text-xs font-medium text-muted shadow-[1px_0_0_rgb(var(--color-ink)/0.08)] sm:w-36 sm:text-sm";
const productCell = "min-w-36 p-3 text-start align-top sm:min-w-48";

export function CompareView() {
  const t = useTranslations("compare");
  const shop = useTranslations("shop");
  const productT = useTranslations("product");
  const cart = useTranslations("cart");
  const slugs = useCompareStore((state) => state.slugs);
  const toggle = useCompareStore((state) => state.toggle);
  const addLine = useCartStore((state) => state.addLine);
  const { catalog } = useResolvedProducts(slugs);
  const products = slugs.flatMap((slug) => {
    const product = catalog.get(slug);
    return product ? [product] : [];
  });

  if (products.length < 2) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-theme bg-card p-8 text-center shadow-soft">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-full bg-peach text-primary"
        >
          <Scale className="size-7" />
        </span>
        <p className="font-heading font-semibold text-ink">{t("needMore")}</p>
        <p className="max-w-sm text-sm text-muted">{t("hint")}</p>
        <Link href="/shop" className={buttonStyles({ className: "mt-1" })}>
          {shop("browseProducts")}
        </Link>
      </div>
    );
  }

  const rows: { label: string; cell: (product: Product) => ReactNode }[] = [
    { label: shop("brand"), cell: (product) => product.brandName },
    {
      label: shop("price"),
      cell: (product) => (
        <span className="font-heading text-base font-semibold text-ink tabular-nums">
          {formatTaka(displayPrice(product).current)}
        </span>
      ),
    },
    { label: shop("rating"), cell: (product) => product.rating.toFixed(1) },
    {
      label: productT("stock"),
      cell: (product) =>
        totalStock(product) > 0 ? (
          <Badge variant="success">{shop("inStock")}</Badge>
        ) : (
          <Badge variant="outline">{shop("outOfStock")}</Badge>
        ),
    },
  ];

  return (
    <Reveal className="space-y-3">
      <p className="flex items-center gap-2 text-xs text-muted md:hidden">
        <MoveHorizontal aria-hidden="true" className="size-4" />
        {t("swipeHint")}
      </p>
      <div className="relative">
        <div
          role="region"
          aria-label={t("tableLabel")}
          tabIndex={0}
          className="overflow-x-auto overscroll-x-contain rounded-theme bg-card shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{t("tableLabel")}</caption>
            <thead>
              <tr>
                <th scope="col" className={labelCell}>
                  <span className="sr-only">{t("featureColumn")}</span>
                </th>
                {products.map((product) => (
                  <th
                    key={product.slug}
                    scope="col"
                    className={`${productCell} font-semibold`}
                  >
                    <ProductMedia
                      hue={product.imageHue}
                      name={product.name}
                      className="mb-2 aspect-square w-20 rounded-theme sm:w-24"
                    />
                    <Link
                      href={`/product/${product.slug}`}
                      className="line-clamp-2 text-ink hover:text-primary"
                    >
                      {product.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-ink/10">
                  <th scope="row" className={labelCell}>
                    {row.label}
                  </th>
                  {products.map((product) => (
                    <td key={product.slug} className={`${productCell} text-foreground`}>
                      {row.cell(product)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-ink/10">
                <th scope="row" className={labelCell}>
                  <span className="sr-only">{t("actionsRow")}</span>
                </th>
                {products.map((product) => {
                  const variant = defaultVariant(product);
                  return (
                    <td key={product.slug} className={productCell}>
                      <div className="flex flex-col items-start gap-1">
                        <Button
                          size="sm"
                          disabled={variant.stock <= 0}
                          onClick={() =>
                            void addLine({
                              slug: product.slug,
                              variantId: variant.id,
                              qty: 1,
                            })
                          }
                        >
                          <ShoppingCart aria-hidden="true" className="size-4" />
                          {productT("add")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t("removeProduct", { name: product.name })}
                          onClick={() => toggle(product.slug)}
                        >
                          <X aria-hidden="true" className="size-4" />
                          {cart("remove")}
                        </Button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 end-0 w-8 rounded-e-theme bg-linear-to-l from-card to-transparent md:hidden rtl:bg-linear-to-r"
        />
      </div>
    </Reveal>
  );
}
