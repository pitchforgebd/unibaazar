import type { Prisma } from "@prisma/client";
import { FlashLimitReachedError } from "@/modules/inventory/types";

/**
 * Atomically increments a flash-sale item's soldCount, failing if that
 * would exceed qtyLimit — replaces a live COUNT(OrderItem) query that ran
 * at quote time with no transaction/lock, a real oversell race on
 * flash-sale quantity limits (confirmed in ADR 0012's research: two
 * concurrent checkouts near the limit could both pass the old check and
 * both place an order). Called from the same transaction as the stock
 * commit at order placement, so it's the final, atomic word — not an
 * earlier, racy estimate.
 *
 * A null qtyLimit means unlimited; this is a no-op for those.
 */
export async function incrementFlashSold(
  tx: Prisma.TransactionClient,
  flashSaleItemId: string,
  qty: number,
): Promise<void> {
  const item = await tx.flashSaleItem.findUnique({ where: { id: flashSaleItemId } });
  if (!item || item.qtyLimit === null) {
    return;
  }
  const maxSoldCountBefore = item.qtyLimit - qty;
  const updated = await tx.flashSaleItem.updateMany({
    where: { id: flashSaleItemId, soldCount: { lte: maxSoldCountBefore } },
    data: { soldCount: { increment: qty } },
  });
  if (updated.count !== 1) {
    const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
    throw new FlashLimitReachedError(variant?.sku ?? item.variantId);
  }
}

/** Reverses `incrementFlashSold` — called when an order holding a flash
 * line is cancelled/failed, so the quantity becomes available again. */
export async function releaseFlashSold(
  tx: Prisma.TransactionClient,
  flashSaleItemId: string,
  qty: number,
): Promise<void> {
  const item = await tx.flashSaleItem.findUnique({ where: { id: flashSaleItemId } });
  if (!item || item.qtyLimit === null) {
    return;
  }
  await tx.flashSaleItem.update({
    where: { id: flashSaleItemId },
    data: { soldCount: { decrement: Math.min(qty, item.soldCount) } },
  });
}
