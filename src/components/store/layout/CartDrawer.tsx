"use client";

import { useEffect, useRef } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/controls";
import { ProductMedia } from "@/components/store/product/ProductMedia";
import { summarizeCart } from "@/lib/catalog/cart-lines";
import { productImage } from "@/lib/catalog/pricing";
import { useCartCatalog } from "@/lib/catalog/useCartCatalog";
import { formatTaka } from "@/lib/utils/currency";
import { useCartStore } from "@/store/cart";
import { useToastStore } from "@/store/toast";
import { useUiStore } from "@/store/ui";

export function CartDrawer() {
  const pathname = usePathname();
  const open = useUiStore((state) => state.cartOpen);
  const closeCart = useUiStore((state) => state.closeCart);
  const lines = useCartStore((state) => state.lines);
  const couponDiscount = useCartStore((state) => state.couponDiscount);
  const setQty = useCartStore((state) => state.setQty);
  const removeLine = useCartStore((state) => state.removeLine);
  const push = useToastStore((state) => state.push);
  const t = useTranslations("cart");
  const toast = useTranslations("toast");
  const closeRef = useRef<HTMLButtonElement>(null);
  const { catalog } = useCartCatalog(lines);
  const summary = summarizeCart(lines, couponDiscount, catalog);

  useEffect(() => {
    closeCart();
  }, [pathname, closeCart]);

  useEffect(() => {
    if (!open) {
      return;
    }
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeCart();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, closeCart]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label={t("close")}
        onClick={closeCart}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-card shadow-soft"
      >
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <h2 className="font-semibold text-ink">{t("title")}</h2>
          <button
            ref={closeRef}
            type="button"
            className="text-sm font-semibold text-muted"
            onClick={closeCart}
          >
            {t("close")}
          </button>
        </div>
        {summary.resolved.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="font-semibold text-ink">{t("empty")}</p>
            <Link href="/shop" className={buttonClass("primary")} onClick={closeCart}>
              {t("shop")}
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-3 overflow-y-auto p-4">
              {summary.resolved.map((item) => (
                <li
                  key={`${item.line.slug}-${item.line.variantId}`}
                  className="flex gap-3"
                >
                  <ProductMedia
                    hue={item.variant.imageHue}
                    name={item.product.name}
                    image={productImage(item.product, item.variant)}
                    className="h-16 w-16 shrink-0 rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{item.product.name}</p>
                    {item.label ? (
                      <p className="text-xs text-muted">{item.label}</p>
                    ) : null}
                    <p className="text-sm font-semibold text-primary">
                      {formatTaka(item.unitPrice)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={t("decrease")}
                        className="grid h-8 w-8 place-items-center rounded-md border border-black/10"
                        onClick={() =>
                          void setQty(
                            item.line.slug,
                            item.line.variantId,
                            item.line.qty - 1,
                          )
                        }
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">
                        {item.line.qty}
                      </span>
                      <button
                        type="button"
                        aria-label={t("increase")}
                        className="grid h-8 w-8 place-items-center rounded-md border border-black/10"
                        onClick={() =>
                          void setQty(
                            item.line.slug,
                            item.line.variantId,
                            item.line.qty + 1,
                          )
                        }
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="ml-2 text-sm text-muted"
                        onClick={() => {
                          removeLine(item.line.slug, item.line.variantId);
                          push(toast("removed"));
                        }}
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-black/5 p-4">
              <div className="flex justify-between text-sm">
                <span>{t("subtotal")}</span>
                <span className="font-semibold">{formatTaka(summary.merchandise)}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link href="/cart" className={buttonClass("outline")} onClick={closeCart}>
                  {t("view")}
                </Link>
                <Link
                  href="/checkout"
                  className={buttonClass("primary")}
                  onClick={closeCart}
                >
                  {t("checkout")}
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
