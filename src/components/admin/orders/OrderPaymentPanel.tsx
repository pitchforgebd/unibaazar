"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  bookCourierAction,
  paymentAction,
  syncCourierAction,
} from "@/app/(admin)/admin/order-actions";
import { prettyStatus } from "./labels";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToastStore } from "@/store/toast";
import type { AdminOrderDetail } from "@/server/admin/orders-admin";

export function OrderPaymentPanel({ order }: { order: AdminOrderDetail }) {
  const router = useRouter();
  const push = useToastStore((state) => state.push);
  const [paymentPending, setPaymentPending] = useState(false);
  const [courierPending, setCourierPending] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus);

  async function savePayment(): Promise<void> {
    setPaymentPending(true);
    const result = await paymentAction({ orderId: order.id, status: paymentStatus });
    push({ message: result.message, type: result.ok ? "success" : "error" });
    setPaymentPending(false);
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
            {[
              "INITIATED",
              "PENDING",
              "AUTHORIZED",
              "PAID",
              "FAILED",
              "CANCELLED",
              "REFUNDED",
              "PARTIALLY_REFUNDED",
            ].map((item) => (
              <option key={item} value={item}>
                {prettyStatus(item)}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            isLoading={paymentPending}
            onClick={() => void savePayment()}
          >
            Save payment
          </Button>
        </div>
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
    </div>
  );
}
