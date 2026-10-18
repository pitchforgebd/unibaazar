import { revalidatePath } from "next/cache";

// This codebase has no `revalidateTag`/tag vocabulary yet (grepped for it —
// nothing in src/app/(admin)/admin/*-actions.ts or a src/server/cache/tags.ts
// file; every existing admin action calls `revalidatePath` directly, e.g.
// src/app/(admin)/admin/settings-actions.ts's `refresh()`). This job is the
// manual "invalidate everything" button for when an admin suspects stale
// cache: `revalidatePath("/", "layout")` invalidates every route under the
// root layout (the whole app shares one), which is already how the broadest
// existing `refresh()` helpers clear the storefront. Phase 3's tag-based
// invalidation (see ARCHITECTURE.md's audit note on admin/storefront parity)
// can replace this with a scoped `revalidateTag` call per tag later.
export async function clearAllCaches(): Promise<{ paths: string[] }> {
  // The root layout wraps every route group ((store) and (admin) alike), so
  // this one call invalidates the entire app, not just "/".
  revalidatePath("/", "layout");
  return { paths: ["/ (and everything under it)"] };
}
