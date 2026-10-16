import type { Metadata } from "next";
import { ProductListing } from "@/components/store/shop/ProductListing";
import { parseShopQuery } from "@/lib/catalog/queries";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({
  searchParams,
}: ShopPageProps): Promise<Metadata> {
  const raw = await searchParams;
  return buildMetadata({
    title: "Shop",
    description:
      "All products. Filter by category, brand, price, size, color, rating, and stock.",
    path: "/shop",
    noIndex: Object.keys(raw).length > 0,
  });
}

type ShopPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const query = parseShopQuery(await searchParams);
  return (
    <ProductListing
      title="Shop"
      subtitle="All products. Filter by category, brand, price, size, color, rating, and stock."
      crumbs={[{ href: "/", label: "Home" }, { label: "Shop" }]}
      basePath="/shop"
      query={query}
    />
  );
}
