import { prisma } from "@/lib/db";
import { resolveProvider } from "@/lib/payment";
import { sslcommerzProvider } from "@/lib/payment/sslcommerz";
import { normalizeBdPhone } from "@/lib/validation/customer";
import { setOrderStatus } from "@/server/admin/orders-admin";
import { recordAudit } from "@/server/security/audit";
import { signaturesMatch } from "@/server/security/signature";
import { ApiError } from "@/server/http";
import { canTransition, claimWebhookEvent, transitionPayment } from "@/modules/payments";
import type { Prisma } from "@prisma/client";

function webhookSecret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET is required");
  }
  return value;
}

export async function initiatePayment(orderNumber: string, phoneInput: string) {
  const phone = normalizeBdPhone(phoneInput);
  if (!phone) {
    throw new ApiError(400, "Enter a valid Bangladeshi mobile number");
  }
  const order = await prisma.order.findFirst({
    where: { number: orderNumber, phone },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order) {
    throw new ApiError(404, "No order matches that ID and phone");
  }
  const payment = order.payments[0];
  const provider = resolveProvider(order.paymentMethod);
  const result = await provider.initiate({
    orderNumber: order.number,
    amount: order.total.toNumber(),
    customerName: order.name,
    customerPhone: order.phone,
    customerEmail: order.email,
    customerAddress: order.addressLine,
  });
  if (payment && result.kind === "redirect") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayRef: result.gatewayRef,
        payload: result.raw as Prisma.InputJsonValue,
      },
    });
  }
  return {
    orderNumber: order.number,
    method: order.paymentMethod.toLowerCase(),
    status: payment?.status ?? "PENDING",
    message:
      result.kind === "instructions"
        ? result.message
        : "Redirecting to the payment gateway",
    redirectUrl: result.kind === "redirect" ? result.redirectUrl : undefined,
  };
}

/** Applies a status to the order's current payment, going through the
 * governed state machine. If the move isn't legal from the payment's
 * current status (e.g. a second IPN arrives after the order's already
 * PAID, or after an admin already marked it REFUNDED), this is a no-op
 * that records why rather than silently overwriting a later, more
 * authoritative status — the same graceful-rejection shape
 * `setOrderStatus`/`setPaymentStatus` already use. */
async function applyPaymentResult(
  orderId: string,
  paymentId: string,
  to: "PAID" | "FAILED",
  gatewayRef: string,
  payload: unknown,
  auditAction: string,
  auditMetadata: Record<string, unknown>,
): Promise<"PAID" | "FAILED" | string> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (!canTransition(payment.status, to)) {
      await recordAudit({
        action: `${auditAction}.rejected`,
        entityType: "Order",
        entityId: orderId,
        metadata: { ...auditMetadata, from: payment.status, attempted: to },
      });
      return payment.status;
    }
    const withGatewayData = await tx.payment.update({
      where: { id: paymentId },
      data: { gatewayRef, payload: payload as Prisma.InputJsonValue },
    });
    await transitionPayment(tx, withGatewayData, to, `Gateway reported: ${to}`);
    await recordAudit({
      action: auditAction,
      entityType: "Order",
      entityId: orderId,
      metadata: { ...auditMetadata, status: to },
    });
    return to;
  });
}

export async function applySslcommerzIpn(fields: Record<string, string>) {
  const order = await prisma.order.findUnique({
    where: { number: fields.tran_id },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order || !order.payments[0]) {
    throw new ApiError(404, "Payment not found");
  }
  const payment = order.payments[0];
  if (payment.status === "PAID") {
    return { orderNumber: order.number, status: payment.status };
  }
  // Idempotency guard: a duplicate delivery of the same val_id (gateway
  // retry, or a replayed request) is rejected here, before the live
  // validator-API round-trip below, and before any Payment/Order write —
  // the per-status "already PAID" check above can't by itself guarantee
  // that under two concurrent deliveries of the same event.
  const eventKey = fields.val_id || fields.tran_id;
  const firstDelivery = await claimWebhookEvent(prisma, "sslcommerz", eventKey);
  if (!firstDelivery) {
    return { orderNumber: order.number, status: payment.status };
  }
  const verified = await sslcommerzProvider.verifyIPN(fields);
  const amountMatches =
    verified.amount === undefined ||
    Math.abs(verified.amount - order.total.toNumber()) <= 0.5;
  const transactionMatches = verified.transactionId === order.number;
  if (verified.valid && !(amountMatches && transactionMatches)) {
    const status = await applyPaymentResult(
      order.id,
      payment.id,
      "FAILED",
      verified.gatewayRef,
      verified.raw,
      "payment.ipn.mismatch",
      {
        claimedTransactionId: verified.transactionId,
        claimedAmount: verified.amount ?? null,
        orderNumber: order.number,
        orderTotal: order.total.toNumber(),
      },
    );
    return { orderNumber: order.number, status };
  }
  if (verified.valid) {
    const status = await applyPaymentResult(
      order.id,
      payment.id,
      "PAID",
      verified.gatewayRef,
      verified.raw,
      "payment.ipn",
      { gatewayRef: verified.gatewayRef },
    );
    if (status === "PAID" && order.status === "PENDING") {
      await setOrderStatus(
        null,
        order.id,
        "CONFIRMED",
        `SSLCommerz: payment verified (val_id ${verified.gatewayRef})`,
      );
    }
    return { orderNumber: order.number, status };
  }
  const status = await applyPaymentResult(
    order.id,
    payment.id,
    "FAILED",
    verified.gatewayRef,
    verified.raw,
    "payment.ipn",
    { gatewayRef: verified.gatewayRef },
  );
  return { orderNumber: order.number, status };
}

export async function applyPaymentCallback(input: {
  secret: string | null;
  orderNumber: string;
  gatewayRef: string;
  status: "PAID" | "FAILED";
}) {
  if (!signaturesMatch(input.secret, webhookSecret())) {
    throw new ApiError(401, "Invalid webhook signature");
  }
  const order = await prisma.order.findUnique({
    where: { number: input.orderNumber },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order || !order.payments[0]) {
    throw new ApiError(404, "Payment not found");
  }
  const firstDelivery = await claimWebhookEvent(prisma, "generic", input.gatewayRef);
  if (!firstDelivery) {
    return { orderNumber: order.number, status: order.payments[0].status };
  }
  const status = await applyPaymentResult(
    order.id,
    order.payments[0].id,
    input.status,
    input.gatewayRef,
    null,
    "payment.callback",
    { gatewayRef: input.gatewayRef },
  );
  return {
    orderNumber: order.number,
    status,
    gatewayRef: input.gatewayRef,
  };
}

export async function verifyPayment(orderNumber: string) {
  const payment = await prisma.payment.findFirst({
    where: { order: { number: orderNumber } },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }
  return {
    orderNumber,
    method: payment.method.toLowerCase(),
    status: payment.status,
    amount: payment.amount.toNumber(),
    gatewayRef: payment.gatewayRef,
  };
}
