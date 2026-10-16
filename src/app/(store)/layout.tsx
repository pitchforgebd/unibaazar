import type { ReactNode } from "react";
import { StoreShell } from "@/components/store/layout/StoreShell";
import { readSession } from "@/server/auth/session";
import { isStaffRole } from "@/server/security/permissions";
import { loadGeneral, loadSystem } from "@/server/settings/store";

type StoreLayoutProps = {
  children: ReactNode;
};

export default async function StoreLayout({ children }: StoreLayoutProps) {
  const [system, general, session] = await Promise.all([
    loadSystem(),
    loadGeneral(),
    readSession(),
  ]);
  const staff = session ? isStaffRole(session.role) : false;
  if (system.maintenance && !staff) {
    return (
      <main className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-bold text-ink">{general.name}</h1>
        <p className="mt-2 text-sm text-muted">
          The store is temporarily closed for maintenance.
        </p>
      </main>
    );
  }
  return <StoreShell>{children}</StoreShell>;
}
