# 0031 — `build-artifact` needs a real database; admin must be `force-dynamic`

Date: 2026-10-30
Status: accepted

## Context

With `verify` and `cross-browser` both green (ADR 0027, 0029, 0030),
`build-artifact` ran against real content for the first time — it's
gated to `github.ref == 'refs/heads/main'`, and everything before today
developed on phase branches. It had never executed meaningfully before.

It failed immediately in `next build`'s "Collecting page data" phase,
against `DATABASE_URL: mysql://build:build@127.0.0.1:3306/build` — a
syntactically valid but genuinely unreachable address, set deliberately
per the job's own comment: _"No real DB connection is needed at build
time — every DB-backed route is dynamic (ARCHITECTURE.md §3)."_

That claim does not hold for the codebase as it actually stands:

1. **Every one of the 63 `(admin)/admin/*` pages** is missing
   `export const dynamic = "force-dynamic"`. At runtime this was masked
   — the nested `admin/layout.tsx` reads `headers()`, a dynamic API,
   which forces dynamic rendering before any page body runs. But the
   outer root `(admin)/layout.tsx` calls `loadSystem()` (a plain DB
   read, no dynamic-API marker) _before_ that, so Next's build-time
   static-optimization pass tried to prerender every admin page, hit
   that DB call first, and crashed — never getting far enough to see
   the nested layout's `headers()` call that would have told it to skip
   prerendering.
2. **`[page-slug]/page.tsx` and `blog/[slug]/page.tsx`** both call
   `prisma.page.findMany()` / `prisma.blogPost.findMany()` directly in
   `generateStaticParams`, unguarded. Both are legitimate ISR candidates
   (editorial content, `revalidate = 300`) — unlike `product/[slug]`,
   which dropped `generateStaticParams` entirely after a _different_,
   genuine Next.js framework bug (ADR 0008). There's no framework bug
   here, only the build-time DB being unreachable.
3. **`/checkout`** (and, by the same pattern, likely other SSG
   storefront pages) reads `prisma.setting.findUnique()` directly during
   render, not just in `generateStaticParams`.

Finding and patching every individual callsite like this, one crash at
a time, under deploy pressure, is exactly the kind of unbounded
whack-a-mole this project has learned to avoid (see the two wrong
diagnoses recorded in ADR 0023). Each new one found did not mean the
problem was now understood — it meant it wasn't.

## Decision

Two fixes, not three:

1. **`src/app/(admin)/layout.tsx`**: added `export const dynamic =
"force-dynamic"`. This is a route-segment config, which inherits
   down the whole subtree — one line fixes all 63 admin pages, rather
   than adding the same export 63 times. This is also the _correct_
   semantic fix independent of the build crash: admin is never meant to
   be static (ARCHITECTURE.md §4.5), so this should have been explicit
   from the start.
2. **`build-artifact` builds against a real, empty, migrated database**
   instead of an unreachable one — the same `services.mysql` +
   `prisma migrate deploy` pattern the `verify` job already runs
   successfully, every push, proven again today. This is the general
   fix for everything else (`[page-slug]`, `blog/[slug]`, `/checkout`,
   and whatever else reads live data during prerendering that hasn't
   surfaced yet): a real but empty database answers every query
   gracefully — `findFirst`/`findUnique` return `null`, `findMany`
   returns `[]` — which the app already has to handle correctly
   anyway (a freshly-seeded or newly-launched store has empty tables
   too).

`[page-slug]/page.tsx` and `blog/[slug]/page.tsx`'s `generateStaticParams`
were also wrapped in try/catch, falling back to `[]` (`dynamicParams`
defaults to `true`, so every page still renders - and then ISR-caches -
on its own first real request). This is kept as defense in depth, not
the primary fix: the real database build-artifact now uses makes the
try/catch unnecessary for that job specifically, but it's a legitimate,
low-risk improvement regardless of what `build-artifact` does — a page
able to pre-render some content vs. none shouldn't hard-fail just
because the one query enumerating paths failed.

## Consequences

- **Verified locally, completely** — unlike ADR 0027's fix (OS/MySQL
  case-sensitivity, genuinely unreproducible on Windows), this one
  could be fully reproduced: created a fresh local database, ran
  `prisma migrate deploy` against it, then `next build` with
  `DATABASE_URL` pointing at it and `NEXT_PUBLIC_SITE_URL` set exactly
  as `build-artifact`'s own `Build` step does. Exit 0, zero errors,
  admin pages correctly marked `ƒ` (dynamic) in the output. `build:test`
  (the already-working path `verify`/`cross-browser` use) re-verified
  unaffected by the same edits.
- `build-artifact` now runs a few seconds slower (spin up MySQL, apply
  19 migrations) — negligible next to the job it replaces hard-failing
  on every push to `main`.
- The thrown-away `unibaazar_build` database is schema-only, no seed
  data, and exists only for the duration of the job (GitHub Actions
  service containers are ephemeral) — nothing from it reaches the
  release artifact, which is still only `.next`/`public`/`node_modules`/
  etc., not a database dump.
- **This may not be the last page found.** The search here was driven
  by actual build failures, not an exhaustive audit of every
  Server Component for unguarded DB reads — unlike ADR 0027's migration
  casing, which got one (script-aided, exhaustive) pass over all 19
  migration files. A real database answering every query gracefully is
  what makes this fix general rather than requiring that exhaustive
  pass: any remaining unguarded read now gets a `null`/`[]`, not a
  crash, regardless of whether it's been specifically found.
