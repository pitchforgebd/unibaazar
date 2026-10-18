import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { SectionHeading } from "@/components/store/common/SectionHeading";
import { ProductGrid } from "@/components/store/product/ProductCard";
import { ProductPurchase } from "@/components/store/product/ProductPurchase";
import { TrackOnce } from "@/components/store/tracking/TrackOnce";
import { ProductTabs } from "@/components/store/product/ProductTabs";
import { RecentlyViewed } from "@/components/store/product/RecentlyViewed";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/schema";
import { findSeo } from "@/server/seo/public";
import {
  getStoreCategory,
  getStoreProduct,
  getStoreQuestions,
  getStoreReviews,
  listStoreProducts,
} from "@/server/catalog/products";
import { loadSocial } from "@/server/settings/store";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

// Pre-existing bug (not introduced by the i18n work below): the root layout
// (src/app/layout.tsx) reads the locale cookie via next-intl's getLocale()/
// getMessages() on every render. Combined with `generateStaticParams`
// returning [] + a `revalidate` value, Next.js treats the first request for
// any slug as "generate once, cache for everyone" and refuses to let that
// path read request-specific data — it throws DYNAMIC_SERVER_USAGE for
// every single request, in production, on this and the category/brand
// pages. `force-dynamic` opts this route out of that static/ISR caching
// entirely (same as /shop), which fixes it. The cost is one DB query per
// request instead of a cached one every 60s.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  const seo = product ? await findSeo("PRODUCT", product.id) : null;
  return buildMetadata({
    title: seo?.metaTitle || product?.name || "Product",
    description: seo?.metaDescription || product?.shortDescription,
    path: `/product/${slug}`,
    canonical: seo?.canonical,
    ogImage: seo?.ogImage,
    noIndex: seo?.noIndex,
    focusKeyword: seo?.focusKeyword,
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  if (!product) {
    notFound();
  }
  const [category, catalog, social] = await Promise.all([
    getStoreCategory(product.categorySlug),
    listStoreProducts(),
    loadSocial(),
  ]);
  const related = catalog
    .filter(
      (item) => item.slug !== product.slug && item.categorySlug === product.categorySlug,
    )
    .slice(0, 4);
  const t = await getTranslations("product");
  const common = await getTranslations("common");

  return (
    <>
      <PageTitle
        title={product.name}
        showHeading={false}
        crumbs={[
          { href: "/", label: common("home") },
          { href: "/shop", label: common("shop") },
          ...(category
            ? [{ href: `/category/${category.slug}`, label: category.name }]
            : []),
          { label: product.name },
        ]}
      />
      <JsonLd data={productJsonLd(product)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { href: "/", label: common("home") },
          { href: "/shop", label: common("shop") },
          ...(category
            ? [{ href: `/category/${category.slug}`, label: category.name }]
            : []),
          { label: product.name },
        ])}
      />
      <Container className="py-6">
        <TrackOnce
          name="ViewContent"
          payload={{ slug: product.slug, name: product.name }}
        />
        <ProductPurchase
          product={product}
          whatsappHref={social.whatsapp}
          videoUrl={product.videoUrl}
        />
        <ProductTabs
          productSlug={product.slug}
          description={product.description}
          reviews={await getStoreReviews(product.slug)}
          questions={await getStoreQuestions(product.slug)}
        />
        {related.length > 0 ? (
          <section className="mt-10">
            <SectionHeading title={t("relatedHeading")} />
            <ProductGrid products={related} />
          </section>
        ) : null}
        <RecentlyViewed currentSlug={product.slug} />
      </Container>
    </>
  );
}
