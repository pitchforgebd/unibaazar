import type { Metadata } from "next";
import { OrderList } from "@/components/admin/orders/OrderList";
import { OrdersDenied } from "@/components/admin/orders/OrdersDenied";
import { OrdersNav } from "@/components/admin/orders/OrdersNav";
import { ordersAccess } from "@/server/admin/access";
import { listAdminOrders, parseOrderListQuery } from "@/server/admin/orders-admin";

export const metadata: Metadata = { title: "Orders" };

type OrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const session = await ordersAccess();
  if (!session) {
    return <OrdersDenied />;
  }
  const query = parseOrderListQuery(await searchParams);
  const list = await listAdminOrders(query);
  return (
    <div className="space-y-4">
      <OrdersNav />
      <OrderList
        rows={list.rows}
        query={query}
        page={list.page}
        pages={list.pages}
        total={list.total}
      />
    </div>
  );
}
