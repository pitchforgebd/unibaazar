"use server";

import { revalidatePath } from "next/cache";
import {
  createStaffSchema,
  ipAllowlistSchema,
  rolePermissionSchema,
  sessionIdSchema,
  totpCodeSchema,
  updateStaffSchema,
} from "@/lib/validation/admin-users";
import { requireUsers } from "@/server/admin/access";
import { actionError, type ActionResult } from "@/server/admin/result";
import {
  beginTotpSetup,
  confirmTotpSetup,
  createStaff,
  disableTotp,
  logoutOtherDevices,
  revokeManagedSession,
  saveIpAllowlist,
  setRolePermission,
  syncRoleGrantsFromCode,
  updateStaff,
} from "@/server/admin/users";
import { readSession } from "@/server/auth/session";

function refreshUsers(): void {
  revalidatePath("/admin/users");
  revalidatePath("/admin/users/roles");
  revalidatePath("/admin/users/audit");
  revalidatePath("/admin/users/logins");
  revalidatePath("/admin/users/sessions");
  revalidatePath("/admin/users/security");
}

export async function createStaffAction(input: unknown): Promise<ActionResult> {
  const session = await requireUsers();
  try {
    const parsed = createStaffSchema.parse(input);
    await createStaff(session.userId, {
      ...parsed,
      email: parsed.email ?? "",
    });
    refreshUsers();
    return { ok: true, message: "Staff account created." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function updateStaffAction(input: unknown): Promise<ActionResult> {
  const session = await requireUsers();
  try {
    const parsed = updateStaffSchema.parse(input);
    await updateStaff(session.userId, {
      userId: parsed.userId,
      name: parsed.name,
      email: parsed.email ?? "",
      roleSlug: parsed.roleSlug,
      status: parsed.status,
      password: parsed.password || undefined,
    });
    refreshUsers();
    return { ok: true, message: "Staff account updated." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function setRolePermissionAction(input: unknown): Promise<ActionResult> {
  const session = await requireUsers();
  try {
    const parsed = rolePermissionSchema.parse(input);
    await setRolePermission(
      session.userId,
      parsed.roleSlug,
      parsed.permissionSlug,
      parsed.enabled,
    );
    refreshUsers();
    return {
      ok: true,
      message: parsed.enabled ? "Permission granted." : "Permission removed.",
    };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function syncRolesAction(): Promise<ActionResult> {
  const session = await requireUsers();
  try {
    await syncRoleGrantsFromCode(session.userId);
    refreshUsers();
    return { ok: true, message: "Roles synced from code defaults." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function revokeSessionAction(input: unknown): Promise<ActionResult> {
  const session = await requireUsers();
  try {
    const parsed = sessionIdSchema.parse(input);
    await revokeManagedSession(session.userId, parsed.sessionId);
    refreshUsers();
    return { ok: true, message: "Session revoked." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function saveIpAllowlistAction(input: unknown): Promise<ActionResult> {
  const session = await requireUsers();
  try {
    const parsed = ipAllowlistSchema.parse(input);
    await saveIpAllowlist(session.userId, parsed.value);
    refreshUsers();
    return { ok: true, message: "IP allow-list saved." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function beginTotpAction(): Promise<
  ActionResult & { secret?: string; otpauth?: string }
> {
  const session = await readSession();
  if (!session) {
    return { ok: false, message: "Sign in again" };
  }
  try {
    const setup = await beginTotpSetup(session.userId);
    revalidatePath("/admin/users/security");
    return { ok: true, message: "Scan the QR code, then confirm with a code.", ...setup };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function confirmTotpAction(input: unknown): Promise<ActionResult> {
  const session = await readSession();
  if (!session) {
    return { ok: false, message: "Sign in again" };
  }
  try {
    const parsed = totpCodeSchema.parse(input);
    await confirmTotpSetup(session.userId, parsed.code);
    revalidatePath("/admin/users/security");
    return { ok: true, message: "Two-factor authentication is on." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function disableTotpAction(input: unknown): Promise<ActionResult> {
  const session = await readSession();
  if (!session) {
    return { ok: false, message: "Sign in again" };
  }
  try {
    const parsed = totpCodeSchema.parse(input);
    await disableTotp(session.userId, parsed.code);
    revalidatePath("/admin/users/security");
    return { ok: true, message: "Two-factor authentication is off." };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}

export async function logoutOtherDevicesAction(): Promise<ActionResult> {
  const session = await readSession();
  if (!session) {
    return { ok: false, message: "Sign in again" };
  }
  try {
    const count = await logoutOtherDevices(session.userId, session.sid);
    revalidatePath("/admin/users/sessions");
    revalidatePath("/admin/users/security");
    return {
      ok: true,
      message: `Signed out ${count} other session${count === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return { ok: false, message: actionError(error) };
  }
}
