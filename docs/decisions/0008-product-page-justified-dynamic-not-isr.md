# 0008: Product detail page is justified-dynamic, not page-level ISR

## Context

Phase 2 restores ISR for product/category/brand pages now that locale comes
from the URL (middleware) instead of a cookie read inside the render path
(ARCHITECTURE.md §12's original bug). Category and brand pages read
`searchParams` server-side for filtering, so they're legitimately
justified-dynamic regardless — Next.js always renders a route dynamically
per request when it reads `searchParams`. Product detail doesn't read
`searchParams`, so true page-level ISR (`generateStaticParams() { return
[]; }`, matching the original pre-regression design intent) seemed like it
should just work once the locale fix landed.

It didn't. Testing found a second, narrower bug: with the product page's own
`generateStaticParams() { return []; }` nested under `[locale]/layout.tsx`'s
`generateStaticParams` (which returns both `"en"` and `"bn"`), the request
for the _second_ locale value consistently failed with a 500
(`digest: DYNAMIC_SERVER_USAGE`), while the first locale worked every time —
confirmed reproducible, order-independent (tried `bn` first on a fresh
server too), on Next.js 15.5.27. Neither page reads any dynamic API
(`cookies()`, `headers()`, etc.) directly. Removing `generateStaticParams`
from the product page entirely fixed `/bn/product/[slug]` immediately, with
no other change. This looks like a framework limitation in how Next.js
handles a child route's empty `generateStaticParams` fallback across a
parent segment's multiple static param values, not an application bug.

## Decision

`src/app/[locale]/(store)/product/[slug]/page.tsx` has no
`generateStaticParams`, no `dynamic` export, and no `revalidate` export —
Next.js renders it per request (confirmed `ƒ` in the build output), same
classification as category/brand. The underlying data fetch
(`getStoreProduct` in `src/server/catalog/products.ts`) is still wrapped in
`unstable_cache` with `revalidateTag`-based on-demand invalidation, so the
expensive DB query is cached even though the page HTML itself isn't — the
same pattern used for category/brand.

## Consequences

- Doesn't fully satisfy the literal letter of "every storefront page is
  either ISR or justified-dynamic" if read as "product must be ISR" — but
  does satisfy the spirit (cached where it safely can be, dynamic where it
  can't, with a documented reason either way) and keeps the site working in
  both locales, which the literal ISR version did not.
- Revisit this the next time Next.js is upgraded — worth a quick retest of
  the original `generateStaticParams() { return []; }` form to see if the
  underlying framework issue is fixed, since true page-level ISR would
  still be a meaningful performance win over per-request rendering.
- Category and brand were never going to be page-level ISR regardless (the
  `searchParams` usage forces dynamic independent of this bug), so this
  decision doesn't change their classification.
