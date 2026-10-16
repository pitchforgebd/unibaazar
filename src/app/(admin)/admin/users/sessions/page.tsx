import type { Metadata } from "next";
import { SessionsPanel } from "@/components/admin/users/SessionsPanel";
import { UsersDenied } from "@/components/admin/users/UsersDenied";
import { usersAccess } from "@/server/admin/access";
import { listManagedSessions } from "@/server/admin/users";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage() {
  const session = await usersAccess();
  if (!session) {
    return <UsersDenied />;
  }
  const rows = await listManagedSessions();
  return <SessionsPanel rows={rows} />;
}
