import { blogPosts, cmsPages } from "@/lib/mock/content";
import { brands, categories, products, questions, reviews } from "@/lib/mock/catalog";
import { displayPrice, totalStock } from "@/lib/catalog/pricing";
import { matchScore } from "@/lib/catalog/search";
import type { Product, ShopQuery, ShopSort } from "@/types/catalog";

export const pageSize = 8;

const sorts: ShopSort[] = ["newest", "price-asc", "price-desc", "rating", "name"];

function list(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }
  const source = Array.isArray(value) ? value : [value];
  return source
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function first(value: string | string[] | undefined): string {
  const [item] = list(value);
  return item ?? "";
}

function numberValue(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (!raw) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseShopQuery(
  raw: Record<string, string | string[] | undefined>,
): ShopQuery {
  const sortValue = first(raw.sort);
  const sort = sorts.find((item) => item === sortValue) ?? "newest";
  const availability = first(raw.availability);
  const page = numberValue(raw.page);

  return {
    categories: list(raw.category),
    brands: list(raw.brand),
    sizes: list(raw.size),
    colors: list(raw.color),
    minPrice: numberValue(raw.min),
    maxPrice: numberValue(raw.max),
    rating: numberValue(raw.rating),
    availability:
      availability === "in" || availability === "out" ? availability : undefined,
    sort,
    page: page && page > 0 ? Math.floor(page) : 1,
    q: first(raw.q),
  };
}

export function shopHref(
  basePath: string,
  query: ShopQuery,
  patch: Partial<ShopQuery> = {},
): string {
  const next: ShopQuery = { ...query, ...patch };
  const params = new URLSearchParams();
  next.categories.forEach((value) => params.append("category", value));
  next.brands.forEach((value) => params.append("brand", value));
  next.sizes.forEach((value) => params.append("size", value));
  next.colors.forEach((value) => params.append("color", value));
  if (next.minPrice !== undefined) {
    params.set("min", String(next.minPrice));
  }
  if (next.maxPrice !== undefined) {
    params.set("max", String(next.maxPrice));
  }
  if (next.rating) {
    params.set("rating", String(next.rating));
  }
  if (next.availability) {
    params.set("availability", next.availability);
  }
  if (next.sort !== "newest") {
    params.set("sort", next.sort);
  }
  if (next.q) {
    params.set("q", next.q);
  }
  if (next.page > 1) {
    params.set("page", String(next.page));
  }
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

type ListingScope = {
  categorySlug?: string;
  brandSlug?: string;
};

function matchesAttributes(product: Product, query: ShopQuery): boolean {
  if (query.sizes.length > 0) {
    const hasSize = product.variants.some((variant) =>
      query.sizes.includes(variant.attributes.Size ?? ""),
    );
    if (!hasSize) {
      return false;
    }
  }
  if (query.colors.length > 0) {
    const hasColor = product.variants.some((variant) =>
      query.colors.includes(variant.attributes.Color ?? ""),
    );
    if (!hasColor) {
      return false;
    }
  }
  return true;
}

export function filterProducts(
  query: ShopQuery,
  scope: ListingScope = {},
  source: Product[] = products,
): Product[] {
  const q = query.q.trim();

  const candidates = source.filter((product) => {
    if (scope.categorySlug && product.categorySlug !== scope.categorySlug) {
      return false;
    }
    if (scope.brandSlug && product.brandSlug !== scope.brandSlug) {
      return false;
    }
    if (query.categories.length > 0 && !query.categories.includes(product.categorySlug)) {
      return false;
    }
    if (query.brands.length > 0 && !query.brands.includes(product.brandSlug)) {
      return false;
    }
    const price = displayPrice(product).current;
    if (query.minPrice !== undefined && price < query.minPrice) {
      return false;
    }
    if (query.maxPrice !== undefined && price > query.maxPrice) {
      return false;
    }
    if (query.rating && product.rating < query.rating) {
      return false;
    }
    if (!matchesAttributes(product, query)) {
      return false;
    }
    const stock = totalStock(product);
    if (query.availability === "in" && stock <= 0) {
      return false;
    }
    if (query.availability === "out" && stock > 0) {
      return false;
    }
    return true;
  });

  if (!q) {
    return candidates.sort((a, b) => compareProducts(a, b, query.sort));
  }

  const scored = candidates
    .map((product) => ({ product, score: matchScore(q, searchHaystack(product)) }))
    .filter((row) => row.score > 0);

  if (query.sort === "newest") {
    return scored.sort((a, b) => b.score - a.score).map((row) => row.product);
  }
  return scored
    .map((row) => row.product)
    .sort((a, b) => compareProducts(a, b, query.sort));
}

function searchHaystack(product: Product): string {
  const brand = getBrand(product.brandSlug)?.name ?? "";
  const category = getCategory(product.categorySlug)?.name ?? "";
  const skus = product.variants.map((variant) => variant.sku).join(" ");
  return `${product.name} ${brand} ${category} ${skus}`;
}

function compareProducts(a: Product, b: Product, sort: ShopSort): number {
  if (sort === "price-asc") {
    return displayPrice(a).current - displayPrice(b).current;
  }
  if (sort === "price-desc") {
    return displayPrice(b).current - displayPrice(a).current;
  }
  if (sort === "rating") {
    return b.rating - a.rating;
  }
  if (sort === "name") {
    return a.name.localeCompare(b.name);
  }
  return b.createdAt.localeCompare(a.createdAt);
}

export function paginateProducts(
  items: Product[],
  page: number,
): {
  items: Product[];
  page: number;
  pageCount: number;
  total: number;
} {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(page, 1), pageCount);
  const start = (current - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: current,
    pageCount,
    total: items.length,
  };
}

export function getProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getCategory(slug: string): CategoryLookup | undefined {
  return categories.find((category) => category.slug === slug);
}

type CategoryLookup = (typeof categories)[number];

export function getBrand(slug: string): (typeof brands)[number] | undefined {
  return brands.find((brand) => brand.slug === slug);
}

export function getRelatedProducts(product: Product): Product[] {
  return products
    .filter(
      (item) => item.slug !== product.slug && item.categorySlug === product.categorySlug,
    )
    .slice(0, 4);
}

export function searchSuggestions(term: string): Product[] {
  const q = term.trim().toLowerCase();
  if (q.length < 2) {
    return [];
  }
  return products.filter((product) => product.name.toLowerCase().includes(q)).slice(0, 6);
}

export function getReviews(slug: string) {
  return reviews.filter((review) => review.productSlug === slug);
}

export function getQuestions(slug: string) {
  return questions.filter((question) => question.productSlug === slug);
}

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export function getCmsPage(slug: string) {
  return cmsPages.find((page) => page.slug === slug);
}

export function facetValues(source: Product[] = products): {
  sizes: string[];
  colors: string[];
} {
  const sizes = new Set<string>();
  const colors = new Set<string>();
  source.forEach((product) => {
    product.variants.forEach((variant) => {
      if (variant.attributes.Size) {
        sizes.add(variant.attributes.Size);
      }
      if (variant.attributes.Color) {
        colors.add(variant.attributes.Color);
      }
    });
  });
  return {
    sizes: [...sizes],
    colors: [...colors],
  };
}

export { blogPosts, brands, categories, cmsPages, products };
