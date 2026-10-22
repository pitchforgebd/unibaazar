import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProductListing } from "@/components/store/shop/ProductListing";
import { parseShopQuery } from "@/lib/catalog/queries";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  searchParams,
}: ShopPageProps): Promise<Metadata> {
  const raw = await searchParams;
  const common = await getTranslations("common");
  const t = await getTranslations("shop");
  return buildMetadata({
    title: common("shop"),
    description: t("pageSubtitle"),
    path: "/shop",
    noIndex: Object.keys(raw).length > 0,
  });
}

type ShopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const query = parseShopQuery(await searchParams);
  const common = await getTranslations("common");
  const t = await getTranslations("shop");
  return (
    <ProductListing
      title={common("shop")}
      subtitle={t("pageSubtitle")}
      crumbs={[{ href: "/", label: common("home") }, { label: common("shop") }]}
      basePath="/shop"
      query={query}
    />
  );
}
