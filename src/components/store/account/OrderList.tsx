"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ChevronRight, Package } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles, focusRing } from "@/components/ui/buttonStyles";
import { Spinner } from "@/components/ui/Spinner";
import { Stagger, StaggerItem } from "@/components/motion";
import { isStoredOrder, readPlacedOrders } from "@/lib/orders/session";
import { formatTaka } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";
import type { Order } from "@/types/catalog";
import { orderStatusVariant, useOrderStatusLabel } from "./orderStatus";

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(true);
  const t = useTranslations("orders");
  const account = useTranslations("account");

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
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted">
        <Spinner />
        {t("loading")}
      </p>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-theme bg-card p-8 text-center shadow-soft">
        <Package aria-hidden="true" className="size-10 text-muted" />
        <p className="text-sm text-muted">
          {signedIn ? t("emptySignedIn") : t("emptySignedOut")}
        </p>
        <Link href={signedIn ? "/shop" : "/login"} className={buttonStyles()}>
          {signedIn ? t("continueShopping") : account("loginLink")}
        </Link>
      </div>
    );
  }

  return (
    <Stagger as="ul" className="space-y-3">
      {orders.map((order) => (
        <StaggerItem as="li" key={order.id}>
          <OrderListItem order={order} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

/** One order as a whole-card link: ID, date, item count/total and status. */
export function OrderListItem({ order }: { order: Order }) {
  const t = useTranslations("orders");
  const format = useFormatter();
  const statusLabel = useOrderStatusLabel();

  return (
    <Link
      href={`/account/orders/${order.id}`}
      className={cn(
        "group flex items-center gap-3 rounded-theme bg-card p-4 shadow-soft",
        "transition-colors duration-fast ease-standard hover:bg-page motion-reduce:transition-none",
        focusRing,
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-ink">{order.id}</span>
          <Badge variant={orderStatusVariant(order.status)}>
            {statusLabel(order.status)}
          </Badge>
        </span>
        <span className="text-sm text-muted">
          {t("placedOn", {
            date: format.dateTime(new Date(order.placedAt), { dateStyle: "medium" }),
          })}
          {" · "}
          {t("listMeta", { count: order.items.length, total: formatTaka(order.total) })}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-5 shrink-0 text-muted transition-transform duration-fast group-hover:translate-x-0.5 motion-reduce:transition-none rtl:rotate-180"
      />
    </Link>
  );
}
