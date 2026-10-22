import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { ForgotForm } from "@/components/store/auth/AuthForms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("forgotMetaTitle") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  const common = await getTranslations("common");
  return (
    <>
      <PageTitle
        title={t("forgotPageTitle")}
        crumbs={[{ href: "/", label: common("home") }, { label: t("forgotCrumb") }]}
      />
      <Container className="py-8">
        <ForgotForm />
      </Container>
    </>
  );
}
