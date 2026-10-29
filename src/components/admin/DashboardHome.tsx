import {
  AlertTriangle,
  Clock,
  Globe,
  ListChecks,
  Package,
  Receipt,
  TrendingUp,
  Truck,
  UserPlus,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { RevenueChart } from "@/components/admin/charts/RevenueChart";
import { StatusChart } from "@/components/admin/charts/StatusChart";
import { DashboardCard } from "@/components/admin/dashboard/DashboardCard";
import { OrderMiniTable } from "@/components/admin/dashboard/OrderMiniTable";
import { OrderStatusFunnel } from "@/components/admin/dashboard/OrderStatusFunnel";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { formatTaka } from "@/lib/utils/currency";
import type { DashboardData } from "@/server/admin/dashboard";

export function DashboardHome({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">Dashboard</h1>
      <Stagger className="grid gap-3 sm:grid-cols-3">
        {data.sales.map((item) => (
          <StaggerItem key={item.label}>
            <DashboardCard title={item.label} icon={Wallet}>
              <p className="text-2xl font-bold text-ink">{formatTaka(item.total)}</p>
              <p className="text-sm text-muted">{item.orders} orders</p>
            </DashboardCard>
          </StaggerItem>
        ))}
      </Stagger>
      <Reveal>
        <DashboardCard title="Order status funnel" icon={ListChecks}>
          <p className="mb-3 text-sm text-muted">
            How many orders are sitting in each status, today versus the last 7 and 30
            days.
          </p>
          <OrderStatusFunnel rows={data.statusFunnel} />
        </DashboardCard>
      </Reveal>
      <Stagger className="grid gap-4 lg:grid-cols-2">
        <StaggerItem>
          <DashboardCard title="Revenue, last 7 days" icon={TrendingUp}>
            <RevenueChart data={data.chart} />
          </DashboardCard>
        </StaggerItem>
        <StaggerItem>
          <DashboardCard title="Orders by status" icon={ListChecks}>
            <StatusChart data={data.statuses} />
          </DashboardCard>
        </StaggerItem>
        <StaggerItem>
          <DashboardCard title="Top products" icon={Package}>
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
                    <span className="font-semibold text-ink">{item.qty}</span>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </StaggerItem>
        <StaggerItem>
          <DashboardCard title="Low stock" icon={AlertTriangle}>
            {data.lowStock.length === 0 ? (
              <p className="text-sm text-muted">
                Every variant is above its low-stock line.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.lowStock.map((item) => (
                  <li key={item.sku} className="flex items-center justify-between gap-3">
                    <span>
                      {item.name}
                      <span className="block text-xs text-muted">{item.sku}</span>
                    </span>
                    <Badge variant={item.stock === 0 ? "outline" : "accent"}>
                      {item.stock} left
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </StaggerItem>
        <StaggerItem>
          <DashboardCard title="Pending orders" icon={Clock}>
            <OrderMiniTable orders={data.pending} empty="No pending orders." />
          </DashboardCard>
        </StaggerItem>
        <StaggerItem>
          <DashboardCard title="Recent orders" icon={Receipt}>
            <OrderMiniTable orders={data.recent} empty="No orders yet." />
          </DashboardCard>
        </StaggerItem>
        <StaggerItem>
          <DashboardCard title="New customers, 7 days" icon={UserPlus}>
            <p className="text-2xl font-bold text-ink">{data.newCustomers.count}</p>
            {data.newCustomers.names.length > 0 ? (
              <p className="mt-2 text-sm text-muted">
                {data.newCustomers.names.join(", ")}
              </p>
            ) : null}
          </DashboardCard>
        </StaggerItem>
        <StaggerItem>
          <DashboardCard title="Courier success" icon={Truck}>
            <p className="text-2xl font-bold text-ink">
              {data.courierRate === null ? "—" : `${data.courierRate}%`}
            </p>
            <p className="text-sm text-muted">
              Delivered orders divided by delivered plus cancelled, based on Steadfast
              tracking updates.
            </p>
          </DashboardCard>
        </StaggerItem>
        <StaggerItem>
          <DashboardCard title="Traffic" icon={Globe}>
            <p className="text-sm text-muted">Page views are not recorded yet.</p>
            <p className="mt-2 text-sm text-ink">
              Purchase events this week: {data.purchaseEvents}
            </p>
          </DashboardCard>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
