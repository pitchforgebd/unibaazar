import { filterProducts, paginateProducts, parseShopQuery } from "@/lib/catalog/queries";
import { listStoreProducts } from "@/server/catalog/products";
import { handle } from "@/server/http";

function rawQuery(params: URLSearchParams): Record<string, string | string[]> {
  const raw: Record<string, string[]> = {};
  params.forEach((value, key) => {
    raw[key] = raw[key] ? [...raw[key], value] : [value];
  });
  return raw;
}

export async function GET(request: Request) {
  return handle(async () => {
    const query = parseShopQuery(rawQuery(new URL(request.url).searchParams));
    const products = await listStoreProducts();
    const matched = filterProducts(query, {}, products);
    const page = paginateProducts(matched, query.page);
    return page;
  });
}
