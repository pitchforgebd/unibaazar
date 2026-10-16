import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TotpPanel } from "@/components/admin/users/TotpPanel";
import { userTotpEnabled } from "@/server/admin/users";
import { readSession } from "@/server/auth/session";
import { isStaffRole } from "@/server/security/permissions";

export const metadata: Metadata = { title: "My 2FA" };

export default async function TotpPage() {
  const session = await readSession();
  if (!session || !isStaffRole(session.role)) {
    redirect("/login");
  }
  const enabled = await userTotpEnabled(session.userId);
  return <TotpPanel enabled={enabled} />;
}
