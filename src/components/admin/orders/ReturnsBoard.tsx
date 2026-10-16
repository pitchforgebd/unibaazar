"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { returnAction } from "@/app/(admin)/admin/order-actions";
import { prettyStatus } from "@/components/admin/orders/labels";
import { buttonClass, fieldClass } from "@/components/ui/controls";
import { formatTaka } from "@/lib/utils/currency";
import type { ReturnRow } from "@/server/admin/orders-admin";

export function ReturnsBoard({ rows }: { rows: ReturnRow[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      rows.map((row) => [
        row.id,
        row.refundAmount === null ? "" : String(row.refundAmount),
      ]),
    ),
  );

  async function decide(
    id: string,
    status: "APPROVED" | "REJECTED" | "REFUNDED",
  ): Promise<void> {
    setPending(true);
    const result = await returnAction({ id, status, refundAmount: amounts[id] ?? "" });
    setMessage(result.message);
    setPending(false);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Returns</h1>
      {message ? <p className="text-sm text-ink">{message}</p> : null}
      {rows.length === 0 ? (
        <p className="rounded-lg bg-card p-6 text-sm text-muted shadow-soft">
          No return requests yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-card shadow-soft">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="border-b border-black/5 text-muted">
              <tr>
                <th className="px-3 py-3 font-semibold">Order</th>
                <th className="px-3 py-3 font-semibold">Reason</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold">Refund</th>
                <th className="px-3 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-black/5 last:border-0">
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/orders/${row.orderId}`}
                      className="font-semibold text-primary"
                    >
                      {row.orderNumber}
                    </Link>
                    <p className="text-xs text-muted">
                      {row.name} · {row.phone}
                    </p>
                    <p className="text-xs text-muted">{formatTaka(row.orderTotal)}</p>
                  </td>
                  <td className="px-3 py-3">{row.reason}</td>
                  <td className="px-3 py-3">{prettyStatus(row.status)}</td>
                  <td className="px-3 py-3">
                    <input
                      value={amounts[row.id] ?? ""}
                      aria-label={`Refund for ${row.orderNumber}`}
                      onChange={(event) =>
                        setAmounts((current) => ({
                          ...current,
                          [row.id]: event.target.value,
                        }))
                      }
                      className={`${fieldClass} w-28`}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={buttonClass("outline")}
                        disabled={pending}
                        onClick={() => void decide(row.id, "APPROVED")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={buttonClass("outline")}
                        disabled={pending}
                        onClick={() => void decide(row.id, "REJECTED")}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className={buttonClass()}
                        disabled={pending}
                        onClick={() => void decide(row.id, "REFUNDED")}
                      >
                        Refund
                      </button>
                    </div>
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
