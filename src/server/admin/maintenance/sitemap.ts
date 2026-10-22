// src/app/sitemap.ts is `export const dynamic = "force-dynamic"` — it runs
// the same product/category/blog/page queries fresh on every single request
// to /sitemap.xml (see its own comment: it can't be prerendered on this host
// for the same reason product/category/brand pages can't — ARCHITECTURE.md
// §12). There is no stored sitemap artifact to regenerate and nothing to
// invalidate, so there is no real "rebuild" job here — this is a deliberate
// no-op that says so, rather than faking work the app doesn't need.
export async function rebuildSitemap(): Promise<{ note: string }> {
  return {
    note:
      "No-op: /sitemap.xml is rendered fresh from the database on every request " +
      "(src/app/sitemap.ts is force-dynamic). There is nothing to rebuild.",
  };
}
