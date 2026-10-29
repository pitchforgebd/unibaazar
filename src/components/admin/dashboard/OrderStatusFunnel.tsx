import { Badge } from "@/components/ui/Badge";
import type { StatusFunnelRow } from "@/server/admin/dashboard";
import { statusBadgeVariant, statusLabel } from "./statusBadge";

/**
 * Today/7d/30d order counts per status — the funnel the master plan's
 * dashboard section asks for, distinct from the all-time "Orders by
 * status" chart. Statuses with zero orders in every window are hidden,
 * the same convention `StatusChart` already uses.
 */
export function OrderStatusFunnel({ rows }: { rows: StatusFunnelRow[] }) {
  const visible = rows.filter((row) => row.today + row.week + row.month > 0);
  if (visible.length === 0) {
    return <p className="text-sm text-muted">No orders in the last 30 days.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead className="text-muted">
          <tr>
            <th className="py-2 pr-3 font-semibold">Status</th>
            <th className="px-3 py-2 text-right font-semibold">Today</th>
            <th className="px-3 py-2 text-right font-semibold">7 days</th>
            <th className="px-3 py-2 text-right font-semibold">30 days</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.status} className="border-t border-black/5 first:border-t-0">
              <td className="py-2 pr-3">
                <Badge variant={statusBadgeVariant(row.status)}>
                  {statusLabel(row.status)}
                </Badge>
              </td>
              <td className="px-3 py-2 text-right font-semibold text-ink">{row.today}</td>
              <td className="px-3 py-2 text-right font-semibold text-ink">{row.week}</td>
              <td className="px-3 py-2 text-right font-semibold text-ink">{row.month}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
