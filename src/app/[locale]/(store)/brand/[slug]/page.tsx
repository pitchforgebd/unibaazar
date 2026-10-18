import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductListing } from "@/components/store/shop/ProductListing";
import { parseShopQuery } from "@/lib/catalog/queries";
import { getStoreBrand } from "@/server/catalog/products";

type BrandPageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Justified-dynamic, not ISR — same reasoning as
// src/app/[locale]/(store)/category/[slug]/page.tsx: reads searchParams
// server-side for filtering, so Next.js renders it dynamically per request
// regardless of any caching directive. getStoreBrand is still cached via
// unstable_cache (src/server/catalog/products.ts).

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getStoreBrand(slug);
  const t = await getTranslations("shop");
  return { title: brand?.name ?? t("brandFallback") };
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
