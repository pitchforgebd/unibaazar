import { publicMenu } from "@/server/cms/public";
import { handle } from "@/server/http";

type Context = { params: Promise<{ location: string }> };

export async function GET(_request: Request, context: Context) {
  const { location } = await context.params;
  const response = await handle(() => publicMenu(location));
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=300",
  );
  return response;
}
