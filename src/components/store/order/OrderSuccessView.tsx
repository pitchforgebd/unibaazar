"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { CircleCheck, MapPin, PackageSearch } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { PageTitle } from "@/components/store/common/PageTitle";
import { OrderTimeline } from "@/components/store/account/OrderTimeline";
import { findPlacedOrder } from "@/lib/orders/session";
import { trackPurchase } from "@/lib/tracking/events";
import { formatTaka } from "@/lib/utils/currency";
import type { Order } from "@/types/catalog";

const cardClass = "rounded-theme bg-card p-5 shadow-soft sm:p-6";
const headingClass = "font-heading text-lg font-semibold text-ink";

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
          <Link href="/shop" className={buttonStyles()}>
            {t("backToShop")}
          </Link>
        </Container>
      </>
    );
  }

  const trackHref = `/track-order?order=${order.id}&phone=${order.phone}`;

  return (
    <>
      <PageTitle
        title={t("placedTitle")}
        subtitle={t("placedSubtitle", { id: order.id })}
        crumbs={[{ href: "/", label: common("home") }, { label: t("placedCrumb") }]}
      />
      <Container className="space-y-6 py-6">
        <Reveal direction="none" amount={0}>
          <section
            aria-labelledby="order-success-heading"
            className={`${cardClass} flex flex-col items-center gap-3 text-center`}
          >
            <span className="flex size-16 animate-pop-in items-center justify-center rounded-full bg-success/10 ring-8 ring-success/5 motion-reduce:animate-none">
              <CircleCheck aria-hidden="true" className="size-9 text-success" />
            </span>
            <h2
              id="order-success-heading"
              className="font-heading text-2xl font-bold text-ink"
            >
              {t("successHeading", { name: order.name })}
            </h2>
            <p className="max-w-prose text-sm text-muted">{t("successIntro")}</p>
            <dl className="mt-1 flex flex-wrap justify-center gap-2 text-sm">
              <div className="flex gap-1.5 rounded-full bg-page px-3 py-1">
                <dt className="text-muted">{t("orderIdLabel")}</dt>
                <dd className="font-semibold text-ink">{order.id}</dd>
              </div>
              {order.trackingId ? (
                <div className="flex gap-1.5 rounded-full bg-page px-3 py-1">
                  <dt className="text-muted">{t("trackingLabel")}</dt>
                  <dd className="font-semibold text-ink">{order.trackingId}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Link href={trackHref} className={buttonStyles({ size: "lg" })}>
                <PackageSearch aria-hidden="true" className="size-5" />
                {t("trackNow")}
              </Link>
              <Link
                href="/shop"
                className={buttonStyles({ variant: "outline", size: "lg" })}
              >
                {t("continueShopping")}
              </Link>
            </div>
          </section>
        </Reveal>
        <Stagger className="grid gap-6 lg:grid-cols-2">
          <StaggerItem>
            <section className={cardClass}>
              <h2 className={headingClass}>{t("summaryHeading")}</h2>
              <ul className="mt-4 space-y-3 text-sm">
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
                <Row label={t("delivery")}>
                  {order.deliveryCharge === 0
                    ? t("deliveryFree")
                    : formatTaka(order.deliveryCharge)}
                </Row>
                <Row label={t("paymentLabel")}>{paymentLabels[order.paymentMethod]}</Row>
                <div className="flex items-baseline justify-between border-t border-ink/10 pt-3">
                  <dt className="font-heading text-base font-semibold text-ink">
                    {t("total")}
                  </dt>
                  <dd className="font-heading text-xl font-bold text-ink tabular-nums">
                    {formatTaka(order.total)}
                  </dd>
                </div>
              </dl>
            </section>
          </StaggerItem>
          <StaggerItem className="space-y-6">
            {order.timeline.length > 0 ? (
              <section className={cardClass}>
                <h2 className={headingClass}>{t("timelineHeading")}</h2>
                <div className="mt-4">
                  <OrderTimeline steps={order.timeline} />
                </div>
              </section>
            ) : null}
            <section className={cardClass}>
              <h2 className={`${headingClass} flex items-center gap-2`}>
                <MapPin aria-hidden="true" className="size-5 text-primary" />
                {t("deliverToHeading")}
              </h2>
              <address className="mt-3 text-sm leading-relaxed text-foreground not-italic">
                <span className="font-semibold text-ink">{order.name}</span>
                <br />
                {order.phone}
                <br />
                {order.address}
              </address>
            </section>
          </StaggerItem>
        </Stagger>
      </Container>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink">{children}</dd>
    </div>
  );
}
