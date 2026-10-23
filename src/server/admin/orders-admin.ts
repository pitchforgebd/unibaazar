import {
  Prisma,
  type OrderStatus,
  type PaymentStatus,
  type ShipmentStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { barcodeSvg } from "@/lib/utils/barcode";
import { qrSvg } from "@/lib/utils/qr";
import { normalizeBdPhone } from "@/lib/validation/customer";
import { orderStatuses } from "@/lib/validation/admin-orders";
import { quotedDelivery } from "@/server/checkout/quote";
import { bookWithSteadfast, steadfastStatus } from "@/server/admin/courier";
import { queueStatusNotice } from "@/server/admin/notify";
import { recordAudit } from "@/server/security/audit";
import { loadInvoice } from "@/server/settings/store";
import { adjustStock } from "@/modules/inventory";
import { canTransition, holdsStock, transitionOrder } from "@/modules/orders";
import {
  canTransition as canTransitionPayment,
  refundPayment,
  transitionPayment,
} from "@/modules/payments";

const pageSize = 20;

const shipmentStatuses: ShipmentStatus[] = [
  "PENDING",
  "PICKED",
  "IN_TRANSIT",
  "DELIVERED",
  "RETURNED",
  "CANCELLED",
];

export type OrderListQuery = {
  q: string;
  status: string;
  payment: string;
  paymentStatus: string;
  courier: string;
  area: string;
  from: string;
  to: string;
  page: number;
};

export type AdminOrderRow = {
  id: string;
  number: string;
  name: string;
  phone: string;
  total: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  area: string;
  courier: string;
  placedAt: string;
};

export type AdminOrderDetail = {
  id: string;
  number: string;
  trackingId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  area: "INSIDE_DHAKA" | "OUTSIDE_DHAKA";
  paymentMethod: string;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  status: OrderStatus;
  customerNote: string;
  internalNote: string;
  placedAt: string;
  blacklisted: boolean;
  fraud: { score: number; label: string; detail: string };
  items: { id: string; name: string; sku: string; qty: number; unitPrice: number }[];
  history: { id: string; status: string; note: string; at: string }[];
  paymentStatus: PaymentStatus;
  paymentAmount: number;
  paymentRefundedAmount: number;
  shipment: { courier: string; consignmentId: string; status: string } | null;
  invoiceNumber: string;
  returns: { id: string; status: string; reason: string; refundAmount: number | null }[];
  notices: {
    channel: "SMS" | "Email";
    to: string;
    status: string;
    body: string;
    at: string;
  }[];
};

export type AbandonedCartRow = {
  id: string;
  who: string;
  phone: string;
  updatedAt: string;
  lines: { sku: string; name: string; qty: number }[];
};

export type ReturnRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  name: string;
  phone: string;
  status: string;
  reason: string;
  refundAmount: number | null;
  orderTotal: number;
  createdAt: string;
};

export type PrintDocument = {
  id: string;
  kind: "invoice" | "packing" | "label";
  number: string;
  invoiceNumber: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  area: string;
  paymentMethod: string;
  codAmount: number;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  status: string;
  trackingId: string;
  consignmentId: string;
  items: {
    name: string;
    sku: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  barcode: string;
  qr: string;
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function isStatus(value: string): value is OrderStatus {
  return (orderStatuses as readonly string[]).includes(value);
}

function stamp(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(date);
}

function dayBound(value: string, end: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}+06:00`);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function freshNumber(): { number: string; trackingId: string } {
  const digits = String(Math.floor(100000 + Math.random() * 900000));
  return { number: `UB${digits}`, trackingId: `SF${digits}BD` };
}

async function applyStock(
  tx: Prisma.TransactionClient,
  variantId: string | null,
  delta: number,
  note: string,
): Promise<void> {
  if (!variantId) {
    return;
  }
  await adjustStock(tx, variantId, delta, delta > 0 ? "RETURN" : "SALE", note);
}

export function parseOrderListQuery(
  params: Record<string, string | string[] | undefined>,
): OrderListQuery {
  const page = Number(one(params.page));
  return {
    q: one(params.q).trim(),
    status: one(params.status),
    payment: one(params.payment),
    paymentStatus: one(params.paymentStatus),
    courier: one(params.courier),
    area: one(params.area),
    from: one(params.from),
    to: one(params.to),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export async function listAdminOrders(query: OrderListQuery): Promise<{
  rows: AdminOrderRow[];
  total: number;
  page: number;
  pages: number;
}> {
  const where: Prisma.OrderWhereInput = {};
  if (isStatus(query.status)) {
    where.status = query.status;
  }
  if (
    query.payment === "COD" ||
    query.payment === "BKASH" ||
    query.payment === "NAGAD" ||
    query.payment === "ROCKET" ||
    query.payment === "CARD"
  ) {
    where.paymentMethod = query.payment;
  }
  if (
    query.paymentStatus === "INITIATED" ||
    query.paymentStatus === "PENDING" ||
    query.paymentStatus === "AUTHORIZED" ||
    query.paymentStatus === "PAID" ||
    query.paymentStatus === "FAILED" ||
    query.paymentStatus === "CANCELLED" ||
    query.paymentStatus === "REFUNDED" ||
    query.paymentStatus === "PARTIALLY_REFUNDED"
  ) {
    where.payments = { some: { status: query.paymentStatus } };
  }
  if (query.area === "INSIDE_DHAKA" || query.area === "OUTSIDE_DHAKA") {
    where.area = query.area;
  }
  if (query.courier === "steadfast") {
    where.shipment = { is: { courier: "steadfast" } };
  } else if (query.courier === "none") {
    where.shipment = { is: null };
  }
  const from = dayBound(query.from, false);
  const to = dayBound(query.to, true);
  if (from || to) {
    where.placedAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }
  if (query.q) {
    where.OR = [
      { number: { contains: query.q } },
      { phone: { contains: query.q } },
      { name: { contains: query.q } },
    ];
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
        shipment: true,
      },
      orderBy: { placedAt: "desc" },
      skip: (query.page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    total,
    page: query.page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    rows: orders.map((order) => ({
      id: order.id,
      number: order.number,
      name: order.name,
      phone: order.phone,
      total: order.total.toNumber(),
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.payments[0]?.status ?? "PENDING",
      area: order.area,
      courier: order.shipment?.courier ?? "",
      placedAt: stamp(order.placedAt),
    })),
  };
}

async function fraudFor(
  phone: string,
  blacklisted: boolean,
): Promise<AdminOrderDetail["fraud"]> {
  if (blacklisted) {
    return { score: 90, label: "High", detail: "This customer is blacklisted." };
  }
  const [cancelled, delivered] = await Promise.all([
    prisma.order.count({ where: { phone, status: "CANCELLED" } }),
    prisma.order.count({ where: { phone, status: { in: ["DELIVERED", "COMPLETED"] } } }),
  ]);
  if (cancelled >= 3 && delivered === 0) {
    return {
      score: 70,
      label: "High",
      detail: `${cancelled} cancelled orders and none delivered.`,
    };
  }
  const score = Math.min(60, cancelled * 15);
  return {
    score,
    label: score >= 40 ? "Medium" : "Low",
    detail: `${cancelled} cancelled, ${delivered} delivered for this phone.`,
  };
}

export async function getAdminOrder(id: string): Promise<AdminOrderDetail | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { id: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      shipment: true,
      invoice: true,
      returnRequests: { orderBy: { createdAt: "desc" } },
      customer: { select: { isBlacklisted: true } },
    },
  });
  if (!order) {
    return null;
  }
  const [fraud, smsLogs, emailLogs] = await Promise.all([
    fraudFor(order.phone, order.customer?.isBlacklisted ?? false),
    prisma.smsLog.findMany({
      where: { to: order.phone },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.emailLog.findMany({
      where: { body: { contains: order.number } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  const notices: AdminOrderDetail["notices"] = [
    ...smsLogs
      .filter((row) => {
        const response = row.response;
        return (
          !!response &&
          typeof response === "object" &&
          !Array.isArray(response) &&
          "orderId" in response &&
          response.orderId === order.id
        );
      })
      .slice(0, 5)
      .map((row) => ({
        channel: "SMS" as const,
        to: row.to,
        status: row.status,
        body: row.body,
        at: stamp(row.createdAt),
      })),
    ...emailLogs.map((row) => ({
      channel: "Email" as const,
      to: row.to,
      status: row.status,
      body: row.subject,
      at: stamp(row.createdAt),
    })),
  ];

  return {
    id: order.id,
    number: order.number,
    trackingId: order.trackingId ?? "",
    name: order.name,
    phone: order.phone,
    email: order.email ?? "",
    address: order.addressLine,
    area: order.area,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal.toNumber(),
    discount: order.discount.toNumber(),
    deliveryCharge: order.deliveryCharge.toNumber(),
    total: order.total.toNumber(),
    status: order.status,
    customerNote: order.customerNote ?? "",
    internalNote: order.internalNote ?? "",
    placedAt: stamp(order.placedAt),
    blacklisted: order.customer?.isBlacklisted ?? false,
    fraud,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      qty: item.qty,
      unitPrice: item.unitPrice.toNumber(),
    })),
    history: order.statusHistory.map((row) => ({
      id: row.id,
      status: row.status,
      note: row.note ?? "",
      at: stamp(row.createdAt),
    })),
    paymentStatus: order.payments[0]?.status ?? "PENDING",
    paymentAmount: order.payments[0]?.amount.toNumber() ?? 0,
    paymentRefundedAmount: order.payments[0]?.refundedAmount.toNumber() ?? 0,
    shipment: order.shipment
      ? {
          courier: order.shipment.courier,
          consignmentId: order.shipment.consignmentId ?? "",
          status: order.shipment.status,
        }
      : null,
    invoiceNumber: order.invoice?.number ?? "",
    returns: order.returnRequests.map((row) => ({
      id: row.id,
      status: row.status,
      reason: row.reason,
      refundAmount: row.refundAmount ? row.refundAmount.toNumber() : null,
    })),
    notices,
  };
}

export async function setOrderStatus(
  actorId: string | null,
  orderId: string,
  status: OrderStatus,
  note: string,
): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    throw new Error("Order not found");
  }
  if (order.status === status) {
    return "Status is already set.";
  }
  if (!canTransition(order.status, status)) {
    // Logged even though automated callers (courier webhook, the
    // cancel-unpaid-orders cron, the SSLCommerz IPN handler) don't inspect
    // the return value — a rejected transition from automation is worth
    // being able to find later, not a silent no-op.
    await recordAudit({
      actorId: actorId ?? undefined,
      action: "order.status.rejected",
      entityType: "Order",
      entityId: orderId,
      metadata: { from: order.status, attempted: status },
    });
    return `Cannot move an order from ${order.status} to ${status}.`;
  }
  await prisma.$transaction((tx) => transitionOrder(tx, order, status, note));
  const updated = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  await queueStatusNotice(updated);
  await recordAudit({
    actorId: actorId ?? undefined,
    action: "order.status",
    entityType: "Order",
    entityId: orderId,
    metadata: { from: order.status, to: status },
  });
  return "Status saved. SMS and email were sent.";
}

export async function saveOrderNotes(
  actorId: string,
  orderId: string,
  customerNote: string,
  internalNote: string,
): Promise<void> {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      customerNote: customerNote.trim() || null,
      internalNote: internalNote.trim() || null,
    },
  });
  await recordAudit({
    actorId,
    action: "order.notes",
    entityType: "Order",
    entityId: order.id,
  });
}

export async function updateOrderItems(
  actorId: string,
  input: {
    orderId: string;
    discount: string;
    deliveryCharge: string;
    items: { id: string; qty: string; unitPrice: string }[];
    addSku: string;
    addQty: string;
  },
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { items: true, invoice: true },
  });
  if (!order) {
    throw new Error("Order not found");
  }
  const known = new Map(order.items.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const nextLines: {
    id?: string;
    variantId: string | null;
    name: string;
    sku: string;
    qty: number;
    unitPrice: number;
  }[] = [];

  for (const row of input.items) {
    if (seen.has(row.id)) {
      throw new Error("Each item can only be listed once");
    }
    seen.add(row.id);
    const current = known.get(row.id);
    if (!current) {
      throw new Error("An item on this order could not be found");
    }
    nextLines.push({
      id: current.id,
      variantId: current.variantId,
      name: current.name,
      sku: current.sku,
      qty: Number(row.qty),
      unitPrice: Number(row.unitPrice),
    });
  }

  if (input.addSku) {
    if (!/^[1-9]\d*$/.test(input.addQty)) {
      throw new Error("Quantity must be at least 1");
    }
    const variant = await prisma.productVariant.findUnique({
      where: { sku: input.addSku },
      include: { product: true },
    });
    if (!variant || variant.status !== "ACTIVE") {
      throw new Error(`SKU ${input.addSku} is not available`);
    }
    nextLines.push({
      variantId: variant.id,
      name: variant.product.name,
      sku: variant.sku,
      qty: Number(input.addQty),
      unitPrice:
        variant.salePrice === null
          ? variant.price.toNumber()
          : variant.salePrice.toNumber(),
    });
  }

  const subtotal = roundMoney(
    nextLines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0),
  );
  const discount = Number(input.discount);
  const deliveryCharge = Number(input.deliveryCharge);
  if (discount > subtotal) {
    throw new Error("Discount cannot be more than the subtotal");
  }
  const total = roundMoney(subtotal - discount + deliveryCharge);
  const holding = holdsStock(order.status);

  await prisma.$transaction(async (tx) => {
    if (holding) {
      for (const current of order.items) {
        if (!seen.has(current.id)) {
          await applyStock(
            tx,
            current.variantId,
            current.qty,
            `Restored ${current.sku} on ${order.number}`,
          );
        }
      }
      for (const line of nextLines) {
        if (line.id) {
          const current = known.get(line.id);
          if (current) {
            await applyStock(
              tx,
              current.variantId,
              current.qty - line.qty,
              `Adjusted ${current.sku} on ${order.number}`,
            );
          }
        } else {
          await applyStock(
            tx,
            line.variantId,
            -line.qty,
            `Added ${line.sku} on ${order.number}`,
          );
        }
      }
    }
    for (const current of order.items) {
      if (!seen.has(current.id)) {
        await tx.orderItem.delete({ where: { id: current.id } });
      }
    }
    for (const line of nextLines) {
      const lineTotal = roundMoney(line.unitPrice * line.qty);
      if (line.id) {
        await tx.orderItem.update({
          where: { id: line.id },
          data: { qty: line.qty, unitPrice: line.unitPrice, lineTotal },
        });
      } else {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            variantId: line.variantId,
            name: line.name,
            sku: line.sku,
            qty: line.qty,
            unitPrice: line.unitPrice,
            lineTotal,
          },
        });
      }
    }
    await tx.order.update({
      where: { id: order.id },
      data: { subtotal, discount, deliveryCharge, total },
    });
    if (order.invoice) {
      await tx.invoice.update({
        where: { id: order.invoice.id },
        data: { subtotal, discount, deliveryCharge, total },
      });
    }
    await tx.payment.updateMany({
      where: { orderId: order.id, status: "PENDING" },
      data: { amount: total },
    });
  });
  await recordAudit({
    actorId,
    action: "order.items",
    entityType: "Order",
    entityId: order.id,
    metadata: { total },
  });
}

export async function setPaymentStatus(
  actorId: string,
  orderId: string,
  status: PaymentStatus,
): Promise<string> {
  const payment = await prisma.payment.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) {
    throw new Error("This order has no payment");
  }
  if (payment.status === status) {
    return "Status is already set.";
  }
  if (!canTransitionPayment(payment.status, status)) {
    await recordAudit({
      actorId,
      action: "order.payment.rejected",
      entityType: "Order",
      entityId: orderId,
      metadata: { from: payment.status, attempted: status },
    });
    return `Cannot move a payment from ${payment.status} to ${status}.`;
  }
  await prisma.$transaction((tx) =>
    transitionPayment(tx, payment, status, "Set by admin"),
  );
  await recordAudit({
    actorId,
    action: "order.payment",
    entityType: "Order",
    entityId: orderId,
    metadata: { status },
  });
  if (status === "REFUNDED") {
    return setOrderStatus(actorId, orderId, "REFUNDED", "Payment marked refunded");
  }
  return "Payment status saved.";
}

/** Refunds (fully or partially) the order's current payment, through
 * modules/payments' refundedAmount-tracked path — see refundPayment()'s
 * own docs for why a second partial refund is a plain amount update, not
 * a status transition. Only a full refund (the running total reaching
 * the payment's amount) moves the order itself to REFUNDED, matching
 * setPaymentStatus's existing behavior for a manual full-refund override. */
export async function refundOrderPayment(
  actorId: string,
  orderId: string,
  amount: number,
  note: string | null,
): Promise<string> {
  const payment = await prisma.payment.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
  if (!payment) {
    throw new Error("This order has no payment");
  }
  const updated = await prisma.$transaction((tx) =>
    refundPayment(tx, payment, amount, note),
  );
  await recordAudit({
    actorId,
    action: "order.payment.refund",
    entityType: "Order",
    entityId: orderId,
    metadata: {
      amount,
      status: updated.status,
      refundedAmount: updated.refundedAmount.toNumber(),
    },
  });
  if (updated.status === "REFUNDED") {
    await setOrderStatus(actorId, orderId, "REFUNDED", `Refunded ${amount} in full`);
  }
  return updated.status === "REFUNDED"
    ? `Refunded ${amount} — payment fully refunded.`
    : `Refunded ${amount} — ${updated.refundedAmount.toNumber()} of ${updated.amount.toNumber()} refunded so far.`;
}

export async function createManualOrder(
  actorId: string,
  input: {
    name: string;
    phone: string;
    email: string;
    address: string;
    area: "INSIDE_DHAKA" | "OUTSIDE_DHAKA";
    paymentMethod: "COD" | "BKASH" | "NAGAD" | "ROCKET" | "CARD";
    customerNote: string;
    source: "phone" | "facebook";
    lines: { sku: string; qty: string }[];
  },
): Promise<{ id: string; number: string }> {
  const phone = normalizeBdPhone(input.phone);
  if (!phone) {
    throw new Error("Enter a valid Bangladeshi mobile number");
  }
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new Error("Enter a valid email");
  }
  const prepared: {
    variantId: string;
    name: string;
    sku: string;
    qty: number;
    unitPrice: number;
  }[] = [];
  for (const line of input.lines) {
    const variant = await prisma.productVariant.findUnique({
      where: { sku: line.sku },
      include: { product: true },
    });
    if (!variant || variant.status !== "ACTIVE") {
      throw new Error(`SKU ${line.sku} is not available`);
    }
    const qty = Number(line.qty);
    if (variant.stock < qty) {
      throw new Error(`Only ${variant.stock} left for ${line.sku}`);
    }
    prepared.push({
      variantId: variant.id,
      name: variant.product.name,
      sku: variant.sku,
      qty,
      unitPrice:
        variant.salePrice === null
          ? variant.price.toNumber()
          : variant.salePrice.toNumber(),
    });
  }
  const subtotal = roundMoney(
    prepared.reduce((sum, line) => sum + line.unitPrice * line.qty, 0),
  );
  const deliveryCharge = await quotedDelivery(input.area, subtotal);
  const total = roundMoney(subtotal + deliveryCharge);
  const customer = await prisma.customer.upsert({
    where: { phone },
    update: { name: input.name, ...(input.email ? { email: input.email } : {}) },
    create: { name: input.name, phone, email: input.email || null },
  });
  const sourceLabel = input.source === "facebook" ? "Facebook" : "phone";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ids = freshNumber();
    try {
      const created = await prisma.$transaction(async (tx) => {
        for (const line of prepared) {
          await applyStock(tx, line.variantId, -line.qty, `Manual order ${ids.number}`);
        }
        return tx.order.create({
          data: {
            number: ids.number,
            trackingId: ids.trackingId,
            customerId: customer.id,
            name: input.name,
            phone,
            email: input.email || null,
            addressLine: input.address,
            area: input.area,
            paymentMethod: input.paymentMethod,
            subtotal,
            discount: 0,
            deliveryCharge,
            total,
            status: "PENDING",
            customerNote: input.customerNote.trim() || null,
            internalNote: `Created from ${sourceLabel}`,
            items: {
              create: prepared.map((line) => ({
                variantId: line.variantId,
                name: line.name,
                sku: line.sku,
                qty: line.qty,
                unitPrice: line.unitPrice,
                lineTotal: roundMoney(line.unitPrice * line.qty),
              })),
            },
            statusHistory: {
              create: { status: "PENDING", note: `Manual ${sourceLabel} order` },
            },
            payments: {
              create: { method: input.paymentMethod, status: "PENDING", amount: total },
            },
          },
        });
      });
      await recordAudit({
        actorId,
        action: "order.manual",
        entityType: "Order",
        entityId: created.id,
        metadata: { number: created.number, source: input.source },
      });
      const { alertNewOrder, checkVariantsLowStock } =
        await import("@/server/admin/alerts");
      await alertNewOrder({
        id: created.id,
        number: created.number,
        name: created.name,
        phone: created.phone,
        total: Number(created.total),
      }).catch(() => undefined);
      await checkVariantsLowStock(prepared.map((line) => line.variantId)).catch(
        () => undefined,
      );
      return { id: created.id, number: created.number };
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error ? error.code : "";
      if (code === "P2002") {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Could not create the order. Try again.");
}

export async function bookCourier(actorId: string, orderId: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true, shipment: true },
  });
  if (!order) {
    throw new Error("Order not found");
  }
  if (order.shipment?.consignmentId) {
    return `Already booked as ${order.shipment.consignmentId}.`;
  }
  const booking = await bookWithSteadfast(order);
  await prisma.shipment.upsert({
    where: { orderId },
    create: {
      orderId,
      courier: "steadfast",
      consignmentId: booking.consignmentId,
      status: "PENDING",
    },
    update: {
      courier: "steadfast",
      consignmentId: booking.consignmentId,
      status: "PENDING",
    },
  });
  if (order.trackingId !== booking.trackingCode) {
    await prisma.order.update({
      where: { id: orderId },
      data: { trackingId: booking.trackingCode },
    });
  }
  await recordAudit({
    actorId,
    action: "order.steadfast",
    entityType: "Order",
    entityId: orderId,
    metadata: { consignmentId: booking.consignmentId },
  });
  if (order.status !== "SENT_TO_COURIER") {
    await setOrderStatus(actorId, orderId, "SENT_TO_COURIER", booking.message);
  }
  return booking.message;
}

export function shipmentStatusFrom(remote: string): ShipmentStatus | null {
  const key = remote.trim().toUpperCase().replace(/\s+/g, "_");
  if (key === "CANCELED") {
    return "CANCELLED";
  }
  return shipmentStatuses.find((status) => status === key) ?? null;
}

export async function syncCourier(actorId: string, orderId: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shipment: true },
  });
  if (!order?.shipment?.consignmentId) {
    throw new Error("Send this order to Steadfast before syncing status");
  }
  const remote = await steadfastStatus(order.shipment.consignmentId);
  if (!remote) {
    return "This consignment is stored locally. Add Steadfast API keys to sync courier status.";
  }
  const mapped = shipmentStatusFrom(remote);
  if (mapped) {
    await prisma.shipment.update({
      where: { orderId },
      data: { status: mapped },
    });
    await recordAudit({
      actorId,
      action: "order.courier-sync",
      entityType: "Order",
      entityId: orderId,
      metadata: { mapped, remote },
    });
  }
  if (
    mapped === "DELIVERED" &&
    order.status !== "COMPLETED" &&
    order.status !== "DELIVERED"
  ) {
    await setOrderStatus(actorId, orderId, "DELIVERED", `Steadfast: ${remote}`);
  }
  return mapped ? `Courier status is ${mapped}.` : `Courier reported ${remote}.`;
}

export async function decideReturn(
  actorId: string,
  id: string,
  status: "APPROVED" | "REJECTED" | "REFUNDED",
  refundAmount: string,
): Promise<string> {
  const request = await prisma.returnRequest.findUnique({
    where: { id },
    include: { order: true },
  });
  if (!request) {
    throw new Error("Return request not found");
  }
  const amount = refundAmount
    ? Number(refundAmount)
    : status === "REFUNDED"
      ? request.order.total.toNumber()
      : null;
  await prisma.returnRequest.update({
    where: { id },
    data: {
      status,
      ...(amount === null ? {} : { refundAmount: amount }),
    },
  });
  await recordAudit({
    actorId,
    action: "order.return",
    entityType: "ReturnRequest",
    entityId: id,
    metadata: { status, orderId: request.orderId },
  });
  if (status === "REFUNDED") {
    const payment = await prisma.payment.findFirst({
      where: { orderId: request.orderId },
      orderBy: { createdAt: "desc" },
    });
    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED" },
      });
    }
    return setOrderStatus(actorId, request.orderId, "REFUNDED", "Return refunded");
  }
  return status === "APPROVED" ? "Return approved." : "Return rejected.";
}

export async function listAbandonedCarts(): Promise<AbandonedCartRow[]> {
  const carts = await prisma.cart.findMany({
    where: { status: "ACTIVE", items: { some: {} } },
    include: {
      customer: true,
      user: true,
      items: { include: { variant: { include: { product: true } } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return carts.map((cart) => ({
    id: cart.id,
    who: cart.customer?.name || cart.user?.name || "Guest",
    phone: cart.customer?.phone || cart.user?.phone || "",
    updatedAt: stamp(cart.updatedAt),
    lines: cart.items.map((item) => ({
      sku: item.variant.sku,
      name: item.variant.product.name,
      qty: item.qty,
    })),
  }));
}

export async function listReturns(): Promise<ReturnRow[]> {
  const rows = await prisma.returnRequest.findMany({
    include: { order: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((row) => ({
    id: row.id,
    orderId: row.orderId,
    orderNumber: row.order.number,
    name: row.order.name,
    phone: row.order.phone,
    status: row.status,
    reason: row.reason,
    refundAmount: row.refundAmount ? row.refundAmount.toNumber() : null,
    orderTotal: row.order.total.toNumber(),
    createdAt: stamp(row.createdAt),
  }));
}

async function ensureInvoice(orderId: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { invoice: true },
  });
  if (!order) {
    throw new Error("Order not found");
  }
  if (order.invoice) {
    await prisma.invoice.update({
      where: { id: order.invoice.id },
      data: {
        subtotal: order.subtotal,
        discount: order.discount,
        deliveryCharge: order.deliveryCharge,
        total: order.total,
      },
    });
    return order.invoice.number;
  }
  const invoiceSettings = await loadInvoice();
  const created = await prisma.invoice.create({
    data: {
      orderId,
      number: `${invoiceSettings.prefix}-${order.number}`,
      subtotal: order.subtotal,
      discount: order.discount,
      deliveryCharge: order.deliveryCharge,
      total: order.total,
    },
  });
  return created.number;
}

export async function loadPrintDocuments(
  ids: string[],
  kind: "invoice" | "packing" | "label",
): Promise<PrintDocument[]> {
  const unique = [...new Set(ids)].slice(0, 50);
  const documents: PrintDocument[] = [];
  for (const id of unique) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, shipment: true },
    });
    if (!order) {
      continue;
    }
    const invoiceNumber = await ensureInvoice(order.id);
    const trackingId = order.trackingId ?? "";
    documents.push({
      id: order.id,
      kind,
      number: order.number,
      invoiceNumber,
      name: order.name,
      phone: order.phone,
      email: order.email ?? "",
      address: order.addressLine,
      area: order.area === "INSIDE_DHAKA" ? "Inside Dhaka" : "Outside Dhaka",
      paymentMethod: order.paymentMethod,
      codAmount: order.paymentMethod === "COD" ? order.total.toNumber() : 0,
      subtotal: order.subtotal.toNumber(),
      discount: order.discount.toNumber(),
      deliveryCharge: order.deliveryCharge.toNumber(),
      total: order.total.toNumber(),
      status: order.status,
      trackingId,
      consignmentId: order.shipment?.consignmentId ?? "",
      items: order.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        qty: item.qty,
        unitPrice: item.unitPrice.toNumber(),
        lineTotal: item.lineTotal.toNumber(),
      })),
      barcode: barcodeSvg(trackingId || order.number),
      qr: await qrSvg(`${order.number} ${trackingId}`.trim()),
    });
  }
  return documents;
}

export function parsePrintKind(value: string): "invoice" | "packing" | "label" {
  if (value === "packing" || value === "label") {
    return value;
  }
  return "invoice";
}
