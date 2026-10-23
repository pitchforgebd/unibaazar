import Link from "next/link";
import { areaLabel, orderStatusVariant, prettyStatus } from "./labels";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { Reveal } from "@/components/motion";
import { formatTaka } from "@/lib/utils/currency";
import type { AdminOrderDetail } from "@/server/admin/orders-admin";
import { OrderItemsPanel } from "./OrderItemsPanel";
import { OrderNotesPanel } from "./OrderNotesPanel";
import { OrderPaymentPanel } from "./OrderPaymentPanel";
import { OrderStatusPanel } from "./OrderStatusPanel";

export function OrderDetail({ order }: { order: AdminOrderDetail }) {
  return (
    <Reveal className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">{order.number}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            {order.placedAt}
            <Badge variant={orderStatusVariant(order.status)}>
              {prettyStatus(order.status)}
            </Badge>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/orders/print?kind=invoice&ids=${order.id}`}
            className={buttonStyles({ variant: "outline" })}
          >
            Invoice
          </Link>
          <Link
            href={`/admin/orders/print/pdf?ids=${order.id}`}
            className={buttonStyles({ variant: "outline" })}
          >
            Invoice PDF
          </Link>
          <Link
            href={`/admin/orders/print?kind=packing&ids=${order.id}`}
            className={buttonStyles({ variant: "outline" })}
          >
            Packing slip
          </Link>
          <Link
            href={`/admin/orders/print?kind=label&ids=${order.id}`}
            className={buttonStyles({ variant: "outline" })}
          >
            Label
          </Link>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-theme bg-card p-4 shadow-soft lg:col-span-2">
          <h2 className="font-heading font-semibold text-ink">Customer</h2>
          <p className="mt-2 text-sm text-ink">{order.name}</p>
          <p className="text-sm text-muted">{order.phone}</p>
          {order.email ? <p className="text-sm text-muted">{order.email}</p> : null}
          <p className="mt-2 text-sm text-ink">{order.address}</p>
          <p className="text-sm text-muted">
            {areaLabel(order.area)} · {prettyStatus(order.paymentMethod)} ·{" "}
            {formatTaka(order.total)}
          </p>
          {order.blacklisted ? (
            <p className="mt-2">
              <Badge variant="outline">Blacklisted customer</Badge>
            </p>
          ) : null}
        </article>
        <article className="rounded-theme bg-card p-4 shadow-soft">
          <h2 className="font-heading font-semibold text-ink">Fraud score</h2>
          <p className="mt-2 text-3xl font-bold text-ink">{order.fraud.score}</p>
          <p className="text-sm font-semibold text-ink">{order.fraud.label}</p>
          <p className="mt-1 text-sm text-muted">{order.fraud.detail}</p>
        </article>
      </section>

      <OrderStatusPanel order={order} />
      <OrderItemsPanel order={order} />

      <section className="grid gap-4 lg:grid-cols-2">
        <OrderNotesPanel order={order} />
        <OrderPaymentPanel order={order} />
      </section>

      {order.returns.length > 0 ? (
        <section className="rounded-theme bg-card p-4 shadow-soft">
          <h2 className="font-heading font-semibold text-ink">Returns</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {order.returns.map((row) => (
              <li key={row.id}>
                <Link href="/admin/orders/returns" className="font-semibold text-primary">
                  {prettyStatus(row.status)}
                </Link>
                <span className="text-muted"> · {row.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-theme bg-card p-4 shadow-soft">
        <h2 className="font-heading font-semibold text-ink">Queued messages</h2>
        {order.notices.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No SMS or email has been queued for this order.
          </p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {order.notices.map((notice, index) => (
              <li key={`${notice.channel}-${notice.at}-${index}`}>
                <span className="font-semibold text-ink">
                  {notice.channel} · {notice.status}
                </span>
                <span className="text-muted"> · {notice.at}</span>
                <p className="text-muted">{notice.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Reveal>
  );
}
