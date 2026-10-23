"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notesAction } from "@/app/(admin)/admin/order-actions";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useToastStore } from "@/store/toast";
import type { AdminOrderDetail } from "@/server/admin/orders-admin";

export function OrderNotesPanel({ order }: { order: AdminOrderDetail }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [pending, setPending] = useState(false);
  const [customerNote, setCustomerNote] = useState(order.customerNote);
  const [internalNote, setInternalNote] = useState(order.internalNote);

  async function save(): Promise<void> {
    setPending(true);
    const result = await notesAction({ orderId: order.id, customerNote, internalNote });
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setPending(false);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <article className="rounded-theme bg-card p-4 shadow-soft">
      <h2 className="font-heading font-semibold text-ink">Notes</h2>
      <Textarea
        label="Customer note"
        containerClassName="mt-3"
        value={customerNote}
        onChange={(event) => setCustomerNote(event.target.value)}
      />
      <Textarea
        label="Internal note"
        containerClassName="mt-3"
        value={internalNote}
        onChange={(event) => setInternalNote(event.target.value)}
      />
      <Button className="mt-3" isLoading={pending} onClick={() => void save()}>
        Save notes
      </Button>
    </article>
  );
}
