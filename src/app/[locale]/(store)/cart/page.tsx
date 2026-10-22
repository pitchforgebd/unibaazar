import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { CartView } from "@/components/store/cart/CartView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart");
  return { title: t("metaTitle") };
}

export default async function CartPage() {
  const t = await getTranslations("cart");
  const common = await getTranslations("common");
  return (
    <>
      <PageTitle
        title={t("pageTitle")}
        crumbs={[{ href: "/", label: common("home") }, { label: t("crumb") }]}
      />
      <Container className="py-6">
        <CartView />
      </Container>
    </>
  );
}
