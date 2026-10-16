import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminBreadcrumb } from "@/components/admin/common/AdminBreadcrumb";
import { OrderDetail } from "@/components/admin/orders/OrderDetail";
import { OrdersDenied } from "@/components/admin/orders/OrdersDenied";
import { OrdersNav } from "@/components/admin/orders/OrdersNav";
import { ordersAccess } from "@/server/admin/access";
import { getAdminOrder } from "@/server/admin/orders-admin";

export const metadata: Metadata = { title: "Order" };

type OrderPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderPage({ params }: OrderPageProps) {
  const session = await ordersAccess();
  if (!session) {
    return <OrdersDenied />;
  }
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) {
    notFound();
  }
  return (
    <div className="space-y-4">
      <AdminBreadcrumb
        items={[{ label: "Orders", href: "/admin/orders" }, { label: order.number }]}
      />
      <OrdersNav />
      <OrderDetail
        key={`${order.id}-${order.status}-${order.total}-${order.internalNote}`}
        order={order}
      />
    </div>
  );
}
