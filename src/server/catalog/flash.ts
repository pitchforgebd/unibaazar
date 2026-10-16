import type { Prisma } from "@prisma/client";

type FlashItemLike = {
  salePrice: Prisma.Decimal;
  flashSale: { isActive: boolean; startsAt: Date; endsAt: Date };
};

/** The active flash-sale price for a variant, if one of its flash-sale
 * memberships is currently running — shared by product display
 * (`toProduct`) and checkout pricing (`quoteCart`) so a flash price is
 * never shown without actually being charged, or vice versa. */
export function activeFlashSalePrice(
  flashItems: FlashItemLike[],
  now: Date = new Date(),
): number | null {
  const active = flashItems.find(
    (item) =>
      item.flashSale.isActive &&
      item.flashSale.startsAt.getTime() <= now.getTime() &&
      item.flashSale.endsAt.getTime() >= now.getTime(),
  );
  return active ? active.salePrice.toNumber() : null;
}
