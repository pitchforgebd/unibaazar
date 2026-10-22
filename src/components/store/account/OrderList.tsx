"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { isStoredOrder, readPlacedOrders } from "@/lib/orders/session";
import { formatTaka } from "@/lib/utils/currency";
import type { Order } from "@/types/catalog";

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const t = useTranslations("orders");

  useEffect(() => {
    const placed = readPlacedOrders();
    setOrders(placed);
    void (async () => {
      const response = await fetch("/api/v1/account/orders");
      if (response.status === 401) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      const body: unknown = await response.json().catch(() => null);
      const remote =
        typeof body === "object" && body && "data" in body && Array.isArray(body.data)
          ? body.data.filter(isStoredOrder)
          : [];
      const ids = new Set(remote.map((order) => order.id));
      setOrders([...placed.filter((order) => !ids.has(order.id)), ...remote]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <p className="text-sm text-muted">{t("loading")}</p>;
  }

  if (orders.length === 0) {
    return (
      <p className="rounded-lg bg-card p-5 text-sm text-muted shadow-soft">
        {signedIn ? t("emptySignedIn") : t("emptySignedOut")}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <li key={order.id} className="rounded-lg bg-card p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={`/account/orders/${order.id}`}
              className="font-semibold text-primary"
            >
              {order.id}
            </Link>
            <span className="text-sm">{order.status}</span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {t("listMeta", { count: order.items.length, total: formatTaka(order.total) })}
          </p>
        </li>
      ))}
    </ul>
  );
}
