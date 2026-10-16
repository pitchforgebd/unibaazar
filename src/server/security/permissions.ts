import { prisma } from "@/lib/db";

export const permissions = [
  { slug: "catalog.manage", name: "Manage catalog" },
  { slug: "orders.manage", name: "Manage orders" },
  { slug: "customers.manage", name: "Manage customers" },
  { slug: "content.manage", name: "Manage content" },
  { slug: "reports.view", name: "View reports" },
  { slug: "settings.manage", name: "Manage settings" },
  { slug: "users.manage", name: "Manage users" },
] as const;

export type PermissionSlug = (typeof permissions)[number]["slug"];

export const roleGrants: Record<string, readonly PermissionSlug[]> = {
  "super-admin": permissions.map((item) => item.slug),
  admin: [
    "catalog.manage",
    "orders.manage",
    "customers.manage",
    "content.manage",
    "reports.view",
    "settings.manage",
    "users.manage",
  ],
  manager: ["catalog.manage", "orders.manage", "customers.manage", "reports.view"],
  staff: ["orders.manage"],
  "content-editor": ["catalog.manage", "content.manage"],
  accountant: ["reports.view"],
  customer: [],
};

let grantCache: Record<string, readonly string[]> = { ...roleGrants };
let cacheLoaded = false;

export function roleAllows(role: string, permission: string): boolean {
  return (grantCache[role] ?? []).includes(permission);
}

export async function reloadPermissionCache(): Promise<void> {
  const roles = await prisma.role.findMany({
    include: { permissions: { include: { permission: true } } },
  });
  const next: Record<string, string[]> = {
    ...Object.fromEntries(
      Object.entries(roleGrants).map(([slug, grants]) => [slug, [...grants]]),
    ),
  };
  for (const role of roles) {
    next[role.slug] = role.permissions.map((row) => row.permission.slug);
  }
  grantCache = next;
  cacheLoaded = true;
}

export async function ensurePermissionCache(): Promise<void> {
  if (cacheLoaded) {
    return;
  }
  try {
    await reloadPermissionCache();
  } catch {
    grantCache = { ...roleGrants };
    cacheLoaded = true;
  }
}

export const staffRoleSlugs = [
  "super-admin",
  "admin",
  "manager",
  "staff",
  "content-editor",
  "accountant",
] as const;

export type StaffRoleSlug = (typeof staffRoleSlugs)[number];

export function isStaffRole(role: string): boolean {
  return (staffRoleSlugs as readonly string[]).includes(role);
}
