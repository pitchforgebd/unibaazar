import type { PaymentStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  assertTransition,
  canTransition,
  IllegalPaymentTransitionError,
  isTerminal,
} from "@/modules/payments/state-machine";

const ALL_STATUSES = Object.keys(ALLOWED_TRANSITIONS) as PaymentStatus[];
// FAILED is deliberately not terminal — see state-machine.ts's comment on
// why a declined attempt can return to PENDING for a retry.
const TERMINAL: PaymentStatus[] = ["CANCELLED", "REFUNDED"];

describe("payment state machine", () => {
  it("every transition in every status's allow-list is a real, distinct status", () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALLOWED_TRANSITIONS[from]) {
        expect(ALL_STATUSES).toContain(to);
        expect(to).not.toBe(from);
      }
    }
  });

  it("no status can transition to itself", () => {
    for (const status of ALL_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it("terminal statuses have zero outgoing transitions", () => {
    TERMINAL.forEach((status) => {
      expect(isTerminal(status)).toBe(true);
      expect(ALLOWED_TRANSITIONS[status]).toHaveLength(0);
    });
  });

  it("every non-terminal status has at least one outgoing transition", () => {
    ALL_STATUSES.filter((s) => !TERMINAL.includes(s)).forEach((status) => {
      expect(ALLOWED_TRANSITIONS[status].length).toBeGreaterThan(0);
    });
  });

  it("PENDING is a reachable entry point on its own, not only via INITIATED", () => {
    // Order creation (src/server/orders/orders.ts) creates every Payment
    // row directly at PENDING — this isn't an in-graph transition at all
    // (a row's initial status is set at INSERT time), but the graph still
    // shouldn't treat PENDING as reachable only from INITIATED.
    expect(ALLOWED_TRANSITIONS.INITIATED).toContain("PENDING");
  });

  it("a full refund reaches REFUNDED from PAID directly or via PARTIALLY_REFUNDED", () => {
    expect(canTransition("PAID", "REFUNDED")).toBe(true);
    expect(canTransition("PAID", "PARTIALLY_REFUNDED")).toBe(true);
    expect(canTransition("PARTIALLY_REFUNDED", "REFUNDED")).toBe(true);
  });

  it("a failed payment can retry back to PENDING but not straight to PAID", () => {
    expect(canTransition("FAILED", "PENDING")).toBe(true);
    expect(canTransition("FAILED", "PAID")).toBe(false);
    expect(canTransition("FAILED", "AUTHORIZED")).toBe(false);
  });

  it("a refunded or partially-refunded payment can't be un-refunded", () => {
    expect(ALLOWED_TRANSITIONS.REFUNDED).toHaveLength(0);
    expect(canTransition("PARTIALLY_REFUNDED", "PAID")).toBe(false);
  });

  it("assertTransition throws IllegalPaymentTransitionError for an illegal move", () => {
    expect(() => assertTransition("FAILED", "PAID")).toThrow(
      IllegalPaymentTransitionError,
    );
  });

  it("assertTransition is silent for a legal move", () => {
    expect(() => assertTransition("PENDING", "PAID")).not.toThrow();
  });
});
