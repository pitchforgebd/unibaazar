"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  bookCourierAction,
  paymentAction,
  refundAction,
  syncCourierAction,
} from "@/app/(admin)/admin/order-actions";
import { prettyStatus } from "./labels";
import { AlertDialog } from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatTaka } from "@/lib/utils/currency";
import { useToastStore } from "@/store/toast";
import type { AdminOrderDetail } from "@/server/admin/orders-admin";

const REFUNDABLE_STATUSES = new Set(["PAID", "PARTIALLY_REFUNDED"]);

export function OrderPaymentPanel({ order }: { order: AdminOrderDetail }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [paymentPending, setPaymentPending] = useState(false);
  const [courierPending, setCourierPending] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);
  const remaining = order.paymentAmount - order.paymentRefundedAmount;
  const [refundAmount, setRefundAmount] = useState(remaining.toFixed(2));
  const [refundPending, setRefundPending] = useState(false);
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false);

  async function savePayment(): Promise<void> {
    setPaymentPending(true);
    const result = await paymentAction({ orderId: order.id, status: paymentStatus });
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setPaymentPending(false);
    if (result.ok) {
      router.refresh();
    }
  }

  async function saveRefund(): Promise<void> {
    setRefundPending(true);
    const result = await refundAction({
      orderId: order.id,
      amount: Number(refundAmount),
    });
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setRefundPending(false);
    setRefundConfirmOpen(false);
    if (result.ok) {
      router.refresh();
    }
  }

  async function book(): Promise<void> {
    setCourierPending(true);
    const result = await bookCourierAction(order.id);
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setCourierPending(false);
    if (result.ok) {
      router.refresh();
    }
  }

  async function sync(): Promise<void> {
    setCourierPending(true);
    const result = await syncCourierAction(order.id);
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setCourierPending(false);
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-theme bg-card p-4 shadow-soft">
        <h2 className="font-heading font-semibold text-ink">Payment</h2>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Select
            label="Payment status"
            hideLabel
            value={paymentStatus}
            onChange={(event) =>
              setPaymentStatus(event.target.value as typeof paymentStatus)
            }
            className="max-w-xs"
          >
            {/* REFUNDED/PARTIALLY_REFUNDED are only reachable through the
             * Refund action below, which tracks refundedAmount — picking
             * them here would skip that bookkeeping. */}
            {["INITIATED", "PENDING", "AUTHORIZED", "PAID", "FAILED", "CANCELLED"].map(
              (item) => (
                <option key={item} value={item}>
                  {prettyStatus(item)}
                </option>
              ),
            )}
          </Select>
          <Button
            variant="outline"
            isLoading={paymentPending}
            onClick={() => void savePayment()}
          >
            Save payment
          </Button>
        </div>
        {REFUNDABLE_STATUSES.has(order.paymentStatus) && remaining > 0 ? (
          <div className="mt-4 border-t border-ink/10 pt-4">
            <p className="text-sm text-muted">
              {order.paymentRefundedAmount > 0
                ? `Refunded ${formatTaka(order.paymentRefundedAmount)} of ${formatTaka(order.paymentAmount)} so far.`
                : `Paid ${formatTaka(order.paymentAmount)}.`}
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <Input
                label="Refund amount"
                hideLabel
                type="number"
                min={0.01}
                max={remaining}
                step={0.01}
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                className="max-w-xs"
              />
              <Button
                variant="destructive"
                isLoading={refundPending}
                onClick={() => setRefundConfirmOpen(true)}
              >
                Refund
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <div className="rounded-theme bg-card p-4 shadow-soft">
        <h2 className="font-heading font-semibold text-ink">Steadfast</h2>
        <p className="mt-2 text-sm text-muted">
          {order.shipment
            ? `${order.shipment.courier} · ${order.shipment.consignmentId || "No consignment"} · ${prettyStatus(order.shipment.status)}`
            : "No shipment yet."}
        </p>
        <p className="text-sm text-muted">Tracking {order.trackingId || "—"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button isLoading={courierPending} onClick={() => void book()}>
            Send to Steadfast
          </Button>
          <Button
            variant="outline"
            isLoading={courierPending}
            onClick={() => void sync()}
          >
            Sync status
          </Button>
        </div>
      </div>
      <AlertDialog
        open={refundConfirmOpen}
        onOpenChange={setRefundConfirmOpen}
        title="Confirm refund"
        description={`Refund ${formatTaka(Number(refundAmount) || 0)} to the customer? This cannot be undone from here.`}
        confirmLabel="Refund"
        cancelLabel="Cancel"
        isLoading={refundPending}
        loadingLabel="Refunding…"
        onConfirm={() => void saveRefund()}
      />
    </div>
  );
}
