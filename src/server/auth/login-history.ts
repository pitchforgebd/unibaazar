import { prisma } from "@/lib/db";

function loginEventsReady(): boolean {
  return typeof (prisma as { loginEvent?: unknown }).loginEvent === "object";
}

export async function recordLoginEvent(input: {
  userId?: string | null;
  identity: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
  reason?: string;
}): Promise<void> {
  if (!loginEventsReady()) {
    return;
  }
  await prisma.loginEvent.create({
    data: {
      userId: input.userId || null,
      identity: input.identity.slice(0, 191),
      success: input.success,
      ipAddress: input.ip?.slice(0, 64) || null,
      userAgent: input.userAgent?.slice(0, 255) || null,
      reason: input.reason?.slice(0, 64) || null,
    },
  });
}
