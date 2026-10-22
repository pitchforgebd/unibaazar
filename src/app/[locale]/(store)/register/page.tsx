import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { RegisterForm } from "@/components/store/auth/AuthForms";
import { SocialLoginButtons } from "@/components/store/auth/SocialLoginButtons";
import { oauthConfigured } from "@/server/auth/oauth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("registerMetaTitle") };
}

export default async function RegisterPage() {
  const [google, facebook] = await Promise.all([
    oauthConfigured("google"),
    oauthConfigured("facebook"),
  ]);
  const t = await getTranslations("auth");
  const common = await getTranslations("common");
  return (
    <>
      <PageTitle
        title={t("registerPageTitle")}
        crumbs={[{ href: "/", label: common("home") }, { label: t("registerCrumb") }]}
      />
      <Container className="py-8">
        <RegisterForm />
        <div className="mx-auto max-w-md">
          <SocialLoginButtons google={google} facebook={facebook} />
        </div>
        <p className="mx-auto mt-4 max-w-md text-sm">
          <Link href="/login" className="font-semibold text-primary">
            {t("alreadyHaveAccountLink")}
          </Link>
        </p>
      </Container>
    </>
  );
}
