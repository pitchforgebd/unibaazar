import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { FieldError } from "@/components/ui/Field";
import type { summarizeCart } from "@/lib/catalog/cart-lines";
import { variantLabel } from "@/lib/catalog/pricing";
import { formatTaka } from "@/lib/utils/currency";

type CheckoutSummaryProps = {
  items: ReturnType<typeof summarizeCart>["resolved"];
  /** Already-formatted amounts — every figure is computed by CheckoutForm
   * from the live quote; this component only lays them out. */
  subtotal: string;
  discount: string;
  delivery: string;
  total: string;
  error: string | null;
  /** The submit button, owned by CheckoutForm. */
  children: ReactNode;
};

export function CheckoutSummary({
  items,
  subtotal,
  discount,
  delivery,
  total,
  error,
  children,
}: CheckoutSummaryProps) {
  const t = useTranslations("checkout");
  return (
    <aside className="h-fit rounded-theme bg-card p-4 shadow-soft sm:p-5 lg:sticky lg:top-24">
      <h2 className="font-heading text-lg font-semibold text-ink">
        {t("orderSummaryHeading")}
      </h2>
      <ul className="mt-4 space-y-3 text-sm">
        {items.map((item) => (
          <li key={item.variant.id} className="flex justify-between gap-3">
            <span className="min-w-0 text-foreground">
              {item.product.name}
              {item.label ? (
                <span className="text-muted"> ({variantLabel(item.variant)})</span>
              ) : null}
              <span className="text-muted"> × {item.line.qty}</span>
            </span>
            <span className="shrink-0 font-medium text-ink tabular-nums">
              {formatTaka(item.unitPrice * item.line.qty)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2 border-t border-ink/10 pt-4 text-sm">
        <SummaryRow label={t("subtotal")}>{subtotal}</SummaryRow>
        <SummaryRow label={t("discount")}>-{discount}</SummaryRow>
        <SummaryRow label={t("delivery")}>{delivery}</SummaryRow>
        <div className="flex items-baseline justify-between border-t border-ink/10 pt-3">
          <dt className="font-heading text-base font-semibold text-ink">{t("total")}</dt>
          <dd className="font-heading text-xl font-bold text-ink tabular-nums">
            {total}
          </dd>
        </div>
      </dl>
      {error ? (
        <div role="alert" className="mt-3">
          <FieldError>{error}</FieldError>
        </div>
      ) : null}
      {children}
    </aside>
  );
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink tabular-nums">{children}</dd>
    </div>
  );
}
