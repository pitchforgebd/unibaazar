import { loadRobots } from "@/server/seo/public";

export const dynamic = "force-dynamic";

export async function GET() {
  const body = await loadRobots();
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
