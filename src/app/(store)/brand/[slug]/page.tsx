import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductListing } from "@/components/store/shop/ProductListing";
import { parseShopQuery } from "@/lib/catalog/queries";
import { getStoreBrand } from "@/server/catalog/products";

type BrandPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Prerendered pages otherwise never refresh after build — this bounds how
// stale an admin brand/product edit can be on the live site.
export const revalidate = 60;

// See the product page for why this returns no slugs up front — pages are
// generated on first visit and cached per `revalidate` instead (ISR).
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getStoreBrand(slug);
  return { title: brand?.name ?? "Brand" };
}

export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const { slug } = await params;
  const brand = await getStoreBrand(slug);
  if (!brand) {
    notFound();
  }
  const query = parseShopQuery(await searchParams);
  return (
    <ProductListing
      title={brand.name}
      subtitle={brand.description}
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/shop", label: "Shop" },
        { label: brand.name },
      ]}
      basePath={`/brand/${brand.slug}`}
      query={query}
      brandSlug={brand.slug}
      hideBrand
    />
  );
}
