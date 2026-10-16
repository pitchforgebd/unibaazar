"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/controls";
import { PageTitle } from "@/components/store/common/PageTitle";
import { findPlacedOrder } from "@/lib/orders/session";
import { trackPurchase } from "@/lib/tracking/events";
import { formatTaka } from "@/lib/utils/currency";
import type { Order } from "@/types/catalog";

const paymentLabels: Record<Order["paymentMethod"], string> = {
  cod: "Cash on delivery",
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  card: "Card",
};

export function OrderSuccessView({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const tracked = useRef(false);

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
        <PageTitle title="Order not found" />
        <Container className="py-8">
          <Link href="/shop" className={buttonClass("primary")}>
            Back to shop
          </Link>
        </Container>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title="Order placed"
        subtitle={`Order ${order.id}`}
        crumbs={[{ href: "/", label: "Home" }, { label: "Order placed" }]}
      />
      <Container className="grid gap-6 py-6 lg:grid-cols-2">
        <section className="rounded-lg bg-card p-5 shadow-soft">
          <h2 className="text-lg font-semibold">Summary</h2>
          <p className="mt-2 text-sm text-muted">
            Tracking ID <span className="font-semibold text-ink">{order.trackingId}</span>
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
              <dt>Delivery</dt>
              <dd>
                {order.deliveryCharge === 0 ? "Free" : formatTaka(order.deliveryCharge)}
              </dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{formatTaka(order.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Payment</dt>
              <dd>{paymentLabels[order.paymentMethod]}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-lg bg-card p-5 shadow-soft">
          <h2 className="text-lg font-semibold">Deliver to</h2>
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
            Track now
          </Link>
        </section>
      </Container>
    </>
  );
}
