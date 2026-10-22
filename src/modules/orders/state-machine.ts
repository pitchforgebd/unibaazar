import type { OrderStatus } from "@prisma/client";

/**
 * The explicit transition graph the master plan's §5.4 asks for. The DB
 * enum (`prisma/schema.prisma`) already covers every state the plan lists
 * (its "handed_to_courier"/"in_transit" map to SENT_TO_COURIER/SHIPPED) —
 * this file is what used to be missing: before Phase 3, any status could
 * move to any other status through `setOrderStatus()` with zero
 * transition-legality checks (confirmed: a DELIVERED order could be set
 * back to PENDING). The graph below is a judgment call where the plan only
 * gives a flat list of states, documented inline per branch.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "ON_HOLD", "CANCELLED", "FAILED"],
  CONFIRMED: ["PROCESSING", "ON_HOLD", "CANCELLED"],
  PROCESSING: ["READY_TO_SHIP", "ON_HOLD", "CANCELLED"],
  READY_TO_SHIP: ["SENT_TO_COURIER", "ON_HOLD", "CANCELLED"],
  SENT_TO_COURIER: ["SHIPPED", "ON_HOLD"],
  SHIPPED: ["DELIVERED", "PARTIAL_DELIVERED", "RETURNED", "ON_HOLD"],
  // ON_HOLD is a parking state, not tied to one prior step — an admin can
  // resume it anywhere in the pre-shipment pipeline or cancel outright.
  ON_HOLD: ["CONFIRMED", "PROCESSING", "READY_TO_SHIP", "CANCELLED"],
  DELIVERED: ["COMPLETED", "RETURN_REQUESTED"],
  PARTIAL_DELIVERED: ["COMPLETED", "RETURN_REQUESTED"],
  // A completed order can still be returned within a return window —
  // real stores commonly allow this, and nothing in the current code
  // forecloses it.
  COMPLETED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: ["RETURNED", "DELIVERED"], // DELIVERED = admin rejects the return request
  RETURNED: ["REFUNDED"],
  // Terminal: no transitions out.
  CANCELLED: [],
  FAILED: [],
  REFUNDED: [],
};

const RELEASED_STATUSES: OrderStatus[] = ["CANCELLED", "FAILED", "RETURNED", "REFUNDED"];

/** Whether an order in this status currently holds (has decremented) its
 * items' stock — the one side effect every transition needs to reconcile. */
export function holdsStock(status: OrderStatus): boolean {
  return !RELEASED_STATUSES.includes(status);
}

export function isTerminal(status: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) {
    return false;
  }
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export class IllegalTransitionError extends Error {
  constructor(
    public readonly from: OrderStatus,
    public readonly to: OrderStatus,
  ) {
    super(`Cannot move an order from ${from} to ${to}`);
    this.name = "IllegalTransitionError";
  }
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new IllegalTransitionError(from, to);
  }
}
