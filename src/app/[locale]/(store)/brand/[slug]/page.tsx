import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductListing } from "@/components/store/shop/ProductListing";
import { parseShopQuery } from "@/lib/catalog/queries";
import { getStoreBrand } from "@/server/catalog/products";

type BrandPageProps = {
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
