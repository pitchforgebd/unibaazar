import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { Input } from "@/components/ui/Input";
import type { LedgerRow } from "@/server/admin/inventory";

export function LedgerBoard({ rows, sku }: { rows: LedgerRow[]; sku: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Stock ledger</h1>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <Input label="SKU" name="sku" defaultValue={sku} />
        <Button type="submit">Filter</Button>
        <Link
          href="/admin/inventory/ledger"
          className={buttonStyles({ variant: "outline" })}
        >
          Clear
        </Link>
      </form>
      <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">When</th>
              <th className="px-3 py-3 font-semibold">Product</th>
              <th className="px-3 py-3 font-semibold">Change</th>
              <th className="px-3 py-3 font-semibold">After</th>
              <th className="px-3 py-3 font-semibold">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted">
                  No stock movements yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-black/5 last:border-0">
                  <td className="px-3 py-3">{row.at}</td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-ink">{row.name}</p>
                    <p className="text-xs text-muted">
                      {row.sku}
                      {row.warehouse ? ` · ${row.warehouse}` : ""}
                      {row.note ? ` · ${row.note}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    {row.delta > 0 ? `+${row.delta}` : row.delta}
                  </td>
                  <td className="px-3 py-3">{row.quantityAfter}</td>
                  <td className="px-3 py-3">{row.reason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
