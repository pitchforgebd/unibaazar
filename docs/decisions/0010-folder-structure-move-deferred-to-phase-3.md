# 0010: Defer the bulk `modules/`/`integrations/` folder move to Phase 3

## Context

Master plan §2.2 describes a target folder structure (`src/modules/<domain>/`,
`src/integrations/<provider>/`) that the real codebase doesn't have yet — it's
still organized as `src/server/*`, `src/lib/*`, `src/components/*`, grouped by
feature rather than by bounded module. Phase 2's task list says: _"Move to the
folder structure in §2.2 incrementally. Pure moves go in their own commits."_
Phase 0's ADR 0001 deferred the import-boundary **lint rule** specifically to
"once Phase 2 reorganizes."

## What happened in Phase 2

New code written this phase went into reasonably-scoped new locations
(`src/i18n/{routing,navigation}.ts`, `src/server/cache/tags.ts`,
`src/components/layout/SiteScripts.tsx`, `src/lib/logger.ts`), but the bulk
of the existing tree — ~100+ files across `src/server/`, `src/lib/`,
`src/components/store/`, `src/components/admin/` — was not moved into
`modules/`/`integrations/`. The incremental work this phase actually did
(i18n/middleware restructuring moving the entire `(store)` route group under
`[locale]/`, two large parallel features landing in their own worktrees) was
already a lot of simultaneous structural churn; moving the rest of the tree
at the same time would have meant resolving that move against every other
change in flight, with no real benefit to this phase's own goals.

## Decision

Defer the bulk `modules/`/`integrations/` move to **Phase 3 (Commerce core)**,
where it stops being a separate reorganization task and becomes the natural
shape of the work already planned there: §5.1 explicitly creates
`modules/pricing` as "the ONLY place prices, discounts, delivery, and tax are
computed," and Phase 3's task list is "implement §5.1 money/pricing, §5.2
catalog, §5.3 inventory, and §5.4 orders" — each of those _is_ a `modules/`
folder per §2.2's target tree. Building them there directly, and moving each
domain's existing `src/server/<domain>/*` code into the matching
`modules/<domain>/` folder as that domain gets touched for real business-logic
work (not as a cosmetic rename), is both the incremental approach the plan
asks for and avoids a disruptive one-shot move across a huge number of files
with no behavior change to show for it.

The ESLint import-boundary rule (ADR 0001) stays deferred until enough of
`modules/` exists for the rule to apply to something.

## Consequences

- `CLAUDE.md`'s "Target architecture" section already describes this as
  "introduced in Phase 2" — update that wording once Phase 3 actually starts
  the move, so it doesn't claim a folder structure that isn't there yet.
- A future session picking up Phase 3 should treat "move this domain's code
  into `modules/<domain>/`" as part of each Phase 3 task (pricing, catalog,
  inventory, orders), not a separate preliminary step — and should keep doing
  pure-move commits separate from logic-change commits within that work, per
  the master plan's git-workflow rule.
- Domains Phase 3 doesn't touch (content, media, auth, access, settings,
  notifications, audit — also named in §2.2's target tree) stay in their
  current `src/server/*` locations until whichever later phase actually
  works on them, for the same reason.
