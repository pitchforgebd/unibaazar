import type { Prisma, InventoryReason } from "@prisma/client";

/**
 * Signed manual stock adjustment with the same atomic, oversell-safe guard
 * as reserveStock/commitStock — used for admin adjustments, purchase
 * receipts, and order-status-driven stock hold/release (a negative delta
 * re-holds stock when an order moves from a released status back into a
 * held one; a positive delta releases it). Throws if a negative delta
 * can't be satisfied.
 */
export async function adjustStock(
  tx: Prisma.TransactionClient,
  variantId: string,
  delta: number,
  reason: InventoryReason,
  note: string,
): Promise<void> {
  if (delta === 0) {
    return;
  }
  const current = await tx.productVariant.findUnique({ where: { id: variantId } });
  if (!current) {
    return;
  }
  if (delta < 0 && current.stock < -delta) {
    throw new Error(`Only ${current.stock} left for ${current.sku}`);
  }
  const updated = await tx.productVariant.updateMany({
    where: delta < 0 ? { id: variantId, stock: { gte: -delta } } : { id: variantId },
    data: delta < 0 ? { stock: { decrement: -delta } } : { stock: { increment: delta } },
  });
  if (updated.count !== 1) {
    throw new Error(`Only ${current.stock} left for ${current.sku}`);
  }
  await tx.inventoryLog.create({
    data: {
      variantId,
      delta,
      quantityAfter: current.stock + delta,
      reason,
      note,
    },
  });
}
