import { facebookFeedXml } from "@/server/tracking/feed";

export async function GET() {
  const xml = await facebookFeedXml();
  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
