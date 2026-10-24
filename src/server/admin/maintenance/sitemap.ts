// Every sitemap route (src/app/sitemap.xml, src/app/sitemaps/*.xml,
// src/app/image-sitemap.xml) is `export const dynamic = "force-dynamic"`
// — each runs its own queries fresh on every single request, the same
// reason product/category/brand pages can't be prerendered on this
// host (ARCHITECTURE.md §12). There is no stored sitemap artifact to
// regenerate and nothing to invalidate, so there is no real "rebuild"
// job here — this is a deliberate no-op that says so, rather than
// faking work the app doesn't need.
export async function rebuildSitemap(): Promise<{ note: string }> {
  return {
    note:
      "No-op: every sitemap (index + per-type + image) is rendered fresh from the " +
      "database on every request. There is nothing to rebuild.",
  };
}
