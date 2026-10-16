import type { Metadata } from "next";
import { CatalogDenied } from "@/components/admin/catalog/CatalogDenied";
import { ProductList } from "@/components/admin/catalog/ProductList";
import { catalogAccess } from "@/server/admin/access";
import {
  listAdminProducts,
  loadCatalogOptions,
  parseProductListQuery,
} from "@/server/admin/products";

export const metadata: Metadata = { title: "Products" };

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const session = await catalogAccess();
  if (!session) {
    return <CatalogDenied />;
  }
  const query = parseProductListQuery(await searchParams);
  const [list, options] = await Promise.all([
    listAdminProducts(query),
    loadCatalogOptions(),
  ]);
  return (
    <ProductList
      rows={list.rows}
      query={query}
      page={list.page}
      pages={list.pages}
      total={list.total}
      categories={options.categories}
      brands={options.brands}
    />
  );
}
