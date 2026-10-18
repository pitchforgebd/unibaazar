"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/controls";
import { isStoredOrder, findPlacedOrder } from "@/lib/orders/session";
import { formatTaka } from "@/lib/utils/currency";
import type { Order } from "@/types/catalog";

export function OrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(findPlacedOrder(id) ?? null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations("orders");

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
    return <p className="rounded-lg bg-card p-5 shadow-soft">{t("detailLoading")}</p>;
  }

  if (!order) {
    return <p className="rounded-lg bg-card p-5 shadow-soft">{t("notOnAccount")}</p>;
  }

  return (
    <article className="rounded-lg bg-card p-5 shadow-soft">
      <h2 className="text-lg font-semibold">{order.id}</h2>
      <p className="text-sm text-muted">
        {order.status} · {t("trackingLabel")} {order.trackingId}
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
      <p className="mt-4 font-semibold">
        {t("totalLabel")}
        {formatTaka(order.total)}
      </p>
      <p className="mt-2 text-sm">{order.address}</p>
      <Link
        href={`/track-order?order=${order.id}&phone=${order.phone}`}
        className={`${buttonClass("ink")} mt-4`}
      >
        {t("trackNow")}
      </Link>
    </article>
  );
}
