import { revalidatePath, revalidateTag } from "next/cache";
import { TAGS } from "@/server/cache/tags";

// `revalidatePath("/", "layout")` invalidates the Full Route Cache for every
// route under the shared root layout — but `getStoreProduct`/listStore*`
// (src/server/catalog/products.ts) and friends are cached via `unstable_cache`
// with their own custom tags (src/server/cache/tags.ts), which `revalidatePath`
// does not purge. This job is the manual "invalidate everything" button for
// when an admin suspects stale data, so it also walks every static tag.
// Per-slug tags (product:<slug>, etc.) aren't enumerable here; they expire on
// their own 300s timer (CATALOG_REVALIDATE_SECONDS) or get busted individually
// by the admin write that touched that slug.
export async function clearAllCaches(): Promise<{ paths: string[] }> {
  revalidatePath("/", "layout");
  const staticTags = [
    TAGS.products,
    TAGS.categories,
    TAGS.brands,
    TAGS.home,
    TAGS.blog,
    TAGS.cmsPages,
    TAGS.settings,
  ];
  staticTags.forEach((tag) => revalidateTag(tag));
  return { paths: ["/ (and everything under it)", ...staticTags] };
}
