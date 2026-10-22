"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import { ProductMedia } from "@/components/store/product/ProductMedia";
import { summarizeCart } from "@/lib/catalog/cart-lines";
import { productImage } from "@/lib/catalog/pricing";
import { useCartCatalog } from "@/lib/catalog/useCartCatalog";
import { formatTaka } from "@/lib/utils/currency";
import { useCartStore } from "@/store/cart";
import { useToastStore } from "@/store/toast";

export function CartView() {
  const lines = useCartStore((state) => state.lines);
  const couponCode = useCartStore((state) => state.couponCode);
  const couponDiscount = useCartStore((state) => state.couponDiscount);
  const setQty = useCartStore((state) => state.setQty);
  const removeLine = useCartStore((state) => state.removeLine);
  const applyCoupon = useCartStore((state) => state.applyCoupon);
  const clearCoupon = useCartStore((state) => state.clearCoupon);
  const push = useToastStore((state) => state.push);
  const t = useTranslations("cart");
  const toast = useTranslations("toast");
  const [code, setCode] = useState(couponCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const { catalog, loading } = useCartCatalog(lines);
  const summary = summarizeCart(lines, couponDiscount, catalog);

  if (summary.resolved.length === 0 && loading) {
    return null;
  }

  if (summary.resolved.length === 0) {
    return (
      <div className="rounded-lg bg-card p-8 text-center shadow-soft">
        <p className="font-semibold text-ink">{t("empty")}</p>
        <Link href="/shop" className={`${buttonClass("primary")} mt-4`}>
          {t("shop")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <ul className="space-y-3">
        {summary.resolved.map((item) => (
          <li
            key={`${item.line.slug}-${item.line.variantId}`}
            className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-lg bg-card p-3 shadow-soft sm:grid-cols-[88px_minmax(0,1fr)_auto]"
          >
            <ProductMedia
              hue={item.variant.imageHue}
              name={item.product.name}
              image={productImage(item.product, item.variant)}
              className="h-[72px] rounded-md sm:h-[88px]"
            />
            <div>
              <Link
                href={`/product/${item.product.slug}`}
                className="font-semibold text-ink hover:text-primary"
              >
                {item.product.name}
              </Link>
              {item.label ? <p className="text-sm text-muted">{item.label}</p> : null}
              <p className="mt-1 text-sm font-semibold text-primary">
                {formatTaka(item.unitPrice)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  aria-label={t("decrease")}
                  className="grid h-8 w-8 place-items-center rounded-md border border-black/10"
                  onClick={() =>
                    void setQty(item.line.slug, item.line.variantId, item.line.qty - 1)
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
                    void setQty(item.line.slug, item.line.variantId, item.line.qty + 1)
                  }
                >
                  +
                </button>
                <button
                  type="button"
                  className="ml-2 text-sm text-muted hover:text-primary"
                  onClick={() => {
                    removeLine(item.line.slug, item.line.variantId);
                    push(toast("removed"));
                  }}
                >
                  {t("remove")}
                </button>
              </div>
            </div>
            <p className="col-span-2 text-sm font-semibold sm:col-span-1 sm:text-right">
              {formatTaka(item.unitPrice * item.line.qty)}
            </p>
          </li>
        ))}
      </ul>
      <aside className="h-fit rounded-lg bg-card p-4 shadow-soft">
        <h2 className="font-semibold text-ink">{t("total")}</h2>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setApplying(true);
            applyCoupon(code)
              .then((message) => {
                setError(message);
                if (!message) {
                  push(toast("coupon"));
                }
              })
              .finally(() => setApplying(false));
          }}
        >
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={t("coupon")}
            aria-label={t("coupon")}
            className={fieldClass}
          />
          <button type="submit" className={buttonClass("outline")} disabled={applying}>
            {t("apply")}
          </button>
        </form>
        {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
        {couponCode ? (
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-primary"
            onClick={clearCoupon}
          >
            {t("remove")} {couponCode}
          </button>
        ) : (
          <p className="mt-2 text-xs text-muted">{t("tryCoupon")}</p>
        )}
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>{t("subtotal")}</dt>
            <dd>{formatTaka(summary.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t("discount")}</dt>
            <dd>-{formatTaka(summary.discount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t("delivery")}</dt>
            <dd>{t("deliveryAtCheckout")}</dd>
          </div>
          <div className="flex justify-between border-t border-black/5 pt-2 text-base font-semibold">
            <dt>{t("total")}</dt>
            <dd>{formatTaka(summary.merchandise)}</dd>
          </div>
        </dl>
        <Link href="/checkout" className={`${buttonClass("primary")} mt-4 w-full`}>
          {t("checkout")}
        </Link>
      </aside>
    </div>
  );
}
