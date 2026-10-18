"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/controls";
import { PageTitle } from "@/components/store/common/PageTitle";
import { findPlacedOrder } from "@/lib/orders/session";
import { trackPurchase } from "@/lib/tracking/events";
import { formatTaka } from "@/lib/utils/currency";
import type { Order } from "@/types/catalog";

export function OrderSuccessView({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const tracked = useRef(false);
  const t = useTranslations("orders");
  const checkout = useTranslations("checkout");
  const common = useTranslations("common");
  const paymentLabels: Record<Order["paymentMethod"], string> = {
    cod: checkout("paymentCod"),
    bkash: checkout("paymentBkash"),
    nagad: checkout("paymentNagad"),
    rocket: checkout("paymentRocket"),
    card: checkout("paymentCard"),
  };

  useEffect(() => {
    const next = findPlacedOrder(id) ?? null;
    setOrder(next);
    if (next && !tracked.current) {
      tracked.current = true;
      trackPurchase({ id: next.id, total: next.total });
    }
  }, [id]);

  if (!order) {
    return (
      <>
        <PageTitle title={t("notFoundTitle")} />
        <Container className="py-8">
          <Link href="/shop" className={buttonClass("primary")}>
            {t("backToShop")}
          </Link>
        </Container>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title={t("placedTitle")}
        subtitle={t("placedSubtitle", { id: order.id })}
        crumbs={[{ href: "/", label: common("home") }, { label: t("placedCrumb") }]}
      />
      <Container className="grid gap-6 py-6 lg:grid-cols-2">
        <section className="rounded-lg bg-card p-5 shadow-soft">
          <h2 className="text-lg font-semibold">{t("summaryHeading")}</h2>
          <p className="mt-2 text-sm text-muted">
            {t("trackingIdLabel")}
            <span className="font-semibold text-ink">{order.trackingId}</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {order.items.map((item) => (
              <li key={item.sku} className="flex justify-between gap-3">
                <span>
                  {item.name} × {item.qty}
                </span>
                <span>{formatTaka(item.unitPrice * item.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-black/5 pt-3 text-sm">
            <div className="flex justify-between">
              <dt>{t("delivery")}</dt>
              <dd>
                {order.deliveryCharge === 0
                  ? t("deliveryFree")
                  : formatTaka(order.deliveryCharge)}
              </dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>{t("total")}</dt>
              <dd>{formatTaka(order.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("paymentLabel")}</dt>
              <dd>{paymentLabels[order.paymentMethod]}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-lg bg-card p-5 shadow-soft">
          <h2 className="text-lg font-semibold">{t("deliverToHeading")}</h2>
          <p className="mt-2 text-sm">
            {order.name}
            <br />
            {order.phone}
            <br />
            {order.address}
          </p>
          <Link
            href={`/track-order?order=${order.id}&phone=${order.phone}`}
            className={`${buttonClass("ink")} mt-4`}
          >
            {t("trackNow")}
          </Link>
        </section>
      </Container>
    </>
  );
}
