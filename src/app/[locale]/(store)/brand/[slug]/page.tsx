import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductListing } from "@/components/store/shop/ProductListing";
import { parseShopQuery } from "@/lib/catalog/queries";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo/metadata";
import { getStoreBrand } from "@/server/catalog/products";
import { findSeo } from "@/server/seo/public";

type BrandPageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Justified-dynamic, not ISR — same reasoning as
// src/app/[locale]/(store)/category/[slug]/page.tsx: reads searchParams
// server-side for filtering, so Next.js renders it dynamically per request
// regardless of any caching directive. getStoreBrand is still cached via
// unstable_cache (src/server/catalog/products.ts).

export async function generateMetadata({
  params,
  searchParams,
}: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getStoreBrand(slug);
  const stored = await prisma.brand.findFirst({
    where: { slug, isActive: true },
    select: { id: true },
  });
  const seo = stored ? await findSeo("BRAND", stored.id) : null;
  const raw = await searchParams;
  const filtered = Object.keys(raw).length > 0;
  const t = await getTranslations("shop");
  return buildMetadata({
    title: seo?.metaTitle || brand?.name || t("brandFallback"),
    description: seo?.metaDescription || brand?.description,
    path: `/brand/${slug}`,
    canonical: seo?.canonical,
    ogImage: seo?.ogImage,
    noIndex: seo?.noIndex || filtered,
    focusKeyword: seo?.focusKeyword,
  });
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
