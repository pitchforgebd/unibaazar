"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { isStoredOrder, readPlacedOrders } from "@/lib/orders/session";
import { formatTaka } from "@/lib/utils/currency";
import type { Order } from "@/types/catalog";

type Account = {
  name: string;
  phone: string;
  email: string;
};

export function AccountDashboard() {
  const [account, setAccount] = useState<Account | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const t = useTranslations("account");

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

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-card p-5 shadow-soft">
        {account ? (
          <>
            <h2 className="text-lg font-semibold">
              {t("greeting", { name: account.name })}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {account.phone}
              {account.email ? ` · ${account.email}` : ""}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">{t("guestHeading")}</h2>
            <p className="mt-1 text-sm text-muted">{t("guestIntro")}</p>
            <Link
              href="/login"
              className="mt-3 inline-block text-sm font-semibold text-primary"
            >
              {t("loginLink")}
            </Link>
          </>
        )}
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t("statOrders"), value: String(orders.length) },
          { label: t("statSpent"), value: formatTaka(spent) },
          { label: t("statAddresses"), value: "—" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-card p-4 shadow-soft">
            <p className="text-sm text-muted">{item.label}</p>
            <p className="mt-1 text-xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      <section className="rounded-lg bg-card p-5 shadow-soft">
        <h2 className="font-semibold">{t("recentOrdersHeading")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {orders.slice(0, 3).map((order) => (
            <li key={order.id} className="flex items-center justify-between gap-3">
              <Link
                href={`/account/orders/${order.id}`}
                className="font-semibold text-primary"
              >
                {order.id}
              </Link>
              <span>{order.status}</span>
              <span>{formatTaka(order.total)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
