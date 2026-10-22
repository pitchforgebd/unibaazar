import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { LoginForm } from "@/components/store/auth/AuthForms";
import { SocialLoginButtons } from "@/components/store/auth/SocialLoginButtons";
import { oauthConfigured } from "@/server/auth/oauth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("loginMetaTitle") };
}

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const twoFa = Array.isArray(params["2fa"]) ? params["2fa"][0] : params["2fa"];
  const [google, facebook] = await Promise.all([
    oauthConfigured("google"),
    oauthConfigured("facebook"),
  ]);
  const t = await getTranslations("auth");
  const common = await getTranslations("common");
  return (
    <>
      <PageTitle
        title={t("loginPageTitle")}
        crumbs={[{ href: "/", label: common("home") }, { label: t("loginCrumb") }]}
      />
      <Container className="py-8">
        {error ? (
          <p className="mx-auto mb-4 max-w-md rounded-md bg-peach px-3 py-2 text-sm text-ink">
            {error}
          </p>
        ) : null}
        <LoginForm initialNeeds2fa={twoFa === "1"} />
        <div className="mx-auto max-w-md">
          <SocialLoginButtons google={google} facebook={facebook} />
        </div>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted">
          <Link href="/register" className="font-semibold text-primary">
            {t("createAccountLink")}
          </Link>
          {" · "}
          <Link href="/forgot-password" className="font-semibold text-primary">
            {t("forgotPasswordLink")}
          </Link>
        </p>
      </Container>
    </>
  );
}
