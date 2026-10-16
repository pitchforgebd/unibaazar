import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { bulkSmsBdProvider } from "./bulksmsbd";

export async function sendSms(
  to: string,
  body: string,
  context?: Prisma.InputJsonValue,
): Promise<void> {
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
