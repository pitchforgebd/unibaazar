import type { Metadata } from "next";
import { OrdersDenied } from "@/components/admin/orders/OrdersDenied";
import { OrdersNav } from "@/components/admin/orders/OrdersNav";
import { ReturnsBoard } from "@/components/admin/orders/ReturnsBoard";
import { ordersAccess } from "@/server/admin/access";
import { listReturns } from "@/server/admin/orders-admin";

export const metadata: Metadata = { title: "Returns" };

export default async function ReturnsPage() {
  const session = await ordersAccess();
  if (!session) {
    return <OrdersDenied />;
  }
  const rows = await listReturns();
  return (
    <div className="space-y-4">
      <OrdersNav />
      <ReturnsBoard rows={rows} />
    </div>
  );
}
