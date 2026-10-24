import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { claimNotification } from "@/lib/notify/dedupe";
import { bulkSmsBdProvider } from "./bulksmsbd";

/**
 * `dedupeKey`, when passed, makes this call idempotent: a second call
 * with the same key (a retry, or an order legitimately re-reaching a
 * status it already notified for) logs as "skipped" instead of sending
 * again. Omit it for one-off sends (an admin's own "Test SMS" button)
 * that have nothing to dedupe against.
 */
export async function sendSms(
  to: string,
  body: string,
  context?: Prisma.InputJsonValue,
  dedupeKey?: string,
): Promise<void> {
  if (dedupeKey && !(await claimNotification(`sms:${dedupeKey}`))) {
    await prisma.smsLog.create({
      data: {
        to: to.slice(0, 20),
        body,
        provider: bulkSmsBdProvider.id,
        status: "skipped",
        response: { reason: "duplicate", dedupeKey } as Prisma.InputJsonValue,
      },
    });
    return;
  }
  const log = await prisma.smsLog.create({
    data: {
      to: to.slice(0, 20),
      body,
      provider: bulkSmsBdProvider.id,
      status: "queued",
      response: context,
    },
  });
  const result = await bulkSmsBdProvider.send(to, body);
  await prisma.smsLog
    .update({
      where: { id: log.id },
      data: {
        status: result.status,
        response: (result.providerResponse ?? {
          error: result.errorMessage,
        }) as Prisma.InputJsonValue,
      },
    })
    .catch(() => undefined);
}
