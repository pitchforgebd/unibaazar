import type { Metadata } from "next";
import { InventoryDenied } from "@/components/admin/inventory/InventoryDenied";
import { InventoryNav } from "@/components/admin/inventory/InventoryNav";
import { PurchaseForm } from "@/components/admin/inventory/PurchaseForm";
import { catalogAccess } from "@/server/admin/access";
import { listSuppliers } from "@/server/admin/inventory";

export const metadata: Metadata = { title: "New purchase" };

export default async function NewPurchasePage() {
  const session = await catalogAccess();
  if (!session) {
    return <InventoryDenied />;
  }
  const suppliers = await listSuppliers();
  return (
    <div className="space-y-4">
      <InventoryNav />
      <PurchaseForm
        suppliers={suppliers.map((row) => ({ id: row.id, name: row.name }))}
      />
    </div>
  );
}
