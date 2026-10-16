import type { Metadata } from "next";
import { StaffPanel } from "@/components/admin/users/StaffPanel";
import { UsersDenied } from "@/components/admin/users/UsersDenied";
import { usersAccess } from "@/server/admin/access";
import { listStaff, staffRoles } from "@/server/admin/users";

export const metadata: Metadata = { title: "Staff" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UsersPage({ searchParams }: PageProps) {
  const session = await usersAccess();
  if (!session) {
    return <UsersDenied />;
  }
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const [rows, roles] = await Promise.all([listStaff(q), staffRoles()]);
  return (
    <StaffPanel
      rows={rows}
      roles={roles.map((role) => ({ slug: role.slug, name: role.name }))}
      query={q}
    />
  );
}
