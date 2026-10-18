import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { SocialCompleteForm } from "@/components/store/auth/SocialCompleteForm";
import { oauthPendingCookie, readPendingOAuth } from "@/server/auth/oauth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("socialMetaTitle") };
}

export default async function SocialRegisterPage() {
  const jar = await cookies();
  const token = jar.get(oauthPendingCookie.name)?.value;
  const pending = token ? await readPendingOAuth(token) : null;
  if (!pending) {
    redirect("/login");
  }
  const t = await getTranslations("auth");
  const common = await getTranslations("common");
  return (
    <>
      <PageTitle
        title={t("socialPageTitle")}
        crumbs={[
          { href: "/", label: common("home") },
          { href: "/register", label: t("registerCrumb") },
          { label: t("socialCrumb") },
        ]}
      />
      <Container className="py-8">
        <SocialCompleteForm name={pending.name} email={pending.email} />
      </Container>
    </>
  );
}
