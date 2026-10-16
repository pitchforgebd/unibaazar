import { googleFeedCsv } from "@/server/tracking/feed";

export async function GET() {
  const csv = await googleFeedCsv();
  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8" },
  });
}
