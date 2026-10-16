import { matchScore } from "@/lib/catalog/search";
import { listStoreProducts } from "@/server/catalog/products";
import { handle } from "@/server/http";

export async function GET(request: Request) {
  const term = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  return handle(async () => {
    if (term.length < 2) {
      return [];
    }
    const products = await listStoreProducts();
    return products
      .map((product) => ({
        product,
        score: matchScore(term, `${product.name} ${product.slug}`),
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((row) => row.product);
  });
}
