import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ProductListing } from "@/components/store/shop/ProductListing";
import { parseShopQuery } from "@/lib/catalog/queries";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd } from "@/lib/seo/schema";
import { prisma } from "@/lib/db";
import { findSeo } from "@/server/seo/public";
import { getStoreCategory } from "@/server/catalog/products";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Prerendered pages otherwise never refresh after build — this bounds how
// stale an admin category/product edit can be on the live site.
export const revalidate = 60;

// See the product page for why this returns no slugs up front — pages are
// generated on first visit and cached per `revalidate` instead (ISR).
export async function generateStaticParams() {
  return [];
}

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
  return buildMetadata({
    title: seo?.metaTitle || category?.name || "Category",
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
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { href: "/", label: "Home" },
          { href: "/shop", label: "Shop" },
          { label: category.name },
        ])}
      />
      <ProductListing
        title={category.name}
        subtitle={category.description}
        crumbs={[
          { href: "/", label: "Home" },
          { href: "/shop", label: "Shop" },
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
