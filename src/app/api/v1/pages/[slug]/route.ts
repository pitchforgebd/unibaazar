import { publicPage } from "@/server/cms/public";
import { handle } from "@/server/http";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  const { slug } = await context.params;
  const response = await handle(() => publicPage(slug));
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=300",
  );
  return response;
}
