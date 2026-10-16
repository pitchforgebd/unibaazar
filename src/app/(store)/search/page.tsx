import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { ProductGrid } from "@/components/store/product/ProductCard";
import { SearchBar } from "@/components/store/layout/SearchBar";
import { TrackOnce } from "@/components/store/tracking/TrackOnce";
import { filterProducts, parseShopQuery } from "@/lib/catalog/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { listStoreProducts } from "@/server/catalog/products";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Search",
    description: "Search UniBaazar products.",
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

  return (
    <>
      <PageTitle
        title="Search"
        subtitle={
          query.q
            ? `Results for “${query.q}”`
            : "Type at least two letters to see suggestions."
        }
        crumbs={[{ href: "/", label: "Home" }, { label: "Search" }]}
      />
      <Container className="py-6">
        <div className="mb-6 max-w-2xl">
          <SearchBar id="search-page" initialQuery={query.q} />
        </div>
        {query.q && results.length === 0 ? (
          <p className="rounded-lg bg-card p-6 text-sm shadow-soft">
            No products match that search.
          </p>
        ) : null}
        {query.q ? <TrackOnce name="Search" payload={{ query: query.q }} /> : null}
        {results.length > 0 ? <ProductGrid products={results} /> : null}
      </Container>
    </>
  );
}
