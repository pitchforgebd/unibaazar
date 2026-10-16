import type { Metadata } from "next";
import { RolesMatrix } from "@/components/admin/users/RolesMatrix";
import { UsersDenied } from "@/components/admin/users/UsersDenied";
import { usersAccess } from "@/server/admin/access";
import { rolesMatrix } from "@/server/admin/users";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const session = await usersAccess();
  if (!session) {
    return <UsersDenied />;
  }
  const matrix = await rolesMatrix();
  return <RolesMatrix matrix={matrix} />;
}
