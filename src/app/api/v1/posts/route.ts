import { publicPosts } from "@/server/cms/public";
import { handle } from "@/server/http";

export async function GET() {
  const response = await handle(() => publicPosts());
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=300",
  );
  return response;
}
