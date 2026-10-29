import type { SeoEntityType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { defaultLocale, locales } from "@/i18n/config";
import { youtubeEmbedId } from "@/lib/seo/youtube";

export type SitemapEntry = { path: string; lastmod?: Date };

export type VideoSitemapEntry = {
  path: string;
  title: string;
  youtubeUrl: string;
  uploadDate?: Date;
};

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// This app has no per-locale route aliasing (src/i18n/routing.ts sets no
// `pathnames` map) — every route is the same slug in both languages,
// only the `/bn` prefix differs (localePrefix: "as-needed" means the
// default locale carries none) — so a plain string rule is enough here,
// without pulling in next-intl's own getPathname() (which needs its
// navigation module — see lib/seo/alternates.ts's comment on why that
// import makes a file hard to unit test).
function localizedUrls(path: string, origin: string): string[] {
  return locales.map((locale) =>
    locale === defaultLocale ? `${origin}${path}` : `${origin}/${locale}${path}`,
  );
}

/** Shared by every per-type sitemap route — pure string building, no DB
 * access, so it's unit-testable without one (same split this codebase
 * already uses throughout — e.g. dashboard.ts's bucketStatusFunnel()). */
export function buildUrlsetXml(entries: SitemapEntry[], origin: string): string {
  const body = entries
    .flatMap((entry) =>
      localizedUrls(entry.path, origin).map((loc) => {
        const lastmod = entry.lastmod
          ? `\n    <lastmod>${entry.lastmod.toISOString()}</lastmod>`
          : "";
        return `  <url>\n    <loc>${xml(loc)}</loc>${lastmod}\n  </url>`;
      }),
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function buildSitemapIndexXml(childPaths: string[], origin: string): string {
  const body = childPaths
    .map((path) => `  <sitemap>\n    <loc>${xml(`${origin}${path}`)}</loc>\n  </sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

/** Google's video sitemap extension (https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps)
 * — one <url> per page that embeds at least one video, each carrying
 * one <video:video> block per video on that page (a product page has
 * exactly one; /videos has one per HomeVideo row). */
export function buildVideoSitemapXml(
  entries: VideoSitemapEntry[],
  origin: string,
): string {
  const byPath = new Map<string, VideoSitemapEntry[]>();
  for (const entry of entries) {
    const id = youtubeEmbedId(entry.youtubeUrl);
    if (!id) {
      continue;
    }
    const list = byPath.get(entry.path) ?? [];
    list.push(entry);
    byPath.set(entry.path, list);
  }
  const body = Array.from(byPath.entries())
    .map(([path, videos]) => {
      const blocks = videos
        .map((video) => {
          const id = youtubeEmbedId(video.youtubeUrl);
          const uploadDate = video.uploadDate
            ? `\n      <video:publication_date>${video.uploadDate.toISOString()}</video:publication_date>`
            : "";
          return (
            `    <video:video>\n` +
            `      <video:thumbnail_loc>https://i.ytimg.com/vi/${id}/hqdefault.jpg</video:thumbnail_loc>\n` +
            `      <video:title>${xml(video.title)}</video:title>\n` +
            `      <video:player_loc>https://www.youtube.com/embed/${id}</video:player_loc>${uploadDate}\n` +
            `    </video:video>`
          );
        })
        .join("\n");
      return `  <url>\n    <loc>${xml(`${origin}${path}`)}</loc>\n${blocks}\n  </url>`;
    })
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n` +
    `${body}\n</urlset>\n`
  );
}

async function hiddenEntityIds(entityType: SeoEntityType): Promise<Set<string>> {
  const hidden = await prisma.seoMeta.findMany({
    where: { entityType, noIndex: true },
    select: { entityId: true },
  });
  return new Set(hidden.map((row) => row.entityId));
}

export async function productSitemapEntries(): Promise<SitemapEntry[]> {
  const [rows, hidden] = await Promise.all([
    prisma.product.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, slug: true, updatedAt: true },
    }),
    hiddenEntityIds("PRODUCT"),
  ]);
  return rows
    .filter((row) => !hidden.has(row.id))
    .map((row) => ({ path: `/product/${row.slug}`, lastmod: row.updatedAt }));
}

export async function categorySitemapEntries(): Promise<SitemapEntry[]> {
  const [rows, hidden] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, updatedAt: true },
    }),
    hiddenEntityIds("CATEGORY"),
  ]);
  return rows
    .filter((row) => !hidden.has(row.id))
    .map((row) => ({ path: `/category/${row.slug}`, lastmod: row.updatedAt }));
}

export async function brandSitemapEntries(): Promise<SitemapEntry[]> {
  const rows = await prisma.brand.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });
  return rows.map((row) => ({ path: `/brand/${row.slug}`, lastmod: row.updatedAt }));
}

export async function pageSitemapEntries(): Promise<SitemapEntry[]> {
  const [rows, hidden] = await Promise.all([
    prisma.page.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, slug: true, updatedAt: true },
    }),
    hiddenEntityIds("PAGE"),
  ]);
  return [
    { path: "/" },
    { path: "/shop" },
    { path: "/contact-us" },
    { path: "/faq" },
    ...rows
      .filter((row) => !hidden.has(row.id))
      .map((row) => ({ path: `/${row.slug}`, lastmod: row.updatedAt })),
  ];
}

export async function blogSitemapEntries(): Promise<SitemapEntry[]> {
  const [rows, hidden] = await Promise.all([
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, slug: true, updatedAt: true },
    }),
    hiddenEntityIds("BLOG_POST"),
  ]);
  return [
    { path: "/blog" },
    ...rows
      .filter((row) => !hidden.has(row.id))
      .map((row) => ({ path: `/blog/${row.slug}`, lastmod: row.updatedAt })),
  ];
}

export async function videoSitemapEntries(): Promise<VideoSitemapEntry[]> {
  const [homeVideos, productsWithVideo] = await Promise.all([
    prisma.homeVideo.findMany({
      where: { isActive: true },
      select: { title: true, youtubeUrl: true, createdAt: true },
    }),
    prisma.product.findMany({
      where: { status: "PUBLISHED", videoUrl: { not: null } },
      select: { slug: true, name: true, videoUrl: true, updatedAt: true },
    }),
  ]);
  return [
    ...homeVideos.map((video) => ({
      path: "/videos",
      title: video.title,
      youtubeUrl: video.youtubeUrl,
      uploadDate: video.createdAt,
    })),
    ...productsWithVideo.map((product) => ({
      path: `/product/${product.slug}`,
      title: product.name,
      youtubeUrl: product.videoUrl ?? "",
      uploadDate: product.updatedAt,
    })),
  ];
}
