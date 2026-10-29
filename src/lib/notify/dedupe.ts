import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Claims a notification dedupe key, same shape and purpose as
 * modules/payments' claimWebhookEvent() but for outbound SMS/email
 * instead of inbound gateway webhooks. Returns `true` the first time a
 * given key is seen, `false` on every repeat — a duplicate or raced
 * call (e.g. a network retry re-entering the same code path, or an
 * order legitimately re-reaching a status it already notified for)
 * is rejected via the table's unique constraint before the send
 * happens, which checking application state alone can't guarantee
 * under a race. `sendSms`/`sendEmail` treat a missing key as "always
 * send" — dedupe is opt-in per call site, not forced on every message
 * (a one-off admin test-send has nothing to dedupe against).
 */
export async function claimNotification(key: string): Promise<boolean> {
  try {
    await prisma.notificationDedupe.create({ data: { key } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false;
    }
    throw error;
  }
}
