"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowLeft, PackageSearch } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { Spinner } from "@/components/ui/Spinner";
import { Reveal } from "@/components/motion";
import { isStoredOrder, findPlacedOrder } from "@/lib/orders/session";
import { formatTaka } from "@/lib/utils/currency";
import type { Order } from "@/types/catalog";
import { OrderTimeline } from "./OrderTimeline";
import { orderStatusVariant, useOrderStatusLabel } from "./orderStatus";

const cardClass = "rounded-theme bg-card p-5 shadow-soft";
const headingClass = "font-heading text-base font-semibold text-ink";

export function OrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(findPlacedOrder(id) ?? null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("orders");
  const checkout = useTranslations("checkout");
  const format = useFormatter();
  const statusLabel = useOrderStatusLabel();

  useEffect(() => {
    void (async () => {
      const response = await fetch(`/api/v1/account/orders/${encodeURIComponent(id)}`);
      const body: unknown = await response.json().catch(() => null);
      const remote =
        typeof body === "object" && body && "data" in body && isStoredOrder(body.data)
          ? body.data
          : null;
      setOrder(remote ?? findPlacedOrder(id) ?? null);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <p
        role="status"
        className={`${cardClass} flex items-center gap-2 text-sm text-muted`}
      >
        <Spinner />
        {t("detailLoading")}
      </p>
    );
  }

  if (!order) {
    return (
      <div className={`${cardClass} space-y-3`}>
        <p className="text-sm text-foreground">{t("notOnAccount")}</p>
        <Link href="/account/orders" className={buttonStyles({ variant: "outline" })}>
          <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {t("backToOrders")}
        </Link>
      </div>
    );
  }

  return (
    <Reveal className="space-y-4">
      <header className={`${cardClass} flex flex-wrap items-start justify-between gap-3`}>
        <div className="space-y-1">
          <h2 className="font-heading text-xl font-semibold text-ink">{order.id}</h2>
          <p className="text-sm text-muted">
            {t("placedOn", {
              date: format.dateTime(new Date(order.placedAt), { dateStyle: "medium" }),
            })}
            {order.trackingId ? ` · ${t("trackingLabel")} ${order.trackingId}` : ""}
          </p>
        </div>
        <Badge variant={orderStatusVariant(order.status)}>
          {statusLabel(order.status)}
        </Badge>
      </header>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]">
        <section className={cardClass}>
          <h3 className={headingClass}>{t("itemsHeading")}</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {order.items.map((item) => (
              <li key={item.sku} className="flex justify-between gap-3">
                <span className="min-w-0 text-foreground">
                  {item.name}
                  <span className="text-muted"> × {item.qty}</span>
                </span>
                <span className="shrink-0 font-medium text-ink tabular-nums">
                  {formatTaka(item.unitPrice * item.qty)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-ink/10 pt-4 text-sm">
            <Row label={checkout("subtotal")}>{formatTaka(order.subtotal)}</Row>
            {order.discount > 0 ? (
              <Row label={checkout("discount")}>-{formatTaka(order.discount)}</Row>
            ) : null}
            <Row label={t("delivery")}>
              {order.deliveryCharge === 0
                ? t("deliveryFree")
                : formatTaka(order.deliveryCharge)}
            </Row>
            <div className="flex items-baseline justify-between border-t border-ink/10 pt-3">
              <dt className="font-semibold text-ink">{t("total")}</dt>
              <dd className="font-heading text-lg font-bold text-ink tabular-nums">
                {formatTaka(order.total)}
              </dd>
            </div>
          </dl>
          <h3 className={`${headingClass} mt-6`}>{t("deliverToHeading")}</h3>
          <address className="mt-2 text-sm leading-relaxed text-foreground not-italic">
            {order.address}
          </address>
          <Link
            href={`/track-order?order=${order.id}&phone=${order.phone}`}
            className={buttonStyles({ className: "mt-5" })}
          >
            <PackageSearch aria-hidden="true" className="size-4" />
            {t("trackNow")}
          </Link>
        </section>
        {order.timeline.length > 0 ? (
          <section className={cardClass}>
            <h3 className={headingClass}>{t("timelineHeading")}</h3>
            <div className="mt-4">
              <OrderTimeline steps={order.timeline} />
            </div>
          </section>
        ) : null}
      </div>
    </Reveal>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink tabular-nums">{children}</dd>
    </div>
  );
}
