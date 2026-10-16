import bcrypt from "bcryptjs";
import type { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeBdPhone } from "@/lib/validation/customer";
import { ApiError } from "@/server/http";
import { recordAudit } from "@/server/security/audit";
import {
  adminIpAllowlistText,
  saveAdminIpAllowlist,
} from "@/server/security/ip-allowlist";
import {
  isStaffRole,
  permissions,
  reloadPermissionCache,
  roleGrants,
  staffRoleSlugs,
} from "@/server/security/permissions";
import { generateTotpSecret, totpOtpauthUrl, verifyTotp } from "@/server/auth/totp";
import { revokeAuthSession, revokeOtherSessions } from "@/server/auth/sessions";

export { staffRoleSlugs };

export type StaffRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  roleName: string;
  status: UserStatus;
  totpEnabled: boolean;
  createdAt: string;
};

export async function listStaff(q = ""): Promise<StaffRow[]> {
  const query = q.trim();
  const rows = await prisma.user.findMany({
    where: {
      role: { slug: { in: [...staffRoleSlugs] } },
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { phone: { contains: query } },
              { email: { contains: query } },
            ],
          }
        : {}),
    },
    include: { role: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const totpMap = new Map<string, boolean>();
  if (rows.length) {
    const totpRows = await prisma.$queryRawUnsafe<
      Array<{ id: string; totpEnabled: number | boolean }>
    >(
      `SELECT id, totpEnabled FROM User WHERE id IN (${rows.map(() => "?").join(",")})`,
      ...rows.map((row) => row.id),
    );
    for (const row of totpRows) {
      totpMap.set(row.id, row.totpEnabled === true || row.totpEnabled === 1);
    }
  }
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? "",
    role: row.role.slug,
    roleName: row.role.name,
    status: row.status,
    totpEnabled: totpMap.get(row.id) ?? false,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function staffRoles() {
  return prisma.role.findMany({
    where: { slug: { in: [...staffRoleSlugs] } },
    orderBy: { name: "asc" },
  });
}

export async function createStaff(
  actorId: string,
  input: {
    name: string;
    phone: string;
    email: string;
    password: string;
    roleSlug: string;
  },
): Promise<string> {
  if (!isStaffRole(input.roleSlug) || input.roleSlug === "customer") {
    throw new ApiError(400, "Pick a staff role");
  }
  const phone = normalizeBdPhone(input.phone);
  if (!phone) {
    throw new ApiError(400, "Enter a valid Bangladeshi mobile number");
  }
  const email = input.email.trim().toLowerCase() || null;
  const existing = await prisma.user.findFirst({
    where: { OR: [{ phone }, ...(email ? [{ email }] : [])] },
  });
  if (existing) {
    throw new ApiError(409, "An account already uses that phone or email");
  }
  const role = await prisma.role.findUniqueOrThrow({ where: { slug: input.roleSlug } });
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      roleId: role.id,
      name: input.name.trim(),
      phone,
      email,
      passwordHash,
      status: "ACTIVE",
    },
  });
  await recordAudit({
    actorId,
    action: "users.create",
    entityType: "User",
    entityId: user.id,
    metadata: { role: input.roleSlug },
  });
  return user.id;
}

export async function updateStaff(
  actorId: string,
  input: {
    userId: string;
    name: string;
    email: string;
    roleSlug: string;
    status: UserStatus;
    password?: string;
  },
): Promise<void> {
  if (!isStaffRole(input.roleSlug)) {
    throw new ApiError(400, "Pick a staff role");
  }
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    include: { role: true },
  });
  if (!user || !isStaffRole(user.role.slug)) {
    throw new ApiError(404, "Staff account not found");
  }
  if (actorId === input.userId && input.status === "DISABLED") {
    throw new ApiError(400, "You cannot disable your own account");
  }
  const role = await prisma.role.findUniqueOrThrow({ where: { slug: input.roleSlug } });
  const email = input.email.trim().toLowerCase() || null;
  if (email && email !== user.email) {
    const taken = await prisma.user.findFirst({
      where: { email, id: { not: user.id } },
    });
    if (taken) {
      throw new ApiError(409, "An account already uses that email");
    }
  }
  const passwordHash =
    input.password && input.password.length >= 6
      ? await bcrypt.hash(input.password, 10)
      : undefined;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: input.name.trim(),
      email,
      roleId: role.id,
      status: input.status,
      ...(passwordHash ? { passwordHash } : {}),
    },
  });
  await recordAudit({
    actorId,
    action: "users.update",
    entityType: "User",
    entityId: user.id,
    metadata: { role: input.roleSlug, status: input.status },
  });
}

export async function rolesMatrix() {
  const roles = await prisma.role.findMany({
    where: { slug: { in: [...staffRoleSlugs] } },
    include: { permissions: { include: { permission: true } } },
    orderBy: { name: "asc" },
  });
  const allPermissions = await prisma.permission.findMany({ orderBy: { slug: "asc" } });
  return {
    permissions: allPermissions.map((row) => ({
      slug: row.slug,
      name: row.name,
    })),
    roles: roles.map((role) => ({
      id: role.id,
      slug: role.slug,
      name: role.name,
      grants: role.permissions.map((row) => row.permission.slug),
    })),
  };
}

export async function setRolePermission(
  actorId: string,
  roleSlug: string,
  permissionSlug: string,
  enabled: boolean,
): Promise<void> {
  if (!isStaffRole(roleSlug)) {
    throw new ApiError(400, "That role cannot be edited here");
  }
  if (
    !(permissions as readonly { slug: string }[]).some(
      (row) => row.slug === permissionSlug,
    )
  ) {
    throw new ApiError(400, "Unknown permission");
  }
  const role = await prisma.role.findUniqueOrThrow({ where: { slug: roleSlug } });
  const permission = await prisma.permission.findUniqueOrThrow({
    where: { slug: permissionSlug },
  });
  if (enabled) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: role.id, permissionId: permission.id },
      },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  } else {
    if (roleSlug === "super-admin" && permissionSlug === "users.manage") {
      throw new ApiError(400, "Super admin must keep manage users");
    }
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: permission.id },
    });
  }
  await recordAudit({
    actorId,
    action: enabled ? "roles.grant" : "roles.revoke",
    entityType: "Role",
    entityId: role.id,
    metadata: { permission: permissionSlug },
  });
  await reloadPermissionCache();
}

export async function syncRoleGrantsFromCode(actorId: string): Promise<void> {
  for (const [slug, grants] of Object.entries(roleGrants)) {
    if (!isStaffRole(slug)) {
      continue;
    }
    const role = await prisma.role.findUnique({ where: { slug } });
    if (!role) {
      continue;
    }
    for (const permissionSlug of grants) {
      const permission = await prisma.permission.findUnique({
        where: { slug: permissionSlug },
      });
      if (!permission) {
        continue;
      }
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
  await recordAudit({
    actorId,
    action: "roles.sync",
    entityType: "Role",
  });
  await reloadPermissionCache();
}

export async function listAuditLogs(limit = 100) {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { name: true, phone: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
    actor: row.actor ? `${row.actor.name} (${row.actor.phone})` : "System",
    metadata: row.metadata,
  }));
}

export async function listLoginHistory(limit = 100) {
  if (typeof (prisma as { loginEvent?: unknown }).loginEvent !== "object") {
    return [];
  }
  const rows = await prisma.loginEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, phone: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    identity: row.identity,
    success: row.success,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    user: row.user ? `${row.user.name} (${row.user.phone})` : null,
  }));
}

export async function listManagedSessions(limit = 100) {
  if (typeof (prisma as { authSession?: unknown }).authSession !== "object") {
    return [];
  }
  const rows = await prisma.authSession.findMany({
    where: { expiresAt: { gt: new Date() }, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    take: limit,
    include: {
      user: {
        select: { id: true, name: true, phone: true, role: { select: { slug: true } } },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    user: `${row.user.name} (${row.user.phone})`,
    role: row.user.role.slug,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  }));
}

export async function revokeManagedSession(
  actorId: string,
  sessionId: string,
): Promise<void> {
  const ok = await revokeAuthSession(sessionId);
  if (!ok) {
    throw new ApiError(404, "Session not found");
  }
  await recordAudit({
    actorId,
    action: "sessions.revoke",
    entityType: "AuthSession",
    entityId: sessionId,
  });
}

export async function loadIpAllowlistText(): Promise<string> {
  return adminIpAllowlistText();
}

export async function saveIpAllowlist(actorId: string, value: string): Promise<void> {
  await saveAdminIpAllowlist(value);
  await recordAudit({
    actorId,
    action: "security.ip_allowlist",
    entityType: "Setting",
    entityId: "security.adminIpAllowlist",
  });
}

type TotpRow = {
  totpSecret: string | null;
  totpEnabled: number | boolean;
  phone: string;
  email: string | null;
};

async function readTotpRow(userId: string): Promise<TotpRow | null> {
  const rows = await prisma.$queryRaw<TotpRow[]>`
    SELECT totpSecret, totpEnabled, phone, email FROM User WHERE id = ${userId} LIMIT 1
  `;
  return rows[0] ?? null;
}

function totpOn(value: number | boolean): boolean {
  return value === true || value === 1;
}

export async function userTotpEnabled(userId: string): Promise<boolean> {
  const row = await readTotpRow(userId);
  return row ? totpOn(row.totpEnabled) : false;
}

export async function beginTotpSetup(
  userId: string,
): Promise<{ secret: string; otpauth: string }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const secret = generateTotpSecret();
  await prisma.$executeRaw`
    UPDATE User SET totpSecret = ${secret}, totpEnabled = false WHERE id = ${userId}
  `;
  return {
    secret,
    otpauth: totpOtpauthUrl(secret, user.phone || user.email || userId),
  };
}

export async function confirmTotpSetup(userId: string, code: string): Promise<void> {
  const row = await readTotpRow(userId);
  if (!row?.totpSecret) {
    throw new ApiError(400, "Start 2FA setup again");
  }
  if (!verifyTotp(row.totpSecret, code)) {
    throw new ApiError(400, "That code is not valid");
  }
  await prisma.$executeRaw`UPDATE User SET totpEnabled = true WHERE id = ${userId}`;
  await recordAudit({
    actorId: userId,
    action: "auth.2fa.enable",
    entityType: "User",
    entityId: userId,
  });
}

export async function disableTotp(userId: string, code: string): Promise<void> {
  const row = await readTotpRow(userId);
  if (!row?.totpSecret || !totpOn(row.totpEnabled)) {
    await prisma.$executeRaw`
      UPDATE User SET totpSecret = NULL, totpEnabled = false WHERE id = ${userId}
    `;
    return;
  }
  if (!verifyTotp(row.totpSecret, code)) {
    throw new ApiError(400, "That code is not valid");
  }
  await prisma.$executeRaw`
    UPDATE User SET totpSecret = NULL, totpEnabled = false WHERE id = ${userId}
  `;
  await recordAudit({
    actorId: userId,
    action: "auth.2fa.disable",
    entityType: "User",
    entityId: userId,
  });
}

export async function logoutOtherDevices(
  userId: string,
  keepSid?: string,
): Promise<number> {
  return revokeOtherSessions(userId, keepSid);
}

export async function staffDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user || !isStaffRole(user.role.slug)) {
    return null;
  }
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email ?? "",
    role: user.role.slug,
    status: user.status,
    totpEnabled: user.totpEnabled,
  };
}
