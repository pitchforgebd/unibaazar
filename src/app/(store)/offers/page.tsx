import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { ProductGrid } from "@/components/store/product/ProductCard";
import { listStoreProducts } from "@/server/catalog/products";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shop");
  return { title: t("offersTitle") };
}

export default async function OffersPage() {
  const products = await listStoreProducts();
  const offers = products.filter((product) =>
    product.variants.some((variant) => variant.salePrice !== null),
  );
  const t = await getTranslations("shop");
  const common = await getTranslations("common");
  return (
    <>
      <PageTitle
        title={t("offersTitle")}
        crumbs={[{ href: "/", label: common("home") }, { label: t("offersTitle") }]}
      />
      <Container className="py-6">
        {offers.length > 0 ? (
          <ProductGrid products={offers} />
        ) : (
          <p className="rounded-lg bg-card p-6 text-sm shadow-soft">{t("noOffers")}</p>
        )}
      </Container>
    </>
  );
}
