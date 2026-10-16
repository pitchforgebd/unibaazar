import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InventoryDenied } from "@/components/admin/inventory/InventoryDenied";
import { InventoryNav } from "@/components/admin/inventory/InventoryNav";
import { PurchaseView } from "@/components/admin/inventory/PurchaseView";
import { catalogAccess } from "@/server/admin/access";
import { getPurchase } from "@/server/admin/inventory";

export const metadata: Metadata = { title: "Purchase" };

type PurchasePageProps = {
  params: Promise<{ id: string }>;
};

export default async function PurchasePage({ params }: PurchasePageProps) {
  const session = await catalogAccess();
  if (!session) {
    return <InventoryDenied />;
  }
  const { id } = await params;
  const purchase = await getPurchase(id);
  if (!purchase) {
    notFound();
  }
  return (
    <div className="space-y-4">
      <InventoryNav />
      <PurchaseView key={`${purchase.id}-${purchase.status}`} purchase={purchase} />
    </div>
  );
}
