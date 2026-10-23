import type { BadgeVariant } from "@/components/ui/Badge";

export function prettyStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function areaLabel(area: string): string {
  return area === "INSIDE_DHAKA" ? "Inside Dhaka" : "Outside Dhaka";
}

// Mirrors src/components/store/account/orderStatus.ts's orderStatusVariant
// exactly (same success/ended sets, same fallback), just keyed on the
// admin's SCREAMING_SNAKE_CASE OrderStatus enum values instead of the
// storefront's display strings — so a customer and an admin looking at the
// same order see the same badge color.
const SUCCESS = new Set(["DELIVERED", "COMPLETED"]);
const ENDED = new Set(["CANCELLED", "RETURNED", "FAILED", "REFUNDED"]);

export function orderStatusVariant(status: string): BadgeVariant {
  if (SUCCESS.has(status)) {
    return "success";
  }
  if (ENDED.has(status)) {
    return "outline";
  }
  return status === "PENDING" ? "default" : "primary";
}

// Payment status uses the same shape of mapping (paid = success, dead-end
// states = outline, pending = neutral default).
export function paymentStatusVariant(status: string): BadgeVariant {
  if (status === "PAID") {
    return "success";
  }
  if (status === "FAILED" || status === "REFUNDED") {
    return "outline";
  }
  return "default";
}

// Decisions that release money or close an order permanently — these get
// an AlertDialog confirmation before firing, everywhere in the orders
// cluster, even though the actual legality of the transition is still
// enforced server-side by modules/orders/state-machine.ts.
const IRREVERSIBLE_STATUSES = new Set(["CANCELLED", "FAILED", "REFUNDED", "RETURNED"]);

export function isIrreversibleStatus(status: string): boolean {
  return IRREVERSIBLE_STATUSES.has(status);
}
