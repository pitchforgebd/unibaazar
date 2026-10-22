import type { Order, OrderStatus, Prisma } from "@prisma/client";
import { adjustStock } from "@/modules/inventory";
import { assertTransition, holdsStock } from "@/modules/orders/state-machine";

type OrderWithItems = Order & {
  items: { variantId: string | null; qty: number; sku: string }[];
};

/**
 * The one place an order's status changes — every call site in the
 * codebase (admin actions, payment IPN, courier webhooks, the
 * cancel-unpaid-orders cron, customer-facing cancel/return) goes through
 * this instead of writing `Order.status` directly, so transition legality
 * (`assertTransition`) and the stock hold/release side effect can never be
 * skipped by a new call site that forgets to check. Must run inside the
 * caller's own transaction — it doesn't open one itself, so the status
 * write and the stock adjustment it implies are always atomic together.
 */
export async function transitionOrder(
  tx: Prisma.TransactionClient,
  order: OrderWithItems,
  to: OrderStatus,
  note: string | null,
): Promise<void> {
  assertTransition(order.status, to);
  // The transition graph (state-machine.ts) is deliberately designed so no
  // released status (CANCELLED/FAILED/RETURNED/REFUNDED) ever transitions
  // back into a held one — a cancelled/returned order is final; the
  // customer places a new order rather than "resurrecting" one. That makes
  // stock release a one-way effect: only wasHolding && !willHold is
  // reachable. If a future change adds an edge back into a held status,
  // add the matching re-hold here (and a test for it) at the same time.
  const wasHolding = holdsStock(order.status);
  const willHold = holdsStock(to);
  if (wasHolding && !willHold) {
    for (const item of order.items) {
      if (!item.variantId) continue;
      await adjustStock(
        tx,
        item.variantId,
        item.qty,
        "RETURN",
        `Released ${item.sku} on ${order.number}`,
      );
    }
  }
  await tx.order.update({ where: { id: order.id }, data: { status: to } });
  await tx.orderStatusHistory.create({
    data: { orderId: order.id, status: to, note: note?.trim() || null },
  });
}
