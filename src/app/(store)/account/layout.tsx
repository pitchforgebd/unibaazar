import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { AccountNav } from "@/components/store/account/AccountNav";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageTitle
        title="My account"
        subtitle="Orders and profile for the signed-in customer"
        crumbs={[{ href: "/", label: "Home" }, { label: "Account" }]}
      />
      <Container className="grid gap-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <AccountNav />
        <div>{children}</div>
      </Container>
    </>
  );
}
