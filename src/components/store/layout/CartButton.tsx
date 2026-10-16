"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { summarizeCart } from "@/lib/catalog/cart-lines";
import { useCartCatalog } from "@/lib/catalog/useCartCatalog";
import { formatTaka } from "@/lib/utils/currency";
import { CartIcon } from "@/components/store/layout/icons";
import { useCartHydrated, useCartStore } from "@/store/cart";
import { useUiStore } from "@/store/ui";

export function CartButton() {
  const t = useTranslations("common");
  const hydrated = useCartHydrated();
  const lines = useCartStore((state) => state.lines);
  const couponDiscount = useCartStore((state) => state.couponDiscount);
  const openCart = useUiStore((state) => state.openCart);
  const { catalog } = useCartCatalog(lines);
  const summary = summarizeCart(lines, couponDiscount, catalog);
  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const label = hydrated
    ? `${t("cart")}, ${count}, ${formatTaka(summary.merchandise)}`
    : t("cart");

  const [bump, setBump] = useState(false);
  const previousCount = useRef(count);
  useEffect(() => {
    if (hydrated && count > previousCount.current) {
      setBump(true);
      const timer = window.setTimeout(() => setBump(false), 400);
      previousCount.current = count;
      return () => window.clearTimeout(timer);
    }
    previousCount.current = count;
  }, [count, hydrated]);

  return (
    <button
      type="button"
      aria-label={label}
      onClick={openCart}
      className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-md px-1 py-1 text-ink hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="relative">
        <CartIcon />
        <span
          className={`absolute -top-2 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-semibold text-white ${bump ? "animate-bump" : ""}`}
        >
          {hydrated ? count : ""}
        </span>
      </span>
      <span className="hidden text-sm font-semibold sm:block">
        {hydrated ? formatTaka(summary.merchandise) : ""}
      </span>
    </button>
  );
}
