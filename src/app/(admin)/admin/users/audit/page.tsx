import type { Metadata } from "next";
import { AuditLogPanel } from "@/components/admin/users/AuditLogPanel";
import { UsersDenied } from "@/components/admin/users/UsersDenied";
import { usersAccess } from "@/server/admin/access";
import { listAuditLogs } from "@/server/admin/users";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage() {
  const session = await usersAccess();
  if (!session) {
    return <UsersDenied />;
  }
  const rows = await listAuditLogs();
  return <AuditLogPanel rows={rows} />;
}
