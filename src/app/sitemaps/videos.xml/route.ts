import { buildVideoSitemapXml, videoSitemapEntries } from "@/server/seo/sitemap";
import { siteOrigin } from "@/server/tracking/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await videoSitemapEntries();
  return new Response(buildVideoSitemapXml(entries, siteOrigin()), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
