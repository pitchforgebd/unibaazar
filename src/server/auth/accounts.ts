import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import type { AuthCodePurpose } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeBdPhone } from "@/lib/validation/customer";
import { ApiError } from "@/server/http";
import { signSession, type Session } from "@/server/auth/session";

const customerRole = "customer";

function identityPhone(identity: string): string | null {
  return normalizeBdPhone(identity);
}

async function customerRoleId(): Promise<string> {
  const role = await prisma.role.findUnique({ where: { slug: customerRole } });
  if (!role) {
    throw new ApiError(500, "The customer role is missing. Run the database seed.");
  }
  return role.id;
}

export async function registerAccount(input: {
  name: string;
  phone: string;
  email: string;
  password: string;
}): Promise<Session> {
  const phone = normalizeBdPhone(input.phone);
  if (!phone) {
    throw new ApiError(400, "Enter a valid Bangladeshi mobile number");
  }
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ phone }, ...(input.email ? [{ email: input.email }] : [])],
    },
  });
  if (existing) {
    throw new ApiError(409, "An account already uses that phone or email");
  }
  const roleId = await customerRoleId();
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      roleId,
      name: input.name,
      phone,
      email: input.email || null,
      passwordHash,
      customer: {
        create: {
          name: input.name,
          phone,
          email: input.email || null,
        },
      },
    },
    include: { role: true },
  });
  return { userId: user.id, role: user.role.slug };
}

export type LoginResult =
  { kind: "session"; session: Session } | { kind: "2fa"; userId: string; role: string };

export async function loginAccount(
  identity: string,
  password: string,
): Promise<LoginResult> {
  const phone = identityPhone(identity);
  const user = await prisma.user.findFirst({
    where: phone ? { phone } : { email: identity.trim().toLowerCase() },
    include: { role: true },
  });
  if (!user || user.status !== "ACTIVE") {
    throw new ApiError(401, "Phone, email, or password is incorrect");
  }
  if (!user.passwordHash) {
    throw new ApiError(401, "Sign in with Google or Facebook for this account");
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new ApiError(401, "Phone, email, or password is incorrect");
  }
  const totpRows = await prisma.$queryRaw<
    Array<{ totpEnabled: number | boolean; totpSecret: string | null }>
  >`
    SELECT totpEnabled, totpSecret FROM User WHERE id = ${user.id} LIMIT 1
  `;
  const totp = totpRows[0];
  if (totp && (totp.totpEnabled === true || totp.totpEnabled === 1) && totp.totpSecret) {
    return { kind: "2fa", userId: user.id, role: user.role.slug };
  }
  return { kind: "session", session: { userId: user.id, role: user.role.slug } };
}

export async function sessionToken(session: Session): Promise<string> {
  return signSession(session);
}

export async function userFor2fa(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user) {
    return null;
  }
  const totpRows = await prisma.$queryRaw<
    Array<{ totpEnabled: number | boolean; totpSecret: string | null }>
  >`
    SELECT totpEnabled, totpSecret FROM User WHERE id = ${userId} LIMIT 1
  `;
  const totp = totpRows[0];
  return {
    ...user,
    totpEnabled: Boolean(totp && (totp.totpEnabled === true || totp.totpEnabled === 1)),
    totpSecret: totp?.totpSecret ?? null,
  };
}

async function findUserByIdentity(identity: string) {
  const phone = identityPhone(identity);
  return prisma.user.findFirst({
    where: phone ? { phone } : { email: identity.trim().toLowerCase() },
  });
}

async function issueCode(userId: string, purpose: AuthCodePurpose): Promise<string> {
  const code = String(randomInt(100000, 1000000));
  const codeHash = await bcrypt.hash(code, 10);
  await prisma.authCode.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.authCode.create({
    data: {
      userId,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  return code;
}

export async function requestOtp(phoneInput: string): Promise<string | null> {
  const phone = normalizeBdPhone(phoneInput);
  if (!phone) {
    throw new ApiError(400, "Enter a valid Bangladeshi mobile number");
  }
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    return null;
  }
  return issueCode(user.id, "OTP");
}

export async function verifyOtp(phoneInput: string, code: string): Promise<Session> {
  const phone = normalizeBdPhone(phoneInput);
  if (!phone) {
    throw new ApiError(400, "Enter a valid Bangladeshi mobile number");
  }
  const user = await prisma.user.findUnique({
    where: { phone },
    include: { role: true },
  });
  if (!user) {
    throw new ApiError(401, "That code is not valid");
  }
  await consumeCode(user.id, "OTP", code);
  return { userId: user.id, role: user.role.slug };
}

export async function requestReset(identity: string): Promise<string | null> {
  const user = await findUserByIdentity(identity);
  if (!user) {
    return null;
  }
  return issueCode(user.id, "RESET");
}

export async function resetPassword(
  identity: string,
  code: string,
  password: string,
): Promise<void> {
  const user = await findUserByIdentity(identity);
  if (!user) {
    throw new ApiError(400, "That code is not valid");
  }
  await consumeCode(user.id, "RESET", code);
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
}

async function consumeCode(
  userId: string,
  purpose: AuthCodePurpose,
  code: string,
): Promise<void> {
  const rows = await prisma.authCode.findMany({
    where: { userId, purpose, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  for (const row of rows) {
    const match = await bcrypt.compare(code, row.codeHash);
    if (!match) {
      continue;
    }
    await prisma.authCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    return;
  }
  throw new ApiError(400, "That code is not valid");
}

export async function publicAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { customer: true, role: true },
  });
  if (!user) {
    throw new ApiError(401, "Sign in again");
  }
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email ?? "",
    role: user.role.slug,
  };
}
