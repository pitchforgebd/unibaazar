"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { returnAction } from "@/app/(admin)/admin/order-actions";
import { prettyStatus } from "./labels";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToastStore } from "@/store/toast";
import { formatTaka } from "@/lib/utils/currency";
import type { ReturnRow } from "@/server/admin/orders-admin";

export function ReturnsBoard({ rows }: { rows: ReturnRow[] }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [pending, setPending] = useState(false);
  const [refundTarget, setRefundTarget] = useState<ReturnRow | null>(null);
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
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setPending(false);
    setRefundTarget(null);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold text-ink">Returns</h1>
      {rows.length === 0 ? (
        <p className="rounded-theme bg-card p-6 text-sm text-muted shadow-soft">
          No return requests yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-theme bg-card shadow-soft">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="border-b border-ink/10 text-muted">
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
                <tr key={row.id} className="border-b border-ink/10 last:border-0">
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
                    <Input
                      label={`Refund for ${row.orderNumber}`}
                      hideLabel
                      value={amounts[row.id] ?? ""}
                      onChange={(event) =>
                        setAmounts((current) => ({
                          ...current,
                          [row.id]: event.target.value,
                        }))
                      }
                      containerClassName="w-28"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        isLoading={pending}
                        onClick={() => void decide(row.id, "APPROVED")}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        isLoading={pending}
                        onClick={() => void decide(row.id, "REJECTED")}
                      >
                        Reject
                      </Button>
                      <Button isLoading={pending} onClick={() => setRefundTarget(row)}>
                        Refund
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AlertDialog
        open={refundTarget !== null}
        onOpenChange={(open) => !open && setRefundTarget(null)}
        title="Confirm refund"
        description={
          refundTarget
            ? `Refund order ${refundTarget.orderNumber} for ${formatTaka(
                Number(amounts[refundTarget.id] ?? "0") || 0,
              )}? This releases money back to the customer and cannot be undone.`
            : ""
        }
        confirmLabel="Refund"
        cancelLabel="Cancel"
        isLoading={pending}
        loadingLabel="Refunding…"
        onConfirm={() => refundTarget && void decide(refundTarget.id, "REFUNDED")}
      />
    </div>
  );
}
