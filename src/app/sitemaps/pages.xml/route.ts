import { buildUrlsetXml, pageSitemapEntries } from "@/server/seo/sitemap";
import { siteOrigin } from "@/server/tracking/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await pageSitemapEntries();
  return new Response(buildUrlsetXml(entries, siteOrigin()), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
