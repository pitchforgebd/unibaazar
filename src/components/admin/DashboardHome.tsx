import type { ComponentType, ReactNode } from "react";
import {
  AlertTriangle,
  Clock,
  ListChecks,
  Package,
  Receipt,
  TrendingUp,
  Truck,
  UserPlus,
  Wallet,
  type LucideProps,
  Globe,
} from "lucide-react";
import { RevenueChart } from "@/components/admin/charts/RevenueChart";
import { StatusChart } from "@/components/admin/charts/StatusChart";
import { formatTaka } from "@/lib/utils/currency";
import type { DashboardData } from "@/server/admin/dashboard";

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: ComponentType<LucideProps>;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg bg-card p-4 shadow-soft">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function DashboardHome({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {data.sales.map((item) => (
          <Card key={item.label} title={item.label} icon={Wallet}>
            <p className="text-2xl font-bold text-ink">{formatTaka(item.total)}</p>
            <p className="text-sm text-muted">{item.orders} orders</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Revenue, last 7 days" icon={TrendingUp}>
          <RevenueChart data={data.chart} />
        </Card>
        <Card title="Orders by status" icon={ListChecks}>
          <StatusChart data={data.statuses} />
        </Card>
        <Card title="Top products" icon={Package}>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-muted">No items sold yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.topProducts.map((item) => (
                <li key={item.sku} className="flex justify-between gap-3">
                  <span>
                    {item.name}
                    <span className="block text-xs text-muted">{item.sku}</span>
                  </span>
                  <span className="font-semibold">{item.qty}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Low stock" icon={AlertTriangle}>
          {data.lowStock.length === 0 ? (
            <p className="text-sm text-muted">
              Every variant is above its low-stock line.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.lowStock.map((item) => (
                <li key={item.sku} className="flex justify-between gap-3">
                  <span>
                    {item.name}
                    <span className="block text-xs text-muted">{item.sku}</span>
                  </span>
                  <span className="font-semibold">{item.stock}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Pending orders" icon={Clock}>
          <OrderList orders={data.pending} empty="No pending orders." />
        </Card>
        <Card title="Recent orders" icon={Receipt}>
          <OrderList orders={data.recent} empty="No orders yet." />
        </Card>
        <Card title="New customers, 7 days" icon={UserPlus}>
          <p className="text-2xl font-bold text-ink">{data.newCustomers.count}</p>
          {data.newCustomers.names.length > 0 ? (
            <p className="mt-2 text-sm text-muted">
              {data.newCustomers.names.join(", ")}
            </p>
          ) : null}
        </Card>
        <Card title="Courier success" icon={Truck}>
          <p className="text-2xl font-bold text-ink">
            {data.courierRate === null ? "—" : `${data.courierRate}%`}
          </p>
          <p className="text-sm text-muted">
            Delivered orders divided by delivered plus cancelled, based on Steadfast
            tracking updates.
          </p>
        </Card>
        <Card title="Traffic" icon={Globe}>
          <p className="text-sm text-muted">Page views are not recorded yet.</p>
          <p className="mt-2 text-sm">Purchase events this week: {data.purchaseEvents}</p>
        </Card>
      </div>
    </div>
  );
}

function OrderList({
  orders,
  empty,
}: {
  orders: DashboardData["recent"];
  empty: string;
}) {
  if (orders.length === 0) {
    return <p className="text-sm text-muted">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[280px] text-left text-sm">
        <tbody>
          {orders.map((order) => (
            <tr key={order.number} className="border-t border-black/5 first:border-t-0">
              <td className="py-2 pr-3">
                <span className="font-semibold">{order.number}</span>
                <span className="block text-xs text-muted">
                  {order.name} · {order.placedAt}
                </span>
              </td>
              <td className="py-2 pr-3 text-xs">{order.status.replace(/_/g, " ")}</td>
              <td className="py-2 text-right">{formatTaka(order.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
