import type { Metadata } from "next";
import { InventoryDenied } from "@/components/admin/inventory/InventoryDenied";
import { InventoryNav } from "@/components/admin/inventory/InventoryNav";
import { catalogAccess } from "@/server/admin/access";
import { listLedger } from "@/server/admin/inventory";
import { fieldClass, buttonClass } from "@/components/ui/controls";
import Link from "next/link";

export const metadata: Metadata = { title: "Stock ledger" };

type LedgerPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LedgerPage({ searchParams }: LedgerPageProps) {
  const session = await catalogAccess();
  if (!session) {
    return <InventoryDenied />;
  }
  const params = await searchParams;
  const sku = typeof params.sku === "string" ? params.sku : "";
  const rows = await listLedger(sku.trim());
  return (
    <div className="space-y-4">
      <InventoryNav />
      <h1 className="text-2xl font-bold text-ink">Stock ledger</h1>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-ink">SKU</span>
          <input name="sku" defaultValue={sku} className={fieldClass} />
        </label>
        <button type="submit" className={buttonClass()}>
          Filter
        </button>
        <Link href="/admin/inventory/ledger" className={buttonClass("outline")}>
          Clear
        </Link>
      </form>
      <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
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
