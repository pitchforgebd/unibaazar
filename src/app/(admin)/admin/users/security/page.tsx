import type { Metadata } from "next";
import { IpAllowlistPanel } from "@/components/admin/users/IpAllowlistPanel";
import { UsersDenied } from "@/components/admin/users/UsersDenied";
import { usersAccess } from "@/server/admin/access";
import { loadIpAllowlistText } from "@/server/admin/users";

export const metadata: Metadata = { title: "IP allow-list" };

export default async function SecurityPage() {
  const session = await usersAccess();
  if (!session) {
    return <UsersDenied />;
  }
  const value = await loadIpAllowlistText();
  return <IpAllowlistPanel value={value} />;
}
