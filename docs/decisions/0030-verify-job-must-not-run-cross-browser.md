# 0030 — CI's `verify` job must not run `verify:full` (it includes cross-browser)

Date: 2026-10-30
Status: accepted

## Context

With ADR 0027 (migration case bug) and ADR 0029 (force-click) both
fixed, the `verify` job's e2e steps passed for the first time —
`test:e2e` and `test:e2e:mobile` both went green on the exact same CI
run that had failed at `test:e2e:mobile` moments before. But the job
still failed, now at `test:e2e:cross`:

```
Error: browserType.launch: Executable doesn't exist at
/home/runner/.cache/ms-playwright/webkit-2370/pw_run.sh
```

Cause: `package.json`'s `verify:full` script includes
`test:e2e:cross` in its own chain, and `ci.yml`'s `verify` job ran
`npm run verify:full` directly. But that job's Playwright install step
only installs `chromium` — webkit and firefox are installed by the
separate `cross-browser` job, whose own comment in `ci.yml` says
explicitly: _"Separate from `verify` so the common path isn't slowed by
three engines."_ The intent was always to keep cross-browser out of the
common job; `verify:full`'s composition quietly contradicted that the
whole time.

This had been present since cross-browser was added in Phase 12
(`feat(security): add db-backed rate limits, CSRF coverage,
cross-browser gate`) — invisible until today, because the `verify` job
had never gotten past `db:migrate:test` (ADR 0027) and then
`test:e2e:mobile` (ADR 0029) to actually reach this step. A third real
bug, found only because the first two were fixed and CI ran far enough
to hit it — consistent with everything else found today.

## Decision

Split `verify:full` into two scripts:

- `verify:ci`: everything except cross-browser (typecheck, lint, unit,
  integration, build, e2e desktop + mobile, a11y, parity, lighthouse).
  This is what `ci.yml`'s `verify` job now runs.
- `verify:full`: `verify:ci` plus `test:e2e:cross` — unchanged in
  substance, still the complete local pre-push check documented in
  `CLAUDE.md`'s end-of-phase protocol.

`ci.yml`'s `verify` job step now calls `verify:ci` instead of
`verify:full`, with a comment explaining why, so this doesn't quietly
regress back if someone "simplifies" it later.

## Consequences

- `CLAUDE.md`'s Commands section updated to document both scripts and
  which one CI's `verify` job runs. The end-of-phase protocol still says
  `verify:full` deliberately — a human running the complete local check
  before ending a phase should still get cross-browser coverage.
- **Confirmed 2026-10-30**: the `verify` job completed in full on the
  next run. Its remaining steps — e2e, a11y, parity, `lhci` — then
  surfaced two further issues, fixed separately: Lighthouse's Chrome
  needing `--no-sandbox` on GitHub's runners (`lighthouserc.js`, commit
  `3b24dff`), and `build-artifact` needing a real database
  (`docs/decisions/0031-build-artifact-needs-a-real-database.md`).
- The separate `cross-browser` job's font loader crash turned out to
  recur a third time before resolving on its own — the symptom (a
  different family failing each run) was always more consistent with
  transient Google Fonts API flakiness than a config bug, and that
  theory held, but the repeated cost of it blocking a clean run led to
  removing the dependency entirely rather than continuing to retry —
  see `docs/decisions/0032-self-host-fonts.md`.
