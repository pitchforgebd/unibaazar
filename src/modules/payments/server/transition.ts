import type { Payment, PaymentStatus, Prisma } from "@prisma/client";
import { assertTransition } from "@/modules/payments/state-machine";

/**
 * The one place a payment's status changes — every call site (the admin
 * payment-status override, SSLCommerz IPN, the generic webhook callback,
 * a refund) should go through this instead of writing `Payment.status`
 * directly, so transition legality can never be skipped by a new call
 * site that forgets to check. Must run inside the caller's own
 * transaction — it doesn't open one itself.
 */
export async function transitionPayment(
  tx: Prisma.TransactionClient,
  payment: Payment,
  to: PaymentStatus,
  note: string | null,
): Promise<Payment> {
  assertTransition(payment.status, to);
  const updated = await tx.payment.update({
    where: { id: payment.id },
    data: { status: to },
  });
  await tx.paymentStatusHistory.create({
    data: { paymentId: payment.id, status: to, note: note?.trim() || null },
  });
  return updated;
}
