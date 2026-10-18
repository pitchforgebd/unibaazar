import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { ProductListing } from "@/components/store/shop/ProductListing";
import { parseShopQuery } from "@/lib/catalog/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/schema";
import { prisma } from "@/lib/db";
import { findSeo } from "@/server/seo/public";
import { getStoreCategory } from "@/server/catalog/products";

type CategoryPageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Justified-dynamic, not ISR: this page reads `searchParams` server-side to
// drive filtering/sorting (via parseShopQuery below), and Next.js renders
// any route that reads searchParams dynamically per request — same as
// /shop and /search, which have never had a `dynamic`/`revalidate` export
// either. No explicit `dynamic` export is needed; this comment exists so a
// future reader doesn't wonder why there's no caching directive here. The
// expensive part (the category + its data) is still cached — see
// getStoreCategory in src/server/catalog/products.ts, wrapped in
// unstable_cache with on-demand revalidateTag() invalidation.

export async function generateMetadata({
  params,
  searchParams,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getStoreCategory(slug);
  const stored = await prisma.category.findFirst({
    where: { slug, isActive: true },
    select: { id: true },
  });
  const seo = stored ? await findSeo("CATEGORY", stored.id) : null;
  const raw = await searchParams;
  const filtered = Object.keys(raw).length > 0;
  const t = await getTranslations("shop");
  return buildMetadata({
    title: seo?.metaTitle || category?.name || t("categoryFallback"),
    description: seo?.metaDescription || category?.description,
    path: `/category/${slug}`,
    canonical: seo?.canonical,
    ogImage: seo?.ogImage,
    noIndex: seo?.noIndex || filtered,
    focusKeyword: seo?.focusKeyword,
  });
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getStoreCategory(slug);
  if (!category) {
    notFound();
  }
  const query = parseShopQuery(await searchParams);
  const common = await getTranslations("common");
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { href: "/", label: common("home") },
          { href: "/shop", label: common("shop") },
          { label: category.name },
        ])}
      />
      <ProductListing
        title={category.name}
        subtitle={category.description}
        crumbs={[
          { href: "/", label: common("home") },
          { href: "/shop", label: common("shop") },
          { label: category.name },
        ]}
        basePath={`/category/${category.slug}`}
        query={query}
        categorySlug={category.slug}
        seoText={category.seoText}
        hideCategory
      />
    </>
  );
}
