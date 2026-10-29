import type { PaymentStatus } from "@prisma/client";

/**
 * The explicit transition graph the master plan's Phase 7 asks for — see
 * `docs/decisions/0018-phase-7-scope-payment-module.md`. Before this,
 * `setPaymentStatus()` (src/server/admin/orders-admin.ts) wrote any status
 * to any other status with zero legality checks, the same ungoverned-status
 * bug ADR 0012/0013 found and fixed for orders ahead of Phase 3.
 *
 * `INITIATED` and `AUTHORIZED` exist in the graph for providers/flows that
 * use them (a direct-gateway integration that creates the Payment row
 * before redirecting, or a two-step authorize-then-capture flow); today's
 * order-creation path creates every Payment row already at `PENDING`
 * (nothing to initiate for COD, and the existing gateway flow redirects
 * synchronously in the same request) — `PENDING` is a valid starting point
 * on its own, not required to be reached via `INITIATED` first.
 */
export const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  INITIATED: ["PENDING", "FAILED", "CANCELLED"],
  PENDING: ["AUTHORIZED", "PAID", "FAILED", "CANCELLED"],
  AUTHORIZED: ["PAID", "FAILED", "CANCELLED"],
  // A second (or third) partial refund while already PARTIALLY_REFUNDED
  // isn't modeled as a transition at all — canTransition() rejects any
  // same-status move by definition. It's a data-only update to
  // `refundedAmount`; see server/refund.ts. Topping a partial refund up to
  // a full refund *is* a real transition, PARTIALLY_REFUNDED -> REFUNDED.
  PAID: ["REFUNDED", "PARTIALLY_REFUNDED"],
  PARTIALLY_REFUNDED: ["REFUNDED"],
  // Not fully terminal: this codebase reuses the same Payment row across
  // retry attempts for one order (the gateway tran_id is the order
  // number, not a per-attempt id — see src/server/orders/orders.ts), so a
  // declined/invalid first attempt needs a real way back to PENDING for
  // the customer's next try, rather than stranding the order on a
  // permanently FAILED payment. Only PENDING is reachable from here —
  // never straight back to PAID/AUTHORIZED — so a retry still has to earn
  // its way through the normal verification path.
  FAILED: ["PENDING"],
  CANCELLED: [],
  REFUNDED: [],
};

export function isTerminal(status: PaymentStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) {
    return false;
  }
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export class IllegalPaymentTransitionError extends Error {
  constructor(
    public readonly from: PaymentStatus,
    public readonly to: PaymentStatus,
  ) {
    super(`Cannot move a payment from ${from} to ${to}`);
    this.name = "IllegalPaymentTransitionError";
  }
}

export function assertTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransition(from, to)) {
    throw new IllegalPaymentTransitionError(from, to);
  }
}
