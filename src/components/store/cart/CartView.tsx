"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ShakeOnError } from "@/components/motion";
import { Button } from "@/components/ui/Button";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { Input } from "@/components/ui/Input";
import { FreeDeliveryProgress } from "@/components/store/cart/FreeDeliveryProgress";
import { QuantityStepper } from "@/components/store/cart/QuantityStepper";
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
  const [attempt, setAttempt] = useState(0);
  const [applying, setApplying] = useState(false);
  const { catalog, loading } = useCartCatalog(lines);
  const summary = summarizeCart(lines, couponDiscount, catalog);

  if (summary.resolved.length === 0 && loading) {
    return null;
  }

  if (summary.resolved.length === 0) {
    return (
      <div className="rounded-theme bg-card p-8 text-center shadow-soft">
        <p className="font-semibold text-ink">{t("empty")}</p>
        <Link href="/shop" className={buttonStyles({ className: "mt-4" })}>
          {t("shop")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <ul className="space-y-3">
        {summary.resolved.map((item) => (
          <li
            key={`${item.line.slug}-${item.line.variantId}`}
            className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-theme bg-card p-3 shadow-soft sm:grid-cols-[88px_minmax(0,1fr)_auto]"
          >
            <ProductMedia
              hue={item.variant.imageHue}
              name={item.product.name}
              image={productImage(item.product, item.variant)}
              className="h-18 rounded-theme sm:h-22"
            />
            <div className="min-w-0">
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
            <p className="col-span-2 text-sm font-semibold sm:col-span-1 sm:text-right">
              {formatTaka(item.unitPrice * item.line.qty)}
            </p>
          </li>
        ))}
      </ul>
      <aside className="h-fit rounded-theme bg-card p-4 shadow-soft lg:sticky lg:top-28">
        <h2 className="font-heading font-semibold text-ink">{t("total")}</h2>
        <FreeDeliveryProgress
          merchandise={summary.merchandise}
          className="mt-3 rounded-theme bg-peach p-3"
        />
        <ShakeOnError trigger={error ? `${error}-${attempt}` : null} className="mt-4">
          <form
            className="flex items-start gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setApplying(true);
              applyCoupon(code)
                .then((message) => {
                  setError(message);
                  setAttempt((value) => value + 1);
                  if (!message) {
                    push(toast("coupon"));
                  }
                })
                .finally(() => setApplying(false));
            }}
          >
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder={t("coupon")}
              label={t("coupon")}
              hideLabel
              error={error ?? undefined}
              containerClassName="min-w-0 flex-1"
            />
            <Button type="submit" variant="outline" isLoading={applying}>
              {t("apply")}
            </Button>
          </form>
        </ShakeOnError>
        {couponCode ? (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 -ms-3 text-primary"
            onClick={clearCoupon}
          >
            {t("remove")} {couponCode}
          </Button>
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
          <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-semibold">
            <dt>{t("total")}</dt>
            <dd>{formatTaka(summary.merchandise)}</dd>
          </div>
        </dl>
        <Link
          href="/checkout"
          className={buttonStyles({ size: "lg", className: "mt-4 w-full" })}
        >
          {t("checkout")}
        </Link>
      </aside>
    </div>
  );
}
