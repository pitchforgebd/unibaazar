import type { Metadata } from "next";
import { InventoryDenied } from "@/components/admin/inventory/InventoryDenied";
import { InventoryNav } from "@/components/admin/inventory/InventoryNav";
import { LedgerBoard } from "@/components/admin/inventory/LedgerBoard";
import { catalogAccess } from "@/server/admin/access";
import { listLedger } from "@/server/admin/inventory";

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
      <LedgerBoard rows={rows} sku={sku} />
    </div>
  );
}
