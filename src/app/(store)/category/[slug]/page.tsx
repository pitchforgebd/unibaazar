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
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Pre-existing bug (not introduced by the i18n work below): the root layout
// reads the locale cookie via next-intl's getLocale()/getMessages() on every
// render. Combined with `generateStaticParams` returning [] + a
// `revalidate` value, Next.js throws DYNAMIC_SERVER_USAGE on every request
// in production, since it refuses to cache one visitor's locale for all
// future visitors. `force-dynamic` opts this route out of that static/ISR
// caching entirely (same as /shop), which fixes it.
export const dynamic = "force-dynamic";

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
