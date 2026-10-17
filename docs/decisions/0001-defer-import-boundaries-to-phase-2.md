# 0001: Defer ESLint import-boundary enforcement to Phase 2

## Context

The master plan (§2.2, Phase 0 tooling list) calls for "ESLint import boundaries." The
target rule is that `modules/` and `integrations/` talk to each other only through their
exported `index.ts`. That folder structure doesn't exist yet — the real codebase still
uses `src/server/*`, `src/lib/*`, and `src/components/*` grouped by feature, not by
bounded module. Checked whether a narrower rule could be enforced today (e.g. "no
`@/lib/mock/*` import outside `app/`"), but the only current importers of mock data
(`src/app/(store)/page.tsx` blog-teaser fallback, `src/app/api/v1/cron/seed-catalog/route.ts`)
are already-known, already-flagged issues the plan itself schedules for removal in
Phase 2 (§2.2 "Remove mock data from all runtime paths" / the Maintenance module). Adding
the rule now would just force `eslint-disable` comments on code we're about to delete
anyway.

## Decision

Install the import-boundary tooling capability now is skipped; it's picked up in Phase 2
once `modules/` and `integrations/` exist, at the same time the mock-data runtime paths
are removed. No extra idle dependency is added in Phase 0.

## Consequences

- Phase 0 ships without a lint rule enforcing module boundaries — acceptable because
  there are no modules to bound yet.
- Phase 2's "Done when" criteria should explicitly include adding the boundary rule
  alongside the folder move, not as an afterthought.
