"use client";

import { useEffect } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { Sheet } from "@/components/ui/Sheet";
import { FreeDeliveryProgress } from "@/components/store/cart/FreeDeliveryProgress";
import { QuantityStepper } from "@/components/store/cart/QuantityStepper";
import { ProductMedia } from "@/components/store/product/ProductMedia";
import { summarizeCart } from "@/lib/catalog/cart-lines";
import { productImage } from "@/lib/catalog/pricing";
import { useCartCatalog } from "@/lib/catalog/useCartCatalog";
import { formatTaka } from "@/lib/utils/currency";
import { useCartStore } from "@/store/cart";
import { useToastStore } from "@/store/toast";
import { useUiStore } from "@/store/ui";

/** Slide-in cart on the shared Sheet primitive (focus trap, Escape,
 * backdrop dismiss, scroll lock and focus return all come from it). */
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
  const { catalog } = useCartCatalog(lines);
  const summary = summarizeCart(lines, couponDiscount, catalog);
  const count = summary.resolved.reduce((sum, item) => sum + item.line.qty, 0);
  const empty = summary.resolved.length === 0;

  useEffect(() => {
    closeCart();
  }, [pathname, closeCart]);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) closeCart();
      }}
      side="right"
      closeLabel={t("close")}
      title={
        <span className="inline-flex items-center gap-2">
          {t("title")}
          {count > 0 ? (
            <Badge variant="primary">{t("itemCount", { count })}</Badge>
          ) : null}
        </span>
      }
      footer={
        empty ? undefined : (
          <div className="w-full space-y-3">
            <div className="flex justify-between text-sm">
              <span>{t("subtotal")}</span>
              <span className="font-semibold">{formatTaka(summary.merchandise)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/cart"
                className={buttonStyles({ variant: "outline" })}
                onClick={closeCart}
              >
                {t("view")}
              </Link>
              <Link href="/checkout" className={buttonStyles()} onClick={closeCart}>
                {t("checkout")}
              </Link>
            </div>
          </div>
        )
      }
    >
      {empty ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
          <p className="font-semibold text-ink">{t("empty")}</p>
          <Link href="/shop" className={buttonStyles()} onClick={closeCart}>
            {t("shop")}
          </Link>
        </div>
      ) : (
        <>
          <FreeDeliveryProgress
            merchandise={summary.merchandise}
            className="mb-4 rounded-theme bg-peach p-3"
          />
          <ul className="space-y-4">
            {summary.resolved.map((item) => (
              <li key={`${item.line.slug}-${item.line.variantId}`} className="flex gap-3">
                <ProductMedia
                  hue={item.variant.imageHue}
                  name={item.product.name}
                  image={productImage(item.product, item.variant)}
                  className="h-16 w-16 shrink-0 rounded-theme"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{item.product.name}</p>
                  {item.label ? <p className="text-xs text-muted">{item.label}</p> : null}
                  <p className="text-sm font-semibold text-primary">
                    {formatTaka(item.unitPrice)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <QuantityStepper
                      qty={item.line.qty}
                      onChange={(qty) =>
                        void setQty(item.line.slug, item.line.variantId, qty)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        removeLine(item.line.slug, item.line.variantId);
                        push(toast("removed"));
                      }}
                    >
                      {t("remove")}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}
