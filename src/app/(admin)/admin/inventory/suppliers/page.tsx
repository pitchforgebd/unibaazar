import type { Metadata } from "next";
import { InventoryDenied } from "@/components/admin/inventory/InventoryDenied";
import { InventoryNav } from "@/components/admin/inventory/InventoryNav";
import { SupplierBoard } from "@/components/admin/inventory/SupplierBoard";
import { catalogAccess } from "@/server/admin/access";
import { listSuppliers } from "@/server/admin/inventory";

export const metadata: Metadata = { title: "Suppliers" };

export default async function SuppliersPage() {
  const session = await catalogAccess();
  if (!session) {
    return <InventoryDenied />;
  }
  const rows = await listSuppliers();
  return (
    <div className="space-y-4">
      <InventoryNav />
      <SupplierBoard rows={rows} />
    </div>
  );
}
