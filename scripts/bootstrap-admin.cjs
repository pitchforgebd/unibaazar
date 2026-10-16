// Plain CommonJS on purpose — no TypeScript/esbuild/tsx, so it runs on
// hosts that can't spawn the extra OS threads those need. Seeds just enough
// to log into /admin: roles, permissions, role grants, and the admin user.
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const roles = [
  { slug: "super-admin", name: "Super Admin" },
  { slug: "admin", name: "Admin" },
  { slug: "manager", name: "Manager" },
  { slug: "staff", name: "Staff" },
  { slug: "content-editor", name: "Content Editor" },
  { slug: "accountant", name: "Accountant" },
  { slug: "customer", name: "Customer" },
];

const permissions = [
  { slug: "catalog.manage", name: "Manage catalog" },
  { slug: "orders.manage", name: "Manage orders" },
  { slug: "customers.manage", name: "Manage customers" },
  { slug: "content.manage", name: "Manage content" },
  { slug: "reports.view", name: "View reports" },
  { slug: "settings.manage", name: "Manage settings" },
  { slug: "users.manage", name: "Manage users" },
];

const roleGrants = {
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

const ADMIN_PHONE = process.env.ADMIN_PHONE || "01700000000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@unibaazar.com";

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_PASSWORD before running this script.");
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
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { slug: "admin" } });
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    update: { name: ADMIN_NAME, email: ADMIN_EMAIL, passwordHash, roleId: adminRole.id },
    create: {
      roleId: adminRole.id,
      name: ADMIN_NAME,
      phone: ADMIN_PHONE,
      email: ADMIN_EMAIL,
      passwordHash,
    },
  });

  console.log(`Done. Admin login: ${ADMIN_PHONE}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
