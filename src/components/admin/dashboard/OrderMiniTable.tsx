import { Badge } from "@/components/ui/Badge";
import { formatTaka } from "@/lib/utils/currency";
import type { DashboardOrder } from "@/server/admin/dashboard";
import { statusBadgeVariant, statusLabel } from "./statusBadge";

export function OrderMiniTable({
  orders,
  empty,
}: {
  orders: DashboardOrder[];
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
                <span className="font-semibold text-ink">{order.number}</span>
                <span className="block text-xs text-muted">
                  {order.name} · {order.placedAt}
                </span>
              </td>
              <td className="py-2 pr-3">
                <Badge variant={statusBadgeVariant(order.status)}>
                  {statusLabel(order.status)}
                </Badge>
              </td>
              <td className="py-2 text-right font-semibold text-ink">
                {formatTaka(order.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
