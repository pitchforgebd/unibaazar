import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { WishlistView } from "@/components/store/lists/WishlistView";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("wishlist");
  return { title: t("pageTitle") };
}

export default async function WishlistPage() {
  const t = await getTranslations("wishlist");
  const common = await getTranslations("common");
  return (
    <>
      <PageTitle
        title={t("pageTitle")}
        crumbs={[{ href: "/", label: common("home") }, { label: t("pageTitle") }]}
      />
      <Container className="py-6">
        <WishlistView />
      </Container>
    </>
  );
}
