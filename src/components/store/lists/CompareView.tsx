"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/controls";
import { ProductMedia } from "@/components/store/product/ProductMedia";
import { defaultVariant, displayPrice, totalStock } from "@/lib/catalog/pricing";
import { useResolvedProducts } from "@/lib/catalog/useResolvedProducts";
import { formatTaka } from "@/lib/utils/currency";
import { useCompareStore } from "@/store/lists";
import { useCartStore } from "@/store/cart";
import type { Product } from "@/types/catalog";

export function CompareView() {
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
      <div className="rounded-lg bg-card p-8 shadow-soft">
        <p className="font-semibold">Add at least two products to compare.</p>
        <p className="mt-2 text-sm text-muted">
          Open a product and choose Add to compare. Up to three items.
        </p>
        <Link href="/shop" className={`${buttonClass("primary")} mt-4`}>
          Browse products
        </Link>
      </div>
    );
  }

  const rows: { label: string; cell: (product: Product) => string }[] = [
    { label: "Brand", cell: (product) => product.brandName },
    {
      label: "Price",
      cell: (product) => formatTaka(displayPrice(product).current),
    },
    { label: "Rating", cell: (product) => product.rating.toFixed(1) },
    {
      label: "Stock",
      cell: (product) => (totalStock(product) > 0 ? "In stock" : "Out of stock"),
    },
  ];

  return (
    <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
      <table className="min-w-[640px] w-full text-sm">
        <thead>
          <tr>
            <th className="p-3 text-left"> </th>
            {products.map((product) => (
              <th key={product.slug} className="p-3 text-left font-semibold">
                <ProductMedia
                  hue={product.imageHue}
                  name={product.name}
                  className="mb-2 h-20 w-20 rounded-md"
                />
                <Link href={`/product/${product.slug}`} className="hover:text-primary">
                  {product.name}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-black/5">
              <th className="p-3 text-left font-medium text-muted">{row.label}</th>
              {products.map((product) => (
                <td key={product.slug} className="p-3">
                  {row.cell(product)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-black/5">
            <th className="p-3" />
            {products.map((product) => {
              const variant = defaultVariant(product);
              return (
                <td key={product.slug} className="p-3">
                  <button
                    type="button"
                    className={buttonClass("primary")}
                    disabled={variant.stock <= 0}
                    onClick={() =>
                      addLine({ slug: product.slug, variantId: variant.id, qty: 1 })
                    }
                  >
                    Add to cart
                  </button>
                  <button
                    type="button"
                    className="mt-2 block text-xs text-muted"
                    onClick={() => toggle(product.slug)}
                  >
                    Remove
                  </button>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
