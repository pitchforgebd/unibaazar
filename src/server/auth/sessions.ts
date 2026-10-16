import { prisma } from "@/lib/db";
import type { Session } from "@/server/auth/session";

const SESSION_MS = 60 * 60 * 24 * 7;

function sessionsReady(): boolean {
  return typeof (prisma as { authSession?: unknown }).authSession === "object";
}

export async function createAuthSession(input: {
  userId: string;
  role: string;
  ip?: string;
  userAgent?: string;
}): Promise<Session> {
  if (!sessionsReady()) {
    return { userId: input.userId, role: input.role };
  }
  const expiresAt = new Date(Date.now() + SESSION_MS);
  const row = await prisma.authSession.create({
    data: {
      userId: input.userId,
      expiresAt,
      ipAddress: input.ip?.slice(0, 64) || null,
      userAgent: input.userAgent?.slice(0, 255) || null,
    },
  });
  return { userId: input.userId, role: input.role, sid: row.id };
}

export async function touchAuthSession(sid: string | undefined): Promise<void> {
  if (!sid || !sessionsReady()) {
    return;
  }
  await prisma.authSession.updateMany({
    where: { id: sid, revokedAt: null, expiresAt: { gt: new Date() } },
    data: { lastSeenAt: new Date() },
  });
}

export async function revokeAuthSession(
  sessionId: string,
  userId?: string,
): Promise<boolean> {
  if (!sessionsReady()) {
    return false;
  }
  const result = await prisma.authSession.updateMany({
    where: {
      id: sessionId,
      revokedAt: null,
      ...(userId ? { userId } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return result.count > 0;
}

export async function revokeOtherSessions(
  userId: string,
  keepSid?: string,
): Promise<number> {
  if (!sessionsReady()) {
    return 0;
  }
  const result = await prisma.authSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(keepSid ? { id: { not: keepSid } } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export async function listUserSessions(userId: string) {
  if (!sessionsReady()) {
    return [];
  }
  return prisma.authSession.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    take: 50,
  });
}
