import Link from "next/link";
import { buttonStyles } from "@/components/ui/buttonStyles";
import type { PurchaseRow } from "@/server/admin/inventory";

export function PurchaseList({ rows }: { rows: PurchaseRow[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Purchases</h1>
        <Link href="/admin/inventory/purchases/new" className={buttonStyles()}>
          New purchase
        </Link>
      </div>
      <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="min-w-[640px] w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Number</th>
              <th className="px-3 py-3 font-semibold">Supplier</th>
              <th className="px-3 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-muted">
                  No purchases yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-black/5 last:border-0">
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/inventory/purchases/${row.id}`}
                      className="font-semibold text-ink"
                    >
                      {row.number}
                    </Link>
                    <p className="text-xs text-muted">
                      {row.lines} lines · {row.at}
                    </p>
                  </td>
                  <td className="px-3 py-3">{row.supplier}</td>
                  <td className="px-3 py-3">{row.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
