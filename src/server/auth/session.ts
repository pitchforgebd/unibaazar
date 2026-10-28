import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { secureCookies } from "@/server/security/cookies";

const cookieName = "ub_session";
const pending2faCookie = "ub_2fa";

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required");
  }
  return new TextEncoder().encode(value || "unibaazar-dev-secret");
}

export type Session = {
  userId: string;
  role: string;
  sid?: string;
};

export const sessionCookie = {
  name: cookieName,
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookies,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  },
};

export const pending2faCookieOptions = {
  name: pending2faCookie,
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: secureCookies,
    path: "/",
    maxAge: 60 * 10,
  },
};

export async function signSession(session: Session): Promise<string> {
  const token = new SignJWT({
    role: session.role,
    ...(session.sid ? { sid: session.sid } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime("7d");
  return token.sign(secret());
}

export async function signPending2fa(userId: string): Promise<string> {
  return new SignJWT({ purpose: "2fa" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret());
}

export async function readPending2faToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || payload.purpose !== "2fa") {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

export async function readSessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.role !== "string") {
      return null;
    }
    const sid = typeof payload.sid === "string" ? payload.sid : undefined;
    if (sid) {
      const row = await prisma.authSession.findUnique({ where: { id: sid } });
      if (
        !row ||
        row.userId !== payload.sub ||
        row.revokedAt ||
        row.expiresAt < new Date()
      ) {
        return null;
      }
    }
    return { userId: payload.sub, role: payload.role, sid };
  } catch {
    return null;
  }
}

export async function readSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (!token) {
    return null;
  }
  return readSessionToken(token);
}

export async function readPending2fa(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(pending2faCookie)?.value;
  if (!token) {
    return null;
  }
  return readPending2faToken(token);
}
