"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { receivePurchaseAction } from "@/app/(admin)/admin/inventory-actions";
import { buttonClass } from "@/components/ui/controls";
import type { PurchaseDetail } from "@/server/admin/inventory";

export function PurchaseView({ purchase }: { purchase: PurchaseDetail }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const open = purchase.status === "DRAFT" || purchase.status === "ORDERED";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">{purchase.number}</h1>
        <p className="text-sm text-muted">
          {purchase.supplier} · {purchase.status.replaceAll("_", " ").toLowerCase()} ·{" "}
          {purchase.at}
        </p>
        {purchase.notes ? (
          <p className="mt-1 text-sm text-ink">{purchase.notes}</p>
        ) : null}
      </div>
      <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
        <table className="min-w-[560px] w-full text-left text-sm">
          <thead className="border-b border-black/5 text-muted">
            <tr>
              <th className="px-3 py-3 font-semibold">Product</th>
              <th className="px-3 py-3 font-semibold">Qty</th>
              <th className="px-3 py-3 font-semibold">Cost</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items.map((item) => (
              <tr key={item.sku} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-3">
                  <p className="font-semibold text-ink">{item.name}</p>
                  <p className="text-xs text-muted">{item.sku}</p>
                </td>
                <td className="px-3 py-3">{item.qty}</td>
                <td className="px-3 py-3">{item.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open ? (
        <button
          type="button"
          className={buttonClass()}
          disabled={pending}
          onClick={() => {
            setPending(true);
            void receivePurchaseAction({ id: purchase.id }).then((result) => {
              setMessage(result.message);
              setPending(false);
              if (result.ok) {
                router.refresh();
              }
            });
          }}
        >
          Receive into stock
        </button>
      ) : null}
      {message ? <p className="text-sm text-ink">{message}</p> : null}
    </div>
  );
}
