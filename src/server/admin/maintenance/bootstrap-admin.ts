import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { permissions, roleGrants } from "@/server/security/permissions";

// Migrated from the old `/api/v1/cron/bootstrap-admin` route (deleted — see
// ARCHITECTURE.md §9): seeds roles/permissions/role-grants and upserts one
// admin user, reachable through the already-running app process instead of
// a fresh `node`/`tsx` invocation that would crash on this host
// (ARCHITECTURE.md §12). Every write is an upsert, so running it again with
// the same phone just updates that same account.

const roles = [
  { slug: "super-admin", name: "Super Admin" },
  { slug: "admin", name: "Admin" },
  { slug: "manager", name: "Manager" },
  { slug: "staff", name: "Staff" },
  { slug: "content-editor", name: "Content Editor" },
  { slug: "accountant", name: "Accountant" },
  { slug: "customer", name: "Customer" },
];

export type BootstrapAdminInput = {
  phone: string;
  password: string;
  name: string;
  email: string;
};

export type BootstrapAdminResult = {
  phone: string;
};

export async function bootstrapAdminAccount(
  input: BootstrapAdminInput,
): Promise<BootstrapAdminResult> {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: { name: role.name },
      create: role,
    });
  }
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { slug: permission.slug },
      update: { name: permission.name },
      create: permission,
    });
  }
  for (const [roleSlug, grants] of Object.entries(roleGrants)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { slug: roleSlug } });
    for (const permissionSlug of grants) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { slug: permissionSlug },
      });
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { slug: "admin" } });
  const passwordHash = await bcrypt.hash(input.password, 10);
  await prisma.user.upsert({
    where: { phone: input.phone },
    update: {
      name: input.name,
      email: input.email,
      passwordHash,
      roleId: adminRole.id,
    },
    create: {
      roleId: adminRole.id,
      name: input.name,
      phone: input.phone,
      email: input.email,
      passwordHash,
    },
  });

  return { phone: input.phone };
}
