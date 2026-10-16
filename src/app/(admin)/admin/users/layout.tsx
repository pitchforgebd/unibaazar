import type { ReactNode } from "react";
import { UsersNav } from "@/components/admin/users/UsersNav";

export default function UsersLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <UsersNav />
      {children}
    </div>
  );
}
