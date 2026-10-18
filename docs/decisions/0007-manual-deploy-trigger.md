# 0007: Deploy is a manual trigger, not automatic on merge to main

## Context

The master plan's §3.1 design is "push/merge to main" → CI → automatic
deploy. That's still the end state. But the business decision (from the
project owner, 2026-10-18) is to build the entire v2 rebuild — all phases —
locally/in CI first, and do one real deploy once everything is ready, rather
than deploying after every phase. `unibaazar.com` is live but not yet being
used for real sales, so the risk tolerance for "nothing deploys for a
while" is different from what the master plan assumed when it was written.

## Decision

`deploy.yml` triggers on `workflow_dispatch` with a required `sha` input,
not automatically via `workflow_run` after `ci` succeeds on `main`. A
`find-ci-run` job looks up the matching successful `ci` run for that SHA (via
`gh run list`) and passes its run ID to the deploy job, so the artifact
`ci.yml` already built and tested is what actually ships — no rebuilding,
no risk of deploying something that wasn't tested.

`ci.yml` itself is unchanged: it still runs the full verify suite and builds

- packages a release artifact on every push to `main`, regardless of whether
  anyone ever deploys it. That's valuable on its own (catches regressions
  immediately, keeps `main` always in a known-good, deployable state) and
  costs nothing extra to keep running.

The phase-by-phase branch → PR → merge workflow (§0.3) is unchanged — each
phase still gets its own PR that the human reviews and merges before the
next phase starts. Only the "merge also deploys" part is turned off for now.

## Consequences

- Nothing deploys until someone explicitly runs the `deploy` workflow from
  the Actions tab (or `gh workflow run deploy.yml -f sha=<sha>`) and picks
  which commit to ship — almost certainly the tip of `main` once all phases
  are merged, but it could also be used to deploy an earlier, specific
  commit if needed.
- The Phase 1 "done when" criterion (§3, Phase 1: "a dry-run deploy to a
  staging subdomain succeeds end to end, including a migration and a
  forced-failure automatic rollback") is **deferred, not abandoned** — it
  becomes the acceptance test for whenever the human decides to do the first
  real deploy, not a Phase 1 exit gate. `docs/qa/phase-01-report.md` records
  this explicitly so it isn't mistaken for Phase 1 having skipped testing.
- `docs/deploy/host-facts.md`'s questions (OpenSSL version, SSH access, a
  staging target) are no longer blocking — they're only needed before that
  eventual first real deploy, not before Phase 2+ can start.
- If the business decision changes back to "deploy continuously," reverting
  is a one-line change: swap the `on:` trigger back to `workflow_run` (kept
  exactly as it was in the prior version, visible in git history) and this
  ADR gets superseded.
