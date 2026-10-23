import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

/**
 * Records that a gateway webhook/IPN event has been processed, keyed by
 * the gateway's own transaction identifier. Returns `true` the first time
 * a given (provider, eventKey) pair is seen, `false` on every repeat — a
 * duplicate delivery (the gateway retries one it didn't get a 200 for, or
 * a replayed/captured request) is rejected via the table's unique
 * constraint before any Payment/Order write happens, which a status check
 * alone ("already PAID, no-op") can't guarantee under concurrent delivery
 * of the same event. Call this (or let it fail fast) *before* doing any
 * other work for the event.
 */
export async function claimWebhookEvent(
  db: PrismaClient | Prisma.TransactionClient,
  provider: string,
  eventKey: string,
): Promise<boolean> {
  try {
    await db.paymentWebhookEvent.create({ data: { provider, eventKey } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false;
    }
    throw error;
  }
}
