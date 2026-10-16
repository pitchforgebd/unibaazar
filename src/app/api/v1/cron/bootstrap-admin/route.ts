import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { assertCronSecret } from "@/server/cron/auth";
import { permissions, roleGrants } from "@/server/security/permissions";
import { ApiError, handle, readJson } from "@/server/http";

const roles = [
  { slug: "super-admin", name: "Super Admin" },
  { slug: "admin", name: "Admin" },
  { slug: "manager", name: "Manager" },
  { slug: "staff", name: "Staff" },
  { slug: "content-editor", name: "Content Editor" },
  { slug: "accountant", name: "Accountant" },
  { slug: "customer", name: "Customer" },
];

// One-off bootstrap for hosts where `node prisma/seed.ts` can't run at all
// (see scripts/bootstrap-admin.cjs for why). Same idea, reachable through
// the already-running app process instead of a fresh `node` invocation.
// Gated behind CRON_SECRET like the other /api/v1/cron/* routes.
export async function POST(request: Request) {
  return handle(async () => {
    assertCronSecret(request);
    const body = (await readJson(request)) as Record<string, unknown> | null;
    const phone = typeof body?.phone === "string" ? body.phone : "01700000000";
    const password = typeof body?.password === "string" ? body.password : "";
    const name = typeof body?.name === "string" ? body.name : "Admin";
    const email = typeof body?.email === "string" ? body.email : "admin@unibaazar.com";
    if (!password || password.length < 8) {
      throw new ApiError(400, "Provide a password of at least 8 characters");
    }

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
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where: { phone },
      update: { name, email, passwordHash, roleId: adminRole.id },
      create: { roleId: adminRole.id, name, phone, email, passwordHash },
    });

    return { ok: true, phone };
  });
}
