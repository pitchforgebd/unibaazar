import type { BadgeVariant } from "@/components/ui/Badge";

// Order statuses that represent a closed-out, successful order.
const SUCCESS = new Set(["DELIVERED", "COMPLETED"]);
// Released/terminal statuses that didn't end in a sale — de-emphasized.
const MUTED = new Set(["CANCELLED", "FAILED", "RETURNED", "REFUNDED"]);
// Statuses that need a human to look at the order.
const ATTENTION = new Set(["ON_HOLD", "RETURN_REQUESTED", "PARTIAL_DELIVERED"]);

/** Maps an `OrderStatus` to one of `Badge`'s fixed variants so every status
 * pill on the dashboard (funnel, pending/recent order lists) reads the same
 * way. Takes `string` rather than the Prisma enum since a couple of call
 * sites only have the dashboard's already-stringified order shape. */
export function statusBadgeVariant(status: string): BadgeVariant {
  if (SUCCESS.has(status)) {
    return "success";
  }
  if (MUTED.has(status)) {
    return "outline";
  }
  if (ATTENTION.has(status)) {
    return "accent";
  }
  return "primary";
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}
