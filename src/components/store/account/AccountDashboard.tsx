"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Package, UserRound, Wallet } from "lucide-react";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { isStoredOrder, readPlacedOrders } from "@/lib/orders/session";
import { formatTaka } from "@/lib/utils/currency";
import type { Order } from "@/types/catalog";
import { OrderListItem } from "./OrderList";

type Account = {
  name: string;
  phone: string;
  email: string;
};

export function AccountDashboard() {
  const [account, setAccount] = useState<Account | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const t = useTranslations("account");
  const ordersT = useTranslations("orders");

  useEffect(() => {
    const placed = readPlacedOrders();
    void (async () => {
      const me = await fetch("/api/v1/auth/me");
      if (!me.ok) {
        setOrders(placed);
        return;
      }
      const meBody: unknown = await me.json();
      const profile =
        typeof meBody === "object" &&
        meBody &&
        "data" in meBody &&
        typeof meBody.data === "object"
          ? meBody.data
          : null;
      if (
        profile &&
        "name" in profile &&
        "phone" in profile &&
        typeof profile.name === "string" &&
        typeof profile.phone === "string"
      ) {
        setAccount({
          name: profile.name,
          phone: profile.phone,
          email:
            "email" in profile && typeof profile.email === "string" ? profile.email : "",
        });
      }
      const list = await fetch("/api/v1/account/orders");
      const listBody: unknown = await list.json().catch(() => null);
      const remote =
        typeof listBody === "object" &&
        listBody &&
        "data" in listBody &&
        Array.isArray(listBody.data)
          ? listBody.data.filter(isStoredOrder)
          : [];
      const ids = new Set(remote.map((order) => order.id));
      setOrders([...placed.filter((order) => !ids.has(order.id)), ...remote]);
    })();
  }, []);

  const spent = orders.reduce((sum, order) => sum + order.total, 0);
  const stats = [
    { label: t("statOrders"), value: String(orders.length), icon: Package },
    { label: t("statSpent"), value: formatTaka(spent), icon: Wallet },
    { label: t("statAddresses"), value: "—", icon: MapPin },
  ];

  return (
    <div className="space-y-4">
      <Reveal>
        <section className="flex items-start gap-4 rounded-theme bg-card p-5 shadow-soft">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-peach text-primary"
          >
            <UserRound className="size-6" />
          </span>
          {account ? (
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-semibold text-ink">
                {t("greeting", { name: account.name })}
              </h2>
              <p className="mt-1 text-sm wrap-break-word text-muted">
                {account.phone}
                {account.email ? ` · ${account.email}` : ""}
              </p>
            </div>
          ) : (
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-semibold text-ink">
                {t("guestHeading")}
              </h2>
              <p className="mt-1 text-sm text-muted">{t("guestIntro")}</p>
              <Link
                href="/login"
                className={buttonStyles({ size: "sm", className: "mt-3" })}
              >
                {t("loginLink")}
              </Link>
            </div>
          )}
        </section>
      </Reveal>
      <Stagger className="grid gap-3 sm:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <StaggerItem
              key={item.label}
              className="rounded-theme bg-card p-4 shadow-soft"
            >
              <p className="flex items-center gap-2 text-sm text-muted">
                <Icon aria-hidden="true" className="size-4" />
                {item.label}
              </p>
              <p className="mt-1 font-heading text-xl font-semibold text-ink tabular-nums">
                {item.value}
              </p>
            </StaggerItem>
          );
        })}
      </Stagger>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold text-ink">
            {t("recentOrdersHeading")}
          </h2>
          {orders.length > 0 ? (
            <Link
              href="/account/orders"
              className={buttonStyles({ variant: "ghost", size: "sm" })}
            >
              {t("viewAllOrders")}
            </Link>
          ) : null}
        </div>
        {orders.length > 0 ? (
          <ul className="space-y-3">
            {orders.slice(0, 3).map((order) => (
              <li key={order.id}>
                <OrderListItem order={order} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-theme bg-card p-5 text-sm text-muted shadow-soft">
            {ordersT("emptySignedIn")}
          </p>
        )}
      </section>
    </div>
  );
}
