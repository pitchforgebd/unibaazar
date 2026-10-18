import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { AccountNav } from "@/components/store/account/AccountNav";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("account");
  const common = await getTranslations("common");
  return (
    <>
      <PageTitle
        title={t("pageTitle")}
        subtitle={t("subtitle")}
        crumbs={[{ href: "/", label: common("home") }, { label: t("crumb") }]}
      />
      <Container className="grid gap-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <AccountNav />
        <div>{children}</div>
      </Container>
    </>
  );
}
