import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function recordAudit(input: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ip?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      ipAddress: input.ip,
      metadata: input.metadata,
    },
  });
}
