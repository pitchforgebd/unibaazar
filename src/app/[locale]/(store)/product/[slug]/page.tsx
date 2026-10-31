import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { PageTitle } from "@/components/store/common/PageTitle";
import { SectionHeading } from "@/components/store/common/SectionHeading";
import { Reveal } from "@/components/motion";
import { ProductPurchase } from "@/components/store/product/ProductPurchase";
import { StaggeredProductGrid } from "@/components/store/product/StaggeredProductGrid";
import { TrackOnce } from "@/components/store/tracking/TrackOnce";
import { ProductTabs } from "@/components/store/product/ProductTabs";
import { RecentlyViewed } from "@/components/store/product/RecentlyViewed";
import { buildMetadata } from "@/lib/seo/metadata";
import { visibleText } from "@/lib/text/visibleText";
import {
  breadcrumbJsonLd,
  productGroupJsonLd,
  productJsonLd,
  videoObjectJsonLd,
} from "@/lib/seo/schema";
import { findSeo } from "@/server/seo/public";
import {
  getStoreCategory,
  getStoreProduct,
  getStoreQuestions,
  getStoreReviews,
  listStoreProducts,
} from "@/server/catalog/products";
import { loadCheckout, loadSocial } from "@/server/settings/store";

type ProductPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

// Justified-dynamic, not page-level ISR. Was force-dynamic pre-Phase-2
// because the old root layout read the locale cookie on every render,
// which conflicted with generateStaticParams+revalidate (ARCHITECTURE.md
// §12). Locale now comes from the URL segment via middleware, which fixed
// that — but testing uncovered a second, narrower issue: with this page's
// own `generateStaticParams() { return []; }` nested under [locale]'s
// generateStaticParams (which returns both "en" and "bn"), the *second*
// locale value consistently 500s with digest DYNAMIC_SERVER_USAGE on this
// Next.js version (15.5.27), even though neither page reads any dynamic
// API — confirmed by removing generateStaticParams here entirely, which
// fixes /bn/product/[slug] immediately. This looks like a framework
// limitation with nested dynamic-params fallback across a parent's
// multiple static param values, not something fixable in app code.
// No generateStaticParams, no `dynamic`/`revalidate` export: Next renders
// this per request (confirmed `ƒ` in the build output), same as
// category/brand. getStoreProduct is still cached via unstable_cache
// (src/server/catalog/products.ts) with on-demand revalidateTag()
// invalidation, so the expensive part doesn't hit the DB every request —
// only the page HTML itself isn't cached. Revisit page-level ISR here once
// a Next.js upgrade is verified to fix the underlying issue.

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  const seo = product ? await findSeo("PRODUCT", product.id) : null;
  return buildMetadata({
    title: seo?.metaTitle || product?.name || "Product",
    description:
      seo?.metaDescription ||
      (product ? visibleText(product.shortDescription) : undefined),
    path: `/product/${slug}`,
    canonical: seo?.canonical,
    ogImage: seo?.ogImage || product?.images[0]?.url,
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
  const [category, catalog, social, reviews, checkout] = await Promise.all([
    getStoreCategory(product.categorySlug),
    listStoreProducts(),
    loadSocial(),
    getStoreReviews(product.slug),
    loadCheckout(),
  ]);
  const deliveryRates = { inside: checkout.inside, outside: checkout.outside };
  const productSchema =
    product.variants.length > 1
      ? productGroupJsonLd(product, { deliveryRates })
      : productJsonLd(product, { reviews, deliveryRates });
  const videoSchema = product.videoUrl
    ? videoObjectJsonLd({
        name: product.name,
        description: visibleText(product.shortDescription),
        youtubeUrl: product.videoUrl,
      })
    : null;
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
      <JsonLd data={productSchema} />
      {videoSchema ? <JsonLd data={videoSchema} /> : null}
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
          reviews={reviews}
          questions={await getStoreQuestions(product.slug)}
        />
        {related.length > 0 ? (
          <section className="mt-10">
            <Reveal>
              <SectionHeading title={t("relatedHeading")} />
            </Reveal>
            <StaggeredProductGrid products={related} />
          </section>
        ) : null}
        <RecentlyViewed currentSlug={product.slug} />
      </Container>
    </>
  );
}
