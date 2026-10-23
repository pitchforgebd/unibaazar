import type { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export type PaymentMismatch = {
  orderId: string;
  orderNumber: string;
  paymentId: string;
  kind: "amount-mismatch" | "refund-exceeds-amount" | "duplicate-paid-payment";
  detail: string;
};

export type ReconciledPayment = {
  id: string;
  status: PaymentStatus;
  amount: number;
  refundedAmount: number;
  order: { id: string; number: string; total: number };
};

/**
 * Pure aggregation, separate from the DB fetch below so it's directly
 * unit-testable without touching the database (same split
 * dashboard.ts's bucketStatusFunnel()/reports.ts's
 * aggregateStockValuation() use, from Phase 6).
 *
 * Reconciliation "against stored data" (ADR 0018) — this is not a live
 * poll against a gateway's own transaction API (no credentials to call
 * one with), it's a sanity sweep of what's already in the database:
 * every payment whose amount doesn't match its order's total, every
 * refund total that exceeds what was actually paid, and any order with
 * more than one PAID payment row (which the current one-row-per-order
 * flow should never produce, so it's worth surfacing if it ever does).
 */
export function aggregateMismatches(payments: ReconciledPayment[]): PaymentMismatch[] {
  const mismatches: PaymentMismatch[] = [];
  const paidCountByOrder = new Map<string, number>();

  for (const payment of payments) {
    const { order, amount, refundedAmount } = payment;

    if (Math.abs(amount - order.total) > 0.5) {
      mismatches.push({
        orderId: order.id,
        orderNumber: order.number,
        paymentId: payment.id,
        kind: "amount-mismatch",
        detail: `Payment amount ${amount} does not match order total ${order.total}`,
      });
    }

    if (refundedAmount > amount + 0.005) {
      mismatches.push({
        orderId: order.id,
        orderNumber: order.number,
        paymentId: payment.id,
        kind: "refund-exceeds-amount",
        detail: `Refunded ${refundedAmount} exceeds the payment's amount of ${amount}`,
      });
    }

    if (payment.status === "PAID") {
      paidCountByOrder.set(order.id, (paidCountByOrder.get(order.id) ?? 0) + 1);
    }
  }

  for (const payment of payments) {
    if (payment.status === "PAID" && (paidCountByOrder.get(payment.order.id) ?? 0) > 1) {
      mismatches.push({
        orderId: payment.order.id,
        orderNumber: payment.order.number,
        paymentId: payment.id,
        kind: "duplicate-paid-payment",
        detail: `Order ${payment.order.number} has more than one PAID payment row`,
      });
    }
  }

  return mismatches;
}

export async function reconcilePayments(): Promise<{
  checked: number;
  mismatches: PaymentMismatch[];
}> {
  const rows = await prisma.payment.findMany({
    include: { order: { select: { id: true, number: true, total: true } } },
  });
  const payments: ReconciledPayment[] = rows.map((row) => ({
    id: row.id,
    status: row.status,
    amount: row.amount.toNumber(),
    refundedAmount: row.refundedAmount.toNumber(),
    order: {
      id: row.order.id,
      number: row.order.number,
      total: row.order.total.toNumber(),
    },
  }));
  return { checked: payments.length, mismatches: aggregateMismatches(payments) };
}
