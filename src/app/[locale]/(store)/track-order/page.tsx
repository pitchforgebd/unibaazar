import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { TrackOrderForm } from "@/components/store/order/TrackOrderForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("orders");
  return { title: t("trackMetaTitle") };
}

type TrackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TrackOrderPage({ searchParams }: TrackPageProps) {
  const params = await searchParams;
  const order = typeof params.order === "string" ? params.order : "";
  const phone = typeof params.phone === "string" ? params.phone : "";
  const t = await getTranslations("orders");
  const common = await getTranslations("common");

  return (
    <>
      <PageTitle
        title={t("trackPageTitle")}
        crumbs={[{ href: "/", label: common("home") }, { label: t("trackCrumb") }]}
      />
      <Container className="py-6">
        <TrackOrderForm initialOrder={order} initialPhone={phone} />
      </Container>
    </>
  );
}
