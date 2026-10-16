"use client";

import { useTranslations } from "next-intl";
import { track } from "@/lib/tracking/browser";
import { useCartStore } from "@/store/cart";
import { useToastStore } from "@/store/toast";
import { useUiStore } from "@/store/ui";
import type { CartLine } from "@/types/catalog";

type AddOptions = {
  openDrawer?: boolean;
};

export function useAddToCart(): (line: CartLine, options?: AddOptions) => boolean {
  const addLine = useCartStore((state) => state.addLine);
  const openCart = useUiStore((state) => state.openCart);
  const push = useToastStore((state) => state.push);
  const t = useTranslations("toast");

  return (line, options) => {
    const result = addLine(line);
    if (result === "out-of-stock") {
      push(t("outOfStock"));
      return false;
    }
    push(t("added"));
    track("AddToCart", { slug: line.slug, variantId: line.variantId, qty: line.qty });
    if (options?.openDrawer !== false) {
      openCart();
    }
    return true;
  };
}
