import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { ProductGrid } from "@/components/store/product/ProductCard";
import { SearchBar } from "@/components/store/layout/SearchBar";
import { TrackOnce } from "@/components/store/tracking/TrackOnce";
import { filterProducts, parseShopQuery } from "@/lib/catalog/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { listStoreProducts } from "@/server/catalog/products";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shop");
  return buildMetadata({
    title: t("searchTitle"),
    description: t("searchDescription"),
    path: "/search",
    noIndex: true,
  });
}

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await searchParams;
  const query = parseShopQuery(raw);
  const results = query.q ? filterProducts(query, {}, await listStoreProducts()) : [];
  const t = await getTranslations("shop");
  const common = await getTranslations("common");

  return (
    <>
      <PageTitle
        title={t("searchTitle")}
        subtitle={query.q ? t("searchResultsFor", { query: query.q }) : t("searchHint")}
        crumbs={[{ href: "/", label: common("home") }, { label: t("searchTitle") }]}
      />
      <Container className="py-6">
        <div className="mb-6 max-w-2xl">
          <SearchBar id="search-page" initialQuery={query.q} />
        </div>
        {query.q && results.length === 0 ? (
          <p className="rounded-theme bg-card p-6 text-sm shadow-soft">
            {t("noSearchMatches")}
          </p>
        ) : null}
        {query.q ? <TrackOnce name="Search" payload={{ query: query.q }} /> : null}
        {results.length > 0 ? <ProductGrid products={results} reveal /> : null}
      </Container>
    </>
  );
}
