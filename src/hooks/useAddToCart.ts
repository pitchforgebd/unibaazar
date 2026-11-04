"use client";

import { useTranslations } from "next-intl";
import { track } from "@/lib/tracking/browser";
import { productTrackItem } from "@/lib/tracking/ecommerce";
import { useCartStore } from "@/store/cart";
import { useToastStore } from "@/store/toast";
import { useUiStore } from "@/store/ui";
import type { CartLine, Product } from "@/types/catalog";

type AddOptions = {
  openDrawer?: boolean;
};

export function useAddToCart(): (
  product: Product,
  line: CartLine,
  options?: AddOptions,
) => Promise<boolean> {
  const addLine = useCartStore((state) => state.addLine);
  const openCart = useUiStore((state) => state.openCart);
  const push = useToastStore((state) => state.push);
  const t = useTranslations("toast");

  return async (product, line, options) => {
    const result = await addLine(line);
    if (result === "out-of-stock") {
      push(t("outOfStock"));
      return false;
    }
    push(t("added"));
    const variant = product.variants.find((item) => item.id === line.variantId);
    if (variant) {
      track("AddToCart", {
        slug: line.slug,
        items: [productTrackItem(product, variant, line.qty)],
      });
    }
    if (options?.openDrawer !== false) {
      openCart();
    }
    return true;
  };
}
