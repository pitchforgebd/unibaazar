import { useTranslations } from "next-intl";
import type { BadgeVariant } from "@/components/ui/Badge";
import type { OrderStatus } from "@/types/catalog";

// The server sends statuses (and timeline step labels) as these English
// display strings; this maps each to its `orders.status.*` message key.
const STATUS_KEYS: Record<OrderStatus, string> = {
  Pending: "pending",
  Confirmed: "confirmed",
  Processing: "processing",
  "Ready to ship": "readyToShip",
  "Sent to courier": "sentToCourier",
  Shipped: "shipped",
  Delivered: "delivered",
  Completed: "completed",
  Cancelled: "cancelled",
  "Return requested": "returnRequested",
  Returned: "returned",
  Failed: "failed",
  "On hold": "onHold",
  "Partial delivered": "partialDelivered",
  Refunded: "refunded",
};

function isOrderStatus(value: string): value is OrderStatus {
  return Object.keys(STATUS_KEYS).includes(value);
}

/** Translates a server status string; unknown strings are shown as-is. */
export function useOrderStatusLabel(): (status: string) => string {
  const t = useTranslations("orders");
  return (status) =>
    isOrderStatus(status) ? t(`status.${STATUS_KEYS[status]}`) : status;
}

const SUCCESS: ReadonlySet<OrderStatus> = new Set(["Delivered", "Completed"]);
const ENDED: ReadonlySet<OrderStatus> = new Set([
  "Cancelled",
  "Returned",
  "Failed",
  "Refunded",
]);

export function orderStatusVariant(status: OrderStatus): BadgeVariant {
  if (SUCCESS.has(status)) {
    return "success";
  }
  if (ENDED.has(status)) {
    return "outline";
  }
  return status === "Pending" ? "default" : "primary";
}
