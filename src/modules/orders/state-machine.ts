import type { OrderStatus } from "@prisma/client";

// The pre-delivery pipeline, in order. Generated forward-jump transitions
// below let an admin or an automated integration (courier booking, a
// courier webhook reporting "delivered" with no intermediate "shipped"
// update ever recorded) skip straight from an early stage to a later one
// — real courier integrations don't reliably fire every intermediate
// status, and that's an operational convenience, not a correctness risk:
// stock stays held throughout every one of these stages, so skipping ahead
// never double-counts or under-counts it. What the graph still forbids
// absolutely is going *backward*, or out of a terminal/released state —
// that's the actual bug ADR 0012's research found (a DELIVERED order could
// be set back to PENDING with zero validation).
const PIPELINE: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "READY_TO_SHIP",
  "SENT_TO_COURIER",
  "SHIPPED",
];

function forwardJumps(from: OrderStatus): OrderStatus[] {
  const index = PIPELINE.indexOf(from);
  return PIPELINE.slice(index + 1);
}

/**
 * The explicit transition graph the master plan's §5.4 asks for. The DB
 * enum (`prisma/schema.prisma`) already covers every state the plan lists
 * (its "handed_to_courier"/"in_transit" map to SENT_TO_COURIER/SHIPPED) —
 * this file is what used to be missing: before Phase 3, any status could
 * move to any other status through `setOrderStatus()` with zero
 * transition-legality checks. The post-delivery branch (DELIVERED onward)
 * is a judgment call where the plan only gives a flat list of states,
 * documented inline per branch.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [...forwardJumps("PENDING"), "ON_HOLD", "CANCELLED", "FAILED"],
  CONFIRMED: [...forwardJumps("CONFIRMED"), "ON_HOLD", "CANCELLED"],
  PROCESSING: [...forwardJumps("PROCESSING"), "ON_HOLD", "CANCELLED"],
  READY_TO_SHIP: [...forwardJumps("READY_TO_SHIP"), "ON_HOLD", "CANCELLED"],
  SENT_TO_COURIER: [...forwardJumps("SENT_TO_COURIER"), "ON_HOLD"],
  SHIPPED: ["DELIVERED", "PARTIAL_DELIVERED", "RETURNED", "ON_HOLD"],
  // ON_HOLD is a parking state, not tied to one prior step — an admin can
  // resume it anywhere in the pre-shipment pipeline or cancel outright.
  ON_HOLD: ["CONFIRMED", "PROCESSING", "READY_TO_SHIP", "SENT_TO_COURIER", "CANCELLED"],
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
