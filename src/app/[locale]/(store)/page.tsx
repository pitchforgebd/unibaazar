import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/store/common/SectionHeading";
import { FlashCountdown } from "@/components/store/home/FlashCountdown";
import { HeroSlider } from "@/components/store/home/HeroSlider";
import { TestimonialCarousel } from "@/components/store/home/TestimonialCarousel";
import { ProductGrid } from "@/components/store/product/ProductCard";
import { ProductMedia } from "@/components/store/product/ProductMedia";
import { prisma } from "@/lib/db";
import { InstagramFeed } from "@/components/store/social/InstagramFeed";
import { YouTubeEmbed } from "@/components/store/social/YouTubeEmbed";
import { absoluteUrl } from "@/lib/seo/urls";
import { instagramPostUrls } from "@/lib/seo/youtube";
import {
  listHomeSections,
  publishedHomeVideos,
  publishedTestimonials,
} from "@/server/admin/content";
import { publicBanners } from "@/server/cms/public";
import { listStoreCategories, listStoreProducts } from "@/server/catalog/products";
import { loadSocial } from "@/server/settings/store";

// If Next can statically render this page, this bounds how stale featured
// products, banners, and flash-sale state can get (the page may still
// render dynamically on every request instead — see the build output).
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  // No hreflang: locale is a cookie preference, not a separate URL — see
  // src/lib/seo/metadata.ts for the same decision on other pages.
  return {
    alternates: {
      canonical: absoluteUrl("/"),
    },
  };
}

export default async function HomePage() {
  const t = await getTranslations("home");
  const common = await getTranslations("common");
  const trust = [
    { title: t("trustFastDeliveryTitle"), text: t("trustFastDeliveryText") },
    { title: t("trustAuthorizedTitle"), text: t("trustAuthorizedText") },
    { title: t("trustSupportTitle"), text: t("trustSupportText") },
    { title: t("trustPaymentsTitle"), text: t("trustPaymentsText") },
  ];
  const [
    sections,
    quotes,
    homeVideos,
    storedPosts,
    social,
    { slides, banners },
    categories,
    products,
    nextFlashSale,
  ] = await Promise.all([
    listHomeSections(),
    publishedTestimonials(),
    publishedHomeVideos(),
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
    loadSocial(),
    publicBanners(),
    listStoreCategories(),
    listStoreProducts(),
    prisma.flashSale.findFirst({
      where: {
        isActive: true,
        startsAt: { lte: new Date() },
        endsAt: { gte: new Date() },
      },
      orderBy: { endsAt: "asc" },
      select: { endsAt: true },
    }),
  ]);
  const instagramUrls = instagramPostUrls(social.instagramPosts);
  const homePosts = storedPosts.map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    date: (post.publishedAt ?? post.createdAt).toISOString().slice(0, 10),
    hue: post.imageHue ?? 24,
  }));
  const flash = products.filter((product) => product.flashSale);
  const sideBanners = banners.filter((banner) => banner.placement === "home");
  const featuredTarget =
    sections.find((section) => section.key === "featured")?.target ?? "";
  const featured = products.filter(
    (product) =>
      product.featured && (!featuredTarget || product.categorySlug === featuredTarget),
  );
  const recent = [...products]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);
  const best = products.filter((product) => product.bestSeller);
  const blocks: Record<string, ReactNode> = {
    hero: (
      <Container className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <HeroSlider
          slides={slides.map((slide) => ({
            id: slide.id,
            title: slide.title,
            subtitle: slide.subtitle,
            href: slide.href,
            imageUrl: slide.imageUrl,
            imageHue: slide.imageHue,
          }))}
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          {sideBanners.map((banner) => (
            <Link
              key={banner.id}
              href={banner.href}
              className="relative grid min-h-28 place-items-center overflow-hidden rounded-lg p-4 text-center text-sm font-semibold text-white"
              style={
                banner.imageUrl
                  ? {
                      backgroundImage: `url(${banner.imageUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : { backgroundColor: `hsl(${banner.imageHue ?? 24} 70% 42%)` }
              }
            >
              {banner.imageUrl ? <span className="absolute inset-0 bg-black/30" /> : null}
              <span className="relative">{banner.title}</span>
            </Link>
          ))}
        </div>
      </Container>
    ),
    categories: (
      <Container className="py-6">
        <SectionHeading
          title={common("categories")}
          href="/shop"
          action={t("allProducts")}
        />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="rounded-lg bg-card p-3 text-center shadow-soft"
            >
              <ProductMedia
                hue={category.hue}
                name={category.name}
                className="mx-auto h-16 w-16 rounded-full text-lg"
              />
              <span className="mt-2 block text-sm font-medium">{category.name}</span>
            </Link>
          ))}
        </div>
      </Container>
    ),
    flash:
      flash.length > 0 && nextFlashSale ? (
        <Container className="py-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-ink sm:text-2xl">
                {t("flashSaleTitle")}
              </h2>
              <Link href="/flash-deals" className="text-sm font-semibold text-primary">
                {t("viewAllDeals")}
              </Link>
            </div>
            <FlashCountdown endsAt={nextFlashSale.endsAt.toISOString()} />
          </div>
          <ProductGrid products={flash} />
        </Container>
      ) : null,
    offers: (
      <Container className="py-4">
        <Link href="/offers" className="block rounded-lg bg-ink px-6 py-8 text-white">
          <p className="text-sm font-semibold text-primary">{t("offersLabel")}</p>
          <p className="mt-1 text-2xl font-bold">{t("offersTagline")}</p>
        </Link>
      </Container>
    ),
    featured: (
      <Container className="py-4">
        <SectionHeading title={t("featuredTitle")} href="/shop" action={t("shopAll")} />
        <ProductGrid products={featured} />
      </Container>
    ),
    recent: (
      <Container className="py-4">
        <SectionHeading
          title={t("recentTitle")}
          href="/shop?sort=newest"
          action={t("newest")}
        />
        <ProductGrid products={recent} />
      </Container>
    ),
    bestsellers: (
      <Container className="py-4">
        <SectionHeading title={t("bestSellersTitle")} />
        <ProductGrid products={best} />
      </Container>
    ),
    trust: (
      <Container className="py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((item) => (
            <div key={item.title} className="rounded-lg bg-card p-4 shadow-soft">
              <h3 className="font-semibold text-ink">{item.title}</h3>
              <p className="mt-1 text-sm text-muted">{item.text}</p>
            </div>
          ))}
        </div>
      </Container>
    ),
    testimonials:
      quotes.length > 0 ? (
        <Container className="py-4">
          <SectionHeading title={t("testimonialsTitle")} />
          <TestimonialCarousel items={quotes} />
        </Container>
      ) : null,
    videos:
      homeVideos.length > 0 ? (
        <Container className="py-4">
          <SectionHeading title={t("watchAndShopTitle")} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {homeVideos.map((video) => (
              <div key={video.id}>
                <YouTubeEmbed url={video.youtubeUrl} title={video.title} />
                <p className="mt-2 text-sm font-medium text-ink">{video.title}</p>
              </div>
            ))}
          </div>
        </Container>
      ) : null,
    instagram:
      instagramUrls.length > 0 ? (
        <Container className="py-6">
          <SectionHeading
            title={t("instagramTitle")}
            href={social.instagram || undefined}
            action={social.instagram ? t("openProfile") : undefined}
          />
          <InstagramFeed urls={instagramUrls} />
        </Container>
      ) : null,
    blog:
      homePosts.length > 0 ? (
        <Container className="py-6">
          <SectionHeading title={t("blogTitle")} href="/blog" action={t("allPosts")} />
          <div className="grid gap-3 md:grid-cols-3">
            {homePosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="overflow-hidden rounded-lg bg-card shadow-soft"
              >
                <ProductMedia hue={post.hue} name={post.title} className="h-36" />
                <div className="p-4">
                  <p className="text-xs text-muted">{post.date}</p>
                  <h3 className="mt-1 font-semibold text-ink">{post.title}</h3>
                  <p className="mt-2 text-sm text-muted">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      ) : null,
  };

  return (
    <>
      {sections
        .filter((section) => section.enabled && blocks[section.key])
        .map((section) => (
          <div key={section.key}>{blocks[section.key] as ReactNode}</div>
        ))}
    </>
  );
}
