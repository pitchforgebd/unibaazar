"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setStatusAction } from "@/app/(admin)/admin/order-actions";
import { isIrreversibleStatus, prettyStatus } from "./labels";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToastStore } from "@/store/toast";
import { orderStatuses } from "@/lib/validation/admin-orders";
import type { AdminOrderDetail } from "@/server/admin/orders-admin";

export function OrderStatusPanel({ order }: { order: AdminOrderDetail }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [status, setStatus] = useState(order.status);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function save(): Promise<void> {
    setPending(true);
    const result = await setStatusAction({ orderId: order.id, status, note });
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setPending(false);
    setConfirmOpen(false);
    if (result.ok) {
      router.refresh();
    }
  }

  function onSaveClick(): void {
    if (status !== order.status && isIrreversibleStatus(status)) {
      setConfirmOpen(true);
      return;
    }
    void save();
  }

  return (
    <section className="rounded-theme bg-card p-4 shadow-soft">
      <h2 className="font-heading font-semibold text-ink">Status</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] sm:items-end">
        <Select
          label="New status"
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
        >
          {orderStatuses.map((item) => (
            <option key={item} value={item}>
              {prettyStatus(item)}
            </option>
          ))}
        </Select>
        <Input
          label="Timeline note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Button isLoading={pending} onClick={onSaveClick}>
          Save status
        </Button>
      </div>
      <ol className="mt-4 space-y-2">
        {order.history.map((row) => (
          <li key={row.id} className="text-sm text-ink">
            <span className="font-semibold">{prettyStatus(row.status)}</span>
            <span className="text-muted"> · {row.at}</span>
            {row.note ? <span className="block text-muted">{row.note}</span> : null}
          </li>
        ))}
      </ol>
      <AlertDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm status change"
        description={`Move this order to "${prettyStatus(status)}"? This closes out the order and may not be easily reversible.`}
        confirmLabel="Change status"
        cancelLabel="Cancel"
        isLoading={pending}
        loadingLabel="Saving…"
        onConfirm={() => void save()}
      />
    </section>
  );
}
