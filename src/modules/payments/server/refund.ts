import type { Payment, Prisma } from "@prisma/client";
import { transitionPayment } from "@/modules/payments/server/transition";

export class InvalidRefundError extends Error {}

/**
 * Refunds (fully or partially) a paid payment. `refundedAmount` tracks the
 * running total separately from `status` so a second or third partial
 * refund while already `PARTIALLY_REFUNDED` is a plain amount update, not
 * an illegal same-status "transition" (state-machine.ts rejects those by
 * definition). Only crossing into `PARTIALLY_REFUNDED` the first time, or
 * topping up to `REFUNDED`, goes through `transitionPayment`.
 *
 * Must run inside the caller's own transaction, same as `transitionPayment`.
 */
export async function refundPayment(
  tx: Prisma.TransactionClient,
  payment: Payment,
  amount: number,
  note: string | null,
): Promise<Payment> {
  if (payment.status !== "PAID" && payment.status !== "PARTIALLY_REFUNDED") {
    throw new InvalidRefundError(
      `Cannot refund a payment that is ${payment.status}, not PAID or PARTIALLY_REFUNDED`,
    );
  }
  if (amount <= 0) {
    throw new InvalidRefundError("Refund amount must be greater than zero");
  }
  const already = payment.refundedAmount.toNumber();
  const total = payment.amount.toNumber();
  const nextRefunded = already + amount;
  if (nextRefunded > total + 0.005) {
    throw new InvalidRefundError(
      `Refunding ${amount} would exceed the payment's total of ${total} (already refunded: ${already})`,
    );
  }
  const nextStatus = nextRefunded >= total - 0.005 ? "REFUNDED" : "PARTIALLY_REFUNDED";

  if (nextStatus === payment.status) {
    // Another partial refund while already PARTIALLY_REFUNDED — amount-only
    // update, with its own history row so the running total is auditable.
    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: { refundedAmount: nextRefunded },
    });
    await tx.paymentStatusHistory.create({
      data: {
        paymentId: payment.id,
        status: nextStatus,
        note: note?.trim() || `Refunded an additional ${amount}`,
      },
    });
    return updated;
  }

  const withAmount = await tx.payment.update({
    where: { id: payment.id },
    data: { refundedAmount: nextRefunded },
  });
  return transitionPayment(
    tx,
    withAmount,
    nextStatus,
    note ?? `Refunded ${amount}${nextStatus === "REFUNDED" ? " (in full)" : ""}`,
  );
}
