import type { Metadata } from "next";
import { OrdersDenied } from "@/components/admin/orders/OrdersDenied";
import { OrdersNav } from "@/components/admin/orders/OrdersNav";
import { TemplateForm } from "@/components/admin/orders/TemplateForm";
import { ordersAccess } from "@/server/admin/access";
import { loadNotifyTemplates } from "@/server/admin/notify";

export const metadata: Metadata = { title: "Order templates" };

export default async function OrderTemplatesPage() {
  const session = await ordersAccess();
  if (!session) {
    return <OrdersDenied />;
  }
  const templates = await loadNotifyTemplates();
  return (
    <div className="space-y-4">
      <OrdersNav />
      <TemplateForm templates={templates} />
    </div>
  );
}
