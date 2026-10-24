import { buildSitemapIndexXml } from "@/server/seo/sitemap";
import { siteOrigin } from "@/server/tracking/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const body = buildSitemapIndexXml(
    [
      "/sitemaps/pages.xml",
      "/sitemaps/products.xml",
      "/sitemaps/categories.xml",
      "/sitemaps/brands.xml",
      "/sitemaps/blog.xml",
      "/sitemaps/videos.xml",
      "/image-sitemap.xml",
    ],
    siteOrigin(),
  );
  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
