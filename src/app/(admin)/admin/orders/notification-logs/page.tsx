import type { Metadata } from "next";
import { OrdersDenied } from "@/components/admin/orders/OrdersDenied";
import { OrdersNav } from "@/components/admin/orders/OrdersNav";
import { NotificationLogPanel } from "@/components/admin/orders/NotificationLogPanel";
import { ordersAccess } from "@/server/admin/access";
import { listEmailLogs, listSmsLogs } from "@/server/admin/notify";

export const metadata: Metadata = { title: "Notification logs" };

export default async function NotificationLogsPage() {
  const session = await ordersAccess();
  if (!session) {
    return <OrdersDenied />;
  }
  const [sms, email] = await Promise.all([listSmsLogs(), listEmailLogs()]);
  return (
    <div className="space-y-4">
      <OrdersNav />
      <NotificationLogPanel sms={sms} email={email} />
    </div>
  );
}
