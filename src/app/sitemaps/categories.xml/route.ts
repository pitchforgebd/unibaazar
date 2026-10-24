import { buildUrlsetXml, categorySitemapEntries } from "@/server/seo/sitemap";
import { siteOrigin } from "@/server/tracking/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await categorySitemapEntries();
  return new Response(buildUrlsetXml(entries, siteOrigin()), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
