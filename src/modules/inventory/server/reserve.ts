import type { Prisma, PrismaClient } from "@prisma/client";
import {
  DEFAULT_RESERVATION_TTL_MINUTES,
  StockUnavailableError,
  type ReservationFailure,
  type ReservationLine,
} from "@/modules/inventory/types";

type Client = PrismaClient | Prisma.TransactionClient;

/**
 * Releases any of this variant's reservations that have expired, crediting
 * the stock they were holding back. Called defensively before every
 * reservation attempt on a variant, so stock never stays stuck decremented
 * past a reservation's TTL just because nobody else happened to buy that
 * SKU — see also the scheduled sweep in
 * src/server/admin/maintenance/jobs.ts for variants nobody touches again.
 */
async function reconcileExpired(tx: Client, variantId: string): Promise<void> {
  const now = new Date();
  const expired = await tx.stockReservation.findMany({
    where: { variantId, status: "ACTIVE", expiresAt: { lte: now } },
  });
  for (const reservation of expired) {
    // Optimistic guard: only the caller that successfully flips ACTIVE ->
    // EXPIRED gets to credit the stock back, so two concurrent sweeps of
    // the same row can't double-credit it.
    const flipped = await tx.stockReservation.updateMany({
      where: { id: reservation.id, status: "ACTIVE" },
      data: { status: "EXPIRED" },
    });
    if (flipped.count !== 1) {
      continue;
    }
    const variant = await tx.productVariant.update({
      where: { id: reservation.variantId },
      data: { stock: { increment: reservation.qty } },
    });
    await tx.inventoryLog.create({
      data: {
        variantId: reservation.variantId,
        delta: reservation.qty,
        quantityAfter: variant.stock,
        reason: "RELEASE",
        note: `Reservation ${reservation.id} expired`,
      },
    });
  }
}

/**
 * Holds stock for `lines` under `token` for `ttlMinutes`, so two concurrent
 * checkouts for the last unit can't both see "in stock". Reuses the same
 * atomic `updateMany({ stock: { gte: qty } })` guard the final
 * order-placement decrement already relied on (proven oversell-safe — see
 * tests/reserve.test.ts's concurrency test) by decrementing stock
 * immediately at reservation time instead of only at order placement;
 * `commitReservation`/`releaseReservation` below settle it one way or the
 * other. Re-reserving the same (token, variantId) — e.g. the customer
 * changed quantity and re-quoted — releases the old hold first so the new
 * amount is checked fresh rather than stacked on top.
 *
 * Throws `StockUnavailableError` (rolling back every line, not just the
 * failing one — a quote is all-or-nothing) if any line can't be held.
 */
export async function reserveStock(
  prisma: PrismaClient,
  token: string,
  lines: ReservationLine[],
  ttlMinutes: number = DEFAULT_RESERVATION_TTL_MINUTES,
): Promise<void> {
  const sorted = [...lines].sort((a, b) => a.variantId.localeCompare(b.variantId));
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
  await prisma.$transaction(async (tx) => {
    const failures: ReservationFailure[] = [];
    for (const line of sorted) {
      await reconcileExpired(tx, line.variantId);
      const existing = await tx.stockReservation.findUnique({
        where: { token_variantId: { token, variantId: line.variantId } },
      });
      if (existing && existing.status === "ACTIVE") {
        await tx.productVariant.update({
          where: { id: line.variantId },
          data: { stock: { increment: existing.qty } },
        });
        await tx.stockReservation.update({
          where: { id: existing.id },
          data: { status: "RELEASED" },
        });
      }
      const current = await tx.productVariant.findUnique({
        where: { id: line.variantId },
      });
      if (!current) {
        failures.push({
          variantId: line.variantId,
          sku: "unknown",
          available: 0,
          requested: line.qty,
        });
        continue;
      }
      const updated = await tx.productVariant.updateMany({
        where: { id: line.variantId, stock: { gte: line.qty } },
        data: { stock: { decrement: line.qty } },
      });
      if (updated.count !== 1) {
        failures.push({
          variantId: line.variantId,
          sku: current.sku,
          available: current.stock,
          requested: line.qty,
        });
        continue;
      }
      await tx.stockReservation.upsert({
        where: { token_variantId: { token, variantId: line.variantId } },
        create: {
          token,
          variantId: line.variantId,
          qty: line.qty,
          status: "ACTIVE",
          expiresAt,
        },
        update: { qty: line.qty, status: "ACTIVE", expiresAt },
      });
    }
    if (failures.length > 0) {
      throw new StockUnavailableError(failures);
    }
  });
}

/** Releases every ACTIVE reservation under `token` (abandoned cart, a
 * quote that was never placed, or a checkout that failed for a reason
 * unrelated to stock) — credits the held stock back. */
export async function releaseReservation(
  prisma: PrismaClient,
  token: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const active = await tx.stockReservation.findMany({
      where: { token, status: "ACTIVE" },
    });
    for (const reservation of active) {
      const variant = await tx.productVariant.update({
        where: { id: reservation.variantId },
        data: { stock: { increment: reservation.qty } },
      });
      await tx.stockReservation.update({
        where: { id: reservation.id },
        data: { status: "RELEASED" },
      });
      await tx.inventoryLog.create({
        data: {
          variantId: reservation.variantId,
          delta: reservation.qty,
          quantityAfter: variant.stock,
          reason: "RELEASE",
          note: `Reservation ${reservation.id} released`,
        },
      });
    }
  });
}

/**
 * Settles stock for an order being placed, inside the caller's own
 * transaction (order creation). For each line: if an ACTIVE reservation
 * under `token` already holds exactly this qty, just mark it CONSUMED (the
 * decrement already happened at reserve time) — otherwise release
 * whatever hold exists and decrement fresh, exactly like the pre-Phase-3
 * `takeStock()` did, so a client that never reserved (no token) or
 * re-submitted a different qty without re-quoting still gets a correct,
 * atomic, oversell-safe decrement.
 */
export async function commitStock(
  tx: Prisma.TransactionClient,
  token: string | null,
  lines: ReservationLine[],
): Promise<void> {
  const failures: ReservationFailure[] = [];
  for (const line of lines) {
    const existing = token
      ? await tx.stockReservation.findUnique({
          where: { token_variantId: { token, variantId: line.variantId } },
        })
      : null;
    if (existing && existing.status === "ACTIVE" && existing.qty === line.qty) {
      await tx.stockReservation.update({
        where: { id: existing.id },
        data: { status: "CONSUMED" },
      });
      const variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: line.variantId },
      });
      await tx.inventoryLog.create({
        data: {
          variantId: line.variantId,
          delta: -line.qty,
          quantityAfter: variant.stock,
          reason: "SALE",
          note: `Reservation ${existing.id} consumed`,
        },
      });
      continue;
    }
    if (existing && existing.status === "ACTIVE") {
      await tx.productVariant.update({
        where: { id: line.variantId },
        data: { stock: { increment: existing.qty } },
      });
      await tx.stockReservation.update({
        where: { id: existing.id },
        data: { status: "RELEASED" },
      });
    }
    const current = await tx.productVariant.findUnique({ where: { id: line.variantId } });
    if (!current || current.stock < line.qty) {
      failures.push({
        variantId: line.variantId,
        sku: current?.sku ?? "unknown",
        available: current?.stock ?? 0,
        requested: line.qty,
      });
      continue;
    }
    const updated = await tx.productVariant.updateMany({
      where: { id: line.variantId, stock: { gte: line.qty } },
      data: { stock: { decrement: line.qty } },
    });
    if (updated.count !== 1) {
      failures.push({
        variantId: line.variantId,
        sku: current.sku,
        available: current.stock,
        requested: line.qty,
      });
      continue;
    }
    await tx.inventoryLog.create({
      data: {
        variantId: line.variantId,
        delta: -line.qty,
        quantityAfter: current.stock - line.qty,
        reason: "SALE",
        note: current.sku,
      },
    });
  }
  if (failures.length > 0) {
    throw new StockUnavailableError(failures);
  }
}
