import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { PressScale, Reveal } from "@/components/motion";
import { focusRing } from "@/components/ui/buttonStyles";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/store/common/SectionHeading";
import { BlogTeaser } from "@/components/store/home/BlogTeaser";
import { CategoryRibbon } from "@/components/store/home/CategoryRibbon";
import { FlashCountdown } from "@/components/store/home/FlashCountdown";
import { HeroSlider } from "@/components/store/home/HeroSlider";
import { SideBanners } from "@/components/store/home/SideBanners";
import { TestimonialCarousel } from "@/components/store/home/TestimonialCarousel";
import { TrustStrip } from "@/components/store/home/TrustStrip";
import { ProductGrid } from "@/components/store/product/ProductCard";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils/cn";
import { InstagramFeed } from "@/components/store/social/InstagramFeed";
import { YouTubeEmbed } from "@/components/store/social/YouTubeEmbed";
import { absoluteUrl, localeAlternates } from "@/lib/seo/urls";
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
  return {
    alternates: {
      canonical: absoluteUrl("/"),
      languages: localeAlternates("/"),
    },
  };
}

export default async function HomePage() {
  const t = await getTranslations("home");
  const common = await getTranslations("common");
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
    // No Reveal here: the hero is the LCP element and must paint at full
    // opacity straight from the server.
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
        <SideBanners banners={sideBanners} />
      </Container>
    ),
    categories: (
      <Container className="py-6">
        <Reveal>
          <SectionHeading
            title={common("categories")}
            href="/shop"
            action={t("allProducts")}
          />
          <CategoryRibbon categories={categories} />
        </Reveal>
      </Container>
    ),
    // A full-bleed dark band (§4.2's "flash deal arena"). page-on-ink is
    // the inverted-surface pairing that passes AA in every preset.
    flash:
      flash.length > 0 && nextFlashSale ? (
        <section className="my-4 bg-ink py-8 text-page">
          <Container>
            <Reveal className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-heading text-2xl font-bold sm:text-3xl">
                  {t("flashSaleTitle")}
                </h2>
                <Link
                  href="/flash-deals"
                  className={cn(
                    "mt-1 inline-flex items-center gap-1 text-sm font-semibold text-peach hover:underline",
                    focusRing,
                  )}
                >
                  {t("viewAllDeals")}
                  <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
                </Link>
              </div>
              <FlashCountdown endsAt={nextFlashSale.endsAt.toISOString()} tone="onDark" />
            </Reveal>
            <ProductGrid products={flash} reveal />
          </Container>
        </section>
      ) : null,
    offers: (
      <Container className="py-4">
        <Reveal>
          <PressScale>
            <Link
              href="/offers"
              className={cn(
                "group flex items-center justify-between gap-4 rounded-theme bg-ink px-6 py-8 text-page shadow-soft sm:px-10",
                focusRing,
              )}
            >
              <span>
                {/* text-primary doesn't reliably clear 4.5:1 against bg-ink
                 * across every preset (it's tuned for light backgrounds) —
                 * peach (primaryLight) keeps the brand hue but reads
                 * clearly on ink. */}
                <span className="block text-sm font-semibold text-peach">
                  {t("offersLabel")}
                </span>
                <span className="mt-1 block font-heading text-2xl font-bold sm:text-3xl">
                  {t("offersTagline")}
                </span>
              </span>
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-page/10 transition-transform duration-base ease-standard group-hover:translate-x-1 motion-reduce:transition-none">
                <ArrowRight aria-hidden="true" className="size-5 rtl:rotate-180" />
              </span>
            </Link>
          </PressScale>
        </Reveal>
      </Container>
    ),
    featured: (
      <Container className="py-6">
        <SectionHeading title={t("featuredTitle")} href="/shop" action={t("shopAll")} />
        <ProductGrid products={featured} reveal />
      </Container>
    ),
    recent: (
      <Container className="py-6">
        <SectionHeading
          title={t("recentTitle")}
          href="/shop?sort=newest"
          action={t("newest")}
        />
        <ProductGrid products={recent} reveal />
      </Container>
    ),
    bestsellers: (
      <Container className="py-6">
        <SectionHeading title={t("bestSellersTitle")} />
        <ProductGrid products={best} reveal />
      </Container>
    ),
    trust: (
      <Container className="py-6">
        <TrustStrip />
      </Container>
    ),
    testimonials:
      quotes.length > 0 ? (
        <Container className="py-6">
          <Reveal>
            <SectionHeading title={t("testimonialsTitle")} />
            <TestimonialCarousel items={quotes} />
          </Reveal>
        </Container>
      ) : null,
    videos:
      homeVideos.length > 0 ? (
        <Container className="py-6">
          <Reveal>
            <SectionHeading title={t("watchAndShopTitle")} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {homeVideos.map((video) => (
                <div key={video.id}>
                  <YouTubeEmbed url={video.youtubeUrl} title={video.title} />
                  <p className="mt-2 text-sm font-medium text-ink">{video.title}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      ) : null,
    instagram:
      instagramUrls.length > 0 ? (
        <Container className="py-6">
          <Reveal>
            <SectionHeading
              title={t("instagramTitle")}
              href={social.instagram || undefined}
              action={social.instagram ? t("openProfile") : undefined}
            />
            <InstagramFeed urls={instagramUrls} />
          </Reveal>
        </Container>
      ) : null,
    blog:
      homePosts.length > 0 ? (
        <Container className="py-6">
          <SectionHeading title={t("blogTitle")} href="/blog" action={t("allPosts")} />
          <BlogTeaser posts={homePosts} />
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
