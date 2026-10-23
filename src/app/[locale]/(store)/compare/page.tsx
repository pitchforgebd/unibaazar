import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { CompareView } from "@/components/store/lists/CompareView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("compare");
  return { title: t("pageTitle") };
}

export default async function ComparePage() {
  const t = await getTranslations("compare");
  const common = await getTranslations("common");
  return (
    <>
      <PageTitle
        title={t("pageTitle")}
        crumbs={[{ href: "/", label: common("home") }, { label: t("pageTitle") }]}
      />
      <Container className="py-6">
        <CompareView />
      </Container>
    </>
  );
}
