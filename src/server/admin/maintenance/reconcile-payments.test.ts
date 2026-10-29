import { describe, expect, it } from "vitest";
import {
  aggregateMismatches,
  type ReconciledPayment,
} from "@/server/admin/maintenance/reconcile-payments";

function payment(overrides: Partial<ReconciledPayment> = {}): ReconciledPayment {
  return {
    id: "pay_1",
    status: "PAID",
    amount: 500,
    refundedAmount: 0,
    order: { id: "order_1", number: "UB1001", total: 500 },
    ...overrides,
  };
}

describe("aggregateMismatches", () => {
  it("finds nothing wrong with a clean, matching payment", () => {
    expect(aggregateMismatches([payment()])).toEqual([]);
  });

  it("flags a payment amount that doesn't match its order total", () => {
    const mismatches = aggregateMismatches([
      payment({ amount: 450, order: { id: "order_1", number: "UB1001", total: 500 } }),
    ]);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].kind).toBe("amount-mismatch");
  });

  it("tolerates a sub-0.5 rounding difference", () => {
    const mismatches = aggregateMismatches([
      payment({ amount: 500.3, order: { id: "order_1", number: "UB1001", total: 500 } }),
    ]);
    expect(mismatches).toEqual([]);
  });

  it("flags a refunded amount that exceeds the payment amount", () => {
    const mismatches = aggregateMismatches([
      payment({ status: "PARTIALLY_REFUNDED", refundedAmount: 600, amount: 500 }),
    ]);
    expect(mismatches).toHaveLength(1);
    expect(mismatches[0].kind).toBe("refund-exceeds-amount");
  });

  it("flags every PAID payment when an order has more than one", () => {
    const mismatches = aggregateMismatches([
      payment({ id: "pay_1" }),
      payment({ id: "pay_2" }),
    ]);
    expect(mismatches.filter((m) => m.kind === "duplicate-paid-payment")).toHaveLength(2);
  });

  it("doesn't flag duplicates across different orders", () => {
    const mismatches = aggregateMismatches([
      payment({ id: "pay_1", order: { id: "order_1", number: "UB1001", total: 500 } }),
      payment({ id: "pay_2", order: { id: "order_2", number: "UB1002", total: 500 } }),
    ]);
    expect(mismatches.filter((m) => m.kind === "duplicate-paid-payment")).toHaveLength(0);
  });

  it("a single payment can trigger more than one mismatch kind at once", () => {
    const mismatches = aggregateMismatches([
      payment({
        status: "PARTIALLY_REFUNDED",
        amount: 450,
        refundedAmount: 600,
        order: { id: "order_1", number: "UB1001", total: 500 },
      }),
    ]);
    expect(mismatches.map((m) => m.kind).sort()).toEqual(
      ["amount-mismatch", "refund-exceeds-amount"].sort(),
    );
  });
});
