import type { Metadata } from "next";
import { ManualOrderForm } from "@/components/admin/orders/ManualOrderForm";
import { OrdersDenied } from "@/components/admin/orders/OrdersDenied";
import { OrdersNav } from "@/components/admin/orders/OrdersNav";
import { ordersAccess } from "@/server/admin/access";

export const metadata: Metadata = { title: "New order" };

export default async function NewOrderPage() {
  const session = await ordersAccess();
  if (!session) {
    return <OrdersDenied />;
  }
  return (
    <div className="space-y-4">
      <OrdersNav />
      <ManualOrderForm />
    </div>
  );
}
