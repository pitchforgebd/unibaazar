import type { Metadata } from "next";
import { InventoryDenied } from "@/components/admin/inventory/InventoryDenied";
import { InventoryNav } from "@/components/admin/inventory/InventoryNav";
import { PurchaseList } from "@/components/admin/inventory/PurchaseList";
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
      <PurchaseList rows={rows} />
    </div>
  );
}
