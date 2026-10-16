import type { Metadata } from "next";
import Link from "next/link";
import { InventoryDenied } from "@/components/admin/inventory/InventoryDenied";
import { InventoryNav } from "@/components/admin/inventory/InventoryNav";
import { buttonClass } from "@/components/ui/controls";
import { catalogAccess } from "@/server/admin/access";
import { listPurchases } from "@/server/admin/inventory";

export const metadata: Metadata = { title: "Purchases" };

export default async function PurchasesPage() {
  const session = await catalogAccess();
  if (!session) {
    return <InventoryDenied />;
  }
  const rows = await listPurchases();
  return (
    <div className="space-y-4">
      <InventoryNav />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Purchases</h1>
        <Link href="/admin/inventory/purchases/new" className={buttonClass()}>
          New purchase
        </Link>
      </div>
      <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
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
