import type { Metadata } from "next";
import { LoginHistoryPanel } from "@/components/admin/users/LoginHistoryPanel";
import { UsersDenied } from "@/components/admin/users/UsersDenied";
import { usersAccess } from "@/server/admin/access";
import { listLoginHistory } from "@/server/admin/users";

export const metadata: Metadata = { title: "Login history" };

export default async function LoginsPage() {
  const session = await usersAccess();
  if (!session) {
    return <UsersDenied />;
  }
  const rows = await listLoginHistory();
  return <LoginHistoryPanel rows={rows} />;
}
