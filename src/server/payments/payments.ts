import { prisma } from "@/lib/db";
import { resolveProvider } from "@/lib/payment";
import { sslcommerzProvider } from "@/lib/payment/sslcommerz";
import { normalizeBdPhone } from "@/lib/validation/customer";
import { setOrderStatus } from "@/server/admin/orders-admin";
import { recordAudit } from "@/server/security/audit";
import { signaturesMatch } from "@/server/security/signature";
import { ApiError } from "@/server/http";
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
  const verified = await sslcommerzProvider.verifyIPN(fields);
  const amountMatches =
    verified.amount === undefined ||
    Math.abs(verified.amount - order.total.toNumber()) <= 0.5;
  const transactionMatches = verified.transactionId === order.number;
  if (verified.valid && !(amountMatches && transactionMatches)) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", payload: verified.raw as Prisma.InputJsonValue },
    });
    await recordAudit({
      action: "payment.ipn.mismatch",
      entityType: "Order",
      entityId: order.id,
      metadata: {
        gatewayRef: verified.gatewayRef,
        claimedTransactionId: verified.transactionId,
        claimedAmount: verified.amount ?? null,
        orderNumber: order.number,
        orderTotal: order.total.toNumber(),
      },
    });
    return { orderNumber: order.number, status: "FAILED" };
  }
  if (verified.valid) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        gatewayRef: verified.gatewayRef,
        payload: verified.raw as Prisma.InputJsonValue,
      },
    });
    if (order.status === "PENDING") {
      await setOrderStatus(
        null,
        order.id,
        "CONFIRMED",
        `SSLCommerz: payment verified (val_id ${verified.gatewayRef})`,
      );
    }
    await recordAudit({
      action: "payment.ipn",
      entityType: "Order",
      entityId: order.id,
      metadata: { gatewayRef: verified.gatewayRef, status: "PAID" },
    });
    return { orderNumber: order.number, status: "PAID" };
  }
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED", payload: verified.raw as Prisma.InputJsonValue },
  });
  await recordAudit({
    action: "payment.ipn",
    entityType: "Order",
    entityId: order.id,
    metadata: { gatewayRef: verified.gatewayRef, status: "FAILED" },
  });
  return { orderNumber: order.number, status: "FAILED" };
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
  const payment = await prisma.payment.update({
    where: { id: order.payments[0].id },
    data: {
      status: input.status,
      gatewayRef: input.gatewayRef,
    },
  });
  await recordAudit({
    action: "payment.callback",
    entityType: "Order",
    entityId: order.id,
    metadata: { gatewayRef: input.gatewayRef, status: input.status },
  });
  return {
    orderNumber: order.number,
    status: payment.status,
    gatewayRef: payment.gatewayRef,
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
