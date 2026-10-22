import type { OrderStatus as DbStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeBdPhone } from "@/lib/validation/customer";
import type { DeliveryArea, Order, OrderStatus, PaymentMethod } from "@/types/catalog";
import { recordAudit } from "@/server/security/audit";
import { assertCheckoutAllowed, noteDeviceOrder } from "@/server/security/fraud";
import { ApiError } from "@/server/http";
import { readSession } from "@/server/auth/session";
import { areaToDb, paymentToDb, quoteCart } from "@/server/checkout/quote";
import { loadCheckout } from "@/server/settings/store";
import { signalPurchase } from "@/server/tracking/signals";
import { commitStock } from "@/modules/inventory";
import { incrementFlashSold } from "@/modules/inventory/server/flash";
import { StockUnavailableError, FlashLimitReachedError } from "@/modules/inventory/types";
import { canTransition, transitionOrder } from "@/modules/orders";

const statusLabel: Record<DbStatus, OrderStatus> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  READY_TO_SHIP: "Ready to ship",
  SENT_TO_COURIER: "Sent to courier",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return requested",
  RETURNED: "Returned",
  FAILED: "Failed",
  ON_HOLD: "On hold",
  PARTIAL_DELIVERED: "Partial delivered",
  REFUNDED: "Refunded",
};

const steps: OrderStatus[] = [
  "Pending",
  "Confirmed",
  "Processing",
  "Ready to ship",
  "Sent to courier",
  "Shipped",
  "Delivered",
  "Completed",
];

function stamp(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(date);
}

type OrderRow = Prisma.OrderGetPayload<{
  include: { items: true; statusHistory: true };
}>;

export function presentOrder(order: OrderRow): Order {
  const current = statusLabel[order.status];
  const stepIndex = steps.indexOf(current);
  const timeline =
    stepIndex === -1
      ? order.statusHistory.map((row) => ({
          label: statusLabel[row.status],
          at: stamp(row.createdAt),
          done: true,
        }))
      : steps.map((label, index) => {
          const match = order.statusHistory.find(
            (row) => statusLabel[row.status] === label,
          );
          return {
            label,
            at: match ? stamp(match.createdAt) : "",
            done: index <= stepIndex,
          };
        });

  return {
    id: order.number,
    trackingId: order.trackingId ?? "",
    name: order.name,
    phone: order.phone,
    email: order.email ?? "",
    address: order.addressLine,
    area: order.area === "INSIDE_DHAKA" ? "inside-dhaka" : "outside-dhaka",
    paymentMethod: order.paymentMethod.toLowerCase() as PaymentMethod,
    items: order.items.map((item) => ({
      name: item.name,
      sku: item.sku,
      qty: item.qty,
      unitPrice: item.unitPrice.toNumber(),
    })),
    subtotal: order.subtotal.toNumber(),
    discount: order.discount.toNumber(),
    deliveryCharge: order.deliveryCharge.toNumber(),
    total: order.total.toNumber(),
    status: statusLabel[order.status],
    timeline,
    placedAt: order.placedAt.toISOString(),
  };
}

function orderNumber(prefix: string): { number: string; trackingId: string } {
  const digits = String(Math.floor(100000 + Math.random() * 900000));
  return { number: `${prefix}${digits}`, trackingId: `SF${digits}BD` };
}

async function customerFor(phone: string, name: string, email: string) {
  const session = await readSession();
  return prisma.customer.upsert({
    where: { phone },
    update: {
      name,
      ...(email ? { email } : {}),
      ...(session ? { userId: session.userId } : {}),
    },
    create: {
      name,
      phone,
      email: email || null,
      userId: session?.userId,
    },
  });
}

export async function placeOrder(
  input: {
    name: string;
    phone: string;
    email: string;
    address: string;
    area: DeliveryArea;
    paymentMethod: PaymentMethod;
    lines: { slug: string; variantId: string; qty: number }[];
    couponCode?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    /** Same opaque id the client used for its cart quote(s) — lets
     * placeOrder consume the stock already held under that reservation
     * instead of decrementing again. Optional for backward compatibility. */
    reservationToken?: string;
  },
  context: { ip: string; device: string } = { ip: "unknown", device: "unknown" },
): Promise<Order> {
  const phone = normalizeBdPhone(input.phone);
  if (!phone) {
    throw new ApiError(400, "Enter a valid Bangladeshi mobile number");
  }
  const quote = await quoteCart({
    lines: input.lines,
    couponCode: input.couponCode,
    area: input.area,
    phone,
    reservationToken: input.reservationToken,
  });
  const checkout = await loadCheckout();
  const session = await readSession();
  if (!checkout.guest && !session) {
    throw new ApiError(401, "Sign in to place an order");
  }
  if (!checkout.cod && input.paymentMethod === "cod") {
    throw new ApiError(400, "Cash on delivery is turned off");
  }
  if (checkout.minOrder > 0 && quote.subtotal < checkout.minOrder) {
    throw new ApiError(400, `The minimum order is ${checkout.minOrder}`);
  }
  const customer = await customerFor(phone, input.name, input.email);
  await assertCheckoutAllowed({
    phone,
    ip: context.ip,
    device: context.device,
    lines: quote.lines.map((line) => ({ variantId: line.variantId, qty: line.qty })),
    blacklistedPhone: customer.isBlacklisted,
  });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ids = orderNumber(checkout.orderPrefix);
    try {
      const created = await prisma.$transaction(async (tx) => {
        await commitStock(
          tx,
          quote.reservationToken,
          quote.lines.map((line) => ({ variantId: line.variantId, qty: line.qty })),
        );
        for (const line of quote.lines) {
          if (line.flashSaleItemId) {
            await incrementFlashSold(tx, line.flashSaleItemId, line.qty);
          }
        }
        const order = await tx.order.create({
          data: {
            number: ids.number,
            trackingId: ids.trackingId,
            userId: session?.userId,
            customerId: customer.id,
            couponId: quote.couponId,
            name: input.name,
            phone,
            email: input.email || null,
            addressLine: input.address,
            area: areaToDb[input.area],
            paymentMethod: paymentToDb[input.paymentMethod],
            subtotal: quote.subtotal,
            discount: quote.discount,
            deliveryCharge: quote.deliveryCharge,
            total: quote.total,
            status: "PENDING",
            ipAddress: context.ip,
            utmSource: input.utmSource || null,
            utmMedium: input.utmMedium || null,
            utmCampaign: input.utmCampaign || null,
            utmTerm: input.utmTerm || null,
            utmContent: input.utmContent || null,
            items: {
              create: quote.lines.map((line) => ({
                variantId: line.variantId,
                name: line.name,
                sku: line.sku,
                qty: line.qty,
                unitPrice: line.unitPrice,
                lineTotal: line.lineTotal,
              })),
            },
            statusHistory: { create: { status: "PENDING", note: "Order placed" } },
            payments: {
              create: {
                method: paymentToDb[input.paymentMethod],
                status: "PENDING",
                amount: quote.total,
              },
            },
          },
          include: { items: true, statusHistory: true },
        });
        if (quote.couponId) {
          await tx.coupon.update({
            where: { id: quote.couponId },
            data: { usedCount: { increment: 1 } },
          });
        }
        return order;
      });
      noteDeviceOrder(context.device);
      await signalPurchase({
        eventId: created.number,
        value: quote.total,
        currency: "BDT",
        phone,
        email: input.email,
      }).catch(() => undefined);
      await recordAudit({
        actorId: session?.userId,
        action: "order.place",
        entityType: "Order",
        entityId: created.id,
        ip: context.ip,
        metadata: { number: created.number, phone },
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
      await checkVariantsLowStock(quote.lines.map((line) => line.variantId)).catch(
        () => undefined,
      );
      const { queueStatusNotice } = await import("@/server/admin/notify");
      await queueStatusNotice(created).catch(() => undefined);
      return presentOrder(created);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof StockUnavailableError) {
        const first = error.failures[0];
        throw new ApiError(
          409,
          `Only ${first?.available ?? 0} left for ${first?.sku ?? "an item"}`,
        );
      }
      if (error instanceof FlashLimitReachedError) {
        throw new ApiError(409, `The flash quantity for ${error.sku} is used up`);
      }
      const code =
        typeof error === "object" && error && "code" in error ? error.code : "";
      if (code === "P2002") {
        continue;
      }
      throw error;
    }
  }
  throw new ApiError(500, "Could not place the order. Try again.");
}

export async function trackOrder(orderId: string, phoneInput: string): Promise<Order> {
  const phone = normalizeBdPhone(phoneInput);
  if (!phone) {
    throw new ApiError(400, "Enter a valid Bangladeshi mobile number");
  }
  const order = await prisma.order.findFirst({
    where: { number: orderId.trim(), phone },
    include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) {
    throw new ApiError(404, "No order matches that ID and phone");
  }
  return presentOrder(order);
}

async function orderForCustomer(number: string, phoneInput: string) {
  const phone = normalizeBdPhone(phoneInput);
  if (!phone) {
    throw new ApiError(400, "Enter a valid Bangladeshi mobile number");
  }
  const order = await prisma.order.findFirst({
    where: { number, phone },
    include: { items: true },
  });
  if (!order) {
    throw new ApiError(404, "No order matches that ID and phone");
  }
  return order;
}

export async function cancelOrder(number: string, phoneInput: string): Promise<Order> {
  const order = await orderForCustomer(number, phoneInput);
  if (!canTransition(order.status, "CANCELLED")) {
    throw new ApiError(409, "This order can no longer be cancelled");
  }
  await prisma.$transaction((tx) =>
    transitionOrder(tx, order, "CANCELLED", "Customer cancel request"),
  );
  const updated = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } },
  });
  return presentOrder(updated);
}

export async function requestReturn(
  number: string,
  phoneInput: string,
  reason: string,
): Promise<Order> {
  const order = await orderForCustomer(number, phoneInput);
  const alreadyRequested = order.status === "RETURN_REQUESTED";
  if (!alreadyRequested && !canTransition(order.status, "RETURN_REQUESTED")) {
    throw new ApiError(409, "A return can be requested after delivery");
  }
  await prisma.$transaction(async (tx) => {
    await tx.returnRequest.create({
      data: { orderId: order.id, reason, status: "REQUESTED" },
    });
    if (alreadyRequested) {
      // Not a status change (already there) — a second return request on
      // the same order, e.g. a different item/reason while the first is
      // still pending. Logged as a history note rather than silently
      // dropped, without re-asserting a self-transition.
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "RETURN_REQUESTED",
          note: `Additional request: ${reason}`,
        },
      });
      return;
    }
    await transitionOrder(tx, order, "RETURN_REQUESTED", reason);
  });
  const updated = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } },
  });
  return presentOrder(updated);
}

export async function ordersForSession(): Promise<Order[]> {
  const session = await readSession();
  if (!session) {
    throw new ApiError(401, "Sign in to see your orders");
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    throw new ApiError(401, "Sign in again");
  }
  const rows = await prisma.order.findMany({
    where: { OR: [{ userId: user.id }, { phone: user.phone }] },
    include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } },
    orderBy: { placedAt: "desc" },
  });
  return rows.map(presentOrder);
}

export async function orderForSession(number: string): Promise<Order> {
  const session = await readSession();
  if (!session) {
    throw new ApiError(401, "Sign in to see this order");
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    throw new ApiError(401, "Sign in again");
  }
  const row = await prisma.order.findFirst({
    where: { number, OR: [{ userId: user.id }, { phone: user.phone }] },
    include: { items: true, statusHistory: { orderBy: { createdAt: "asc" } } },
  });
  if (!row) {
    throw new ApiError(404, "That order is not on this account");
  }
  return presentOrder(row);
}
