import { TrafficChart } from "@/components/admin/charts/TrafficChart";
import { LiveVisitors } from "@/components/admin/analytics/LiveVisitors";
import { formatTaka } from "@/lib/utils/currency";
import type { AnalyticsData } from "@/server/admin/analytics";

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-theme bg-card p-4 shadow-soft">
      <h2 className="font-semibold text-ink">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Table({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: (string | number)[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-ink/5 text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-ink/5">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsPanel({
  data,
  liveCount,
}: {
  data: AnalyticsData;
  liveCount: number;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Analytics</h1>
        <p className="text-sm text-muted">
          Last {data.windowDays} days, from this site&rsquo;s own first-party event log —
          not a substitute for Meta/GA4&rsquo;s own dashboards, but doesn&rsquo;t depend
          on a visitor accepting third-party cookies either.
        </p>
      </div>

      <Card title="Visitors right now">
        <LiveVisitors initialCount={liveCount} />
      </Card>

      <Card title="Traffic" subtitle="Page views per day, and the most-visited paths.">
        <TrafficChart data={data.traffic.daily} />
        <div className="mt-4">
          <Table
            columns={["Path", "Views"]}
            rows={data.traffic.topPaths.map((row) => [row.path, row.count])}
            empty="No page views recorded yet."
          />
        </div>
      </Card>

      <Card
        title="Sources"
        subtitle="Orders and revenue by the UTM source active when the order was placed."
      >
        <Table
          columns={["Source", "Orders", "Revenue"]}
          rows={data.sources.map((row) => [
            row.source,
            row.orders,
            formatTaka(row.revenue),
          ])}
          empty="No orders with attribution data in this window."
        />
      </Card>

      <Card
        title="Conversion funnel"
        subtitle="How many of each step fired in the window — not a per-visitor path."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.funnel.map((stage) => (
            <div key={stage.name} className="rounded-theme bg-background p-3 text-center">
              <p className="text-2xl font-bold text-ink">{stage.count}</p>
              <p className="text-xs text-muted">{stage.name}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Product performance"
        subtitle="Views, adds-to-cart, and purchases per product."
      >
        <Table
          columns={["Product", "Views", "Added to cart", "Purchased", "Revenue"]}
          rows={data.products
            .slice(0, 15)
            .map((row) => [
              row.name,
              row.views,
              row.addsToCart,
              row.purchases,
              formatTaka(row.revenue),
            ])}
          empty="No product activity recorded yet."
        />
      </Card>

      <Card title="Search terms" subtitle="Top searches, and ones that found nothing.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink">Top searches</h3>
            <Table
              columns={["Query", "Count"]}
              rows={data.search.top.map((row) => [row.query, row.count])}
              empty="No searches recorded yet."
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink">Zero-result searches</h3>
            <Table
              columns={["Query", "Count"]}
              rows={data.search.zeroResult.map((row) => [row.query, row.count])}
              empty="No zero-result searches — good sign."
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
