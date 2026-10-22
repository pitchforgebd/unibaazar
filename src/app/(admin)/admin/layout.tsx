import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { buttonClass } from "@/components/ui/controls";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { readSession } from "@/server/auth/session";
import { touchAuthSession } from "@/server/auth/sessions";
import { assertAdminIpAllowed } from "@/server/security/ip-allowlist";
import {
  ensurePermissionCache,
  isStaffRole,
  roleAllows,
} from "@/server/security/permissions";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await readSession();
  if (!session) {
    redirect("/login");
  }
  if (!isStaffRole(session.role)) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">Staff only</h1>
        <p className="mt-2 text-sm text-muted">
          This account cannot open the admin dashboard.
        </p>
        <Link href="/account" className={`${buttonClass("primary")} mt-4`}>
          Back to account
        </Link>
      </div>
    );
  }
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip")?.trim() ||
    "unknown";
  if (!(await assertAdminIpAllowed(session.role, ip))) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">IP not allowed</h1>
        <p className="mt-2 text-sm text-muted">
          This admin IP allow-list does not include {ip}. Ask a manager to update Users →
          Security.
        </p>
      </div>
    );
  }
  await ensurePermissionCache();
  void touchAuthSession(session.sid);
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true },
  });
  return (
    <AdminShell
      name={user?.name ?? "Staff"}
      canCatalog={roleAllows(session.role, "catalog.manage")}
      canOrders={roleAllows(session.role, "orders.manage")}
      canCustomers={roleAllows(session.role, "customers.manage")}
      canContent={roleAllows(session.role, "content.manage")}
      canReports={roleAllows(session.role, "reports.view")}
      canSettings={roleAllows(session.role, "settings.manage")}
      canUsers={roleAllows(session.role, "users.manage")}
      canMaintenance={session.role === "super-admin"}
    >
      {children}
    </AdminShell>
  );
}
