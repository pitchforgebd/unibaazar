"use client";

import { useTranslations } from "next-intl";
import { defaultVariant } from "@/lib/catalog/pricing";
import { useAddToCart } from "@/hooks/useAddToCart";
import type { Product } from "@/types/catalog";

type QuickAddProps = {
  product: Product;
};

export function QuickAdd({ product }: QuickAddProps) {
  const addToCart = useAddToCart();
  const t = useTranslations("product");
  const variant = defaultVariant(product);
  const disabled = variant.stock <= 0;

  return (
    <button
      type="button"
      onClick={() =>
        void addToCart({ slug: product.slug, variantId: variant.id, qty: 1 })
      }
      disabled={disabled}
      className="mt-3 h-9 w-full rounded-md bg-primary text-sm font-semibold text-white transition-transform duration-150 ease-out hover:bg-primary-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
    >
      {disabled ? t("out") : t("quickAdd")}
    </button>
  );
}
