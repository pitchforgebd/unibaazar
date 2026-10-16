import type { Metadata } from "next";
import { OrdersDenied } from "@/components/admin/orders/OrdersDenied";
import { OrdersNav } from "@/components/admin/orders/OrdersNav";
import { ordersAccess } from "@/server/admin/access";
import { listAbandonedCarts } from "@/server/admin/orders-admin";

export const metadata: Metadata = { title: "Abandoned orders" };

export default async function AbandonedOrdersPage() {
  const session = await ordersAccess();
  if (!session) {
    return <OrdersDenied />;
  }
  const carts = await listAbandonedCarts();
  return (
    <div className="space-y-4">
      <OrdersNav />
      <h1 className="text-2xl font-bold text-ink">Abandoned carts</h1>
      <p className="text-sm text-muted">
        Open carts that still have items and were not checked out.
      </p>
      {carts.length === 0 ? (
        <p className="rounded-lg bg-card p-6 text-sm text-muted shadow-soft">
          No abandoned carts.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
          <table className="min-w-[640px] w-full text-left text-sm">
            <thead className="border-b border-black/5 text-muted">
              <tr>
                <th className="px-3 py-3 font-semibold">Customer</th>
                <th className="px-3 py-3 font-semibold">Updated</th>
                <th className="px-3 py-3 font-semibold">Items</th>
              </tr>
            </thead>
            <tbody>
              {carts.map((cart) => (
                <tr key={cart.id} className="border-b border-black/5 last:border-0">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-ink">{cart.who}</p>
                    <p className="text-xs text-muted">{cart.phone || "No phone"}</p>
                  </td>
                  <td className="px-3 py-3">{cart.updatedAt}</td>
                  <td className="px-3 py-3">
                    {cart.lines.map((line) => (
                      <p key={`${cart.id}-${line.sku}`}>
                        {line.qty} × {line.name} ({line.sku})
                      </p>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
