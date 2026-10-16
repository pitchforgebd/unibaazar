import { getStoreProduct, listStoreProducts } from "@/server/catalog/products";
import { ApiError, handle } from "@/server/http";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  const { slug } = await context.params;
  return handle(async () => {
    const product = await getStoreProduct(slug);
    if (!product) {
      throw new ApiError(404, "Product not found");
    }
    const products = await listStoreProducts();
    return products
      .filter((item) => item.slug !== slug && item.categorySlug === product.categorySlug)
      .slice(0, 4);
  });
}
