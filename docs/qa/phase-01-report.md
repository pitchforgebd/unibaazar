# Phase 1 QA report: Deployment pipeline

Branch: `v2/phase-01-deployment-pipeline`. Date: 2026-10-18.

## Scope change from the master plan, agreed with the human mid-phase

While working this phase, the human decided (see
`docs/decisions/0007-manual-deploy-trigger.md`) to build every phase of the
v2 rebuild before doing the first real production deploy, rather than
deploying after each phase as the master plan's §3.1 originally assumed.
`unibaazar.com` is live but not yet carrying real sales traffic, so this is
an acceptable, deliberate tradeoff on their part.

**Consequence for this phase's "done when" criterion** ("a dry-run deploy to
a staging subdomain succeeds end to end, including a migration and a
forced-failure automatic rollback"): this is **deferred, not met**. It
becomes the acceptance test for whenever the human runs the first real
deploy, not a gate Phase 1 had to clear before Phase 2 could start — they
explicitly confirmed this and chose to keep the normal phase-by-phase
branch/PR/review cadence otherwise unchanged.

## What was built

1. **`.github/workflows/ci.yml`** — on every push: runs the full verify
   suite (typecheck, lint, unit, integration, E2E desktop + mobile, a11y,
   Lighthouse) against a MySQL 8 service container matching
   `docker-compose.test.yml`; on `main`, additionally builds and packages a
   release artifact (production `node_modules` + `.next` + `public` +
   `server.js` + `prisma/`) as a workflow artifact.
2. **`.github/workflows/deploy.yml`** — manual (`workflow_dispatch`, takes a
   commit SHA): looks up that commit's successful `ci` run, downloads its
   artifact, uploads it over SSH, and runs `scripts/deploy/deploy-release.sh`
   on the host (backup → migrate → switch `current` → restart → smoke-test
   `/api/health` → auto-rollback on failure → prune to the last 5 releases).
3. **`scripts/deploy/apply-migrations.sh`** — applies committed Prisma
   migrations via the `mysql` CLI only, no Prisma CLI, no Node. **Verified
   locally**, end to end, against a disposable MySQL schema:
   - All 13 committed migrations apply cleanly on a fresh database.
   - Re-running is a clean no-op (idempotent).
   - The checksums it records in `_prisma_migrations` match **exactly**
     what `prisma migrate deploy` itself produces (byte-for-byte compared
     against the Phase 0 test database) — so `prisma migrate status` run
     from a dev machine stays accurate against a database this script
     migrated.
4. **`scripts/deploy/deploy-release.sh`** — the actual switch-over logic
   (previously inline in the workflow YAML, extracted so it's
   version-controlled and testable on its own). Syntax-checked
   (`bash -n`); the symlink-switch behavior itself couldn't be exercised in
   this sandbox (Windows filesystem here doesn't support the symlinks it
   relies on — see "Known limitations" below) and will get its first real
   exercise at the eventual first deploy.
5. **`scripts/deploy/rollback.sh`** — manual one-command rollback to any
   previously unpacked release. Syntax-checked.
6. **`scripts/deploy/backup-db.mjs`** — extended with a configurable
   `BACKUP_DIR` (so it can target the shared, cross-release backups folder
   in production) and a 14-backup retention policy. Moved from
   `scripts/backup-db.{sh,mjs}` to `scripts/deploy/` to sit with the rest of
   the deploy tooling.
7. **`GET /api/health`** — `{status, version, db, uptime}`, matching the
   master plan's §3.3 shape exactly. `version` is read from
   `release-info.json`, written by `ci.yml`'s build job
   (`{sha, builtAt}`). Has both a unit-adjacent integration test
   (`src/app/api/health/route.integration.test.ts`, verifies `db: "ok"`
   against the real test database) and is reachable in the E2E critical-path
   flow indirectly (not directly asserted there — see "known limitations").
8. **Docs**: rewrote `DEPLOYMENT.md` for the new flow; added
   `docs/deploy/host-facts.md` (what's needed from the human before the
   first real deploy — not blocking right now) and
   `docs/deploy/github-secrets.md` (the six GitHub Secrets the pipeline
   needs, and how to generate each one).
9. **ADRs 0004–0007**: SCP vs. rsync for the artifact upload, the still-open
   Prisma `binaryTargets` question, deferring the cPanel-Git fallback until
   SSH availability is known, and the manual-deploy-trigger decision itself.

## Test matrix and results

| Check                                             | Result                                                                                                                                                                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                                         | ✅ pass                                                                                                                                                                                                                      |
| Lint                                              | ✅ pass                                                                                                                                                                                                                      |
| Unit tests                                        | ✅ 13/13 pass (unchanged from Phase 0)                                                                                                                                                                                       |
| Integration tests                                 | ✅ 3/3 pass (2 from Phase 0 + the new `/api/health` test)                                                                                                                                                                    |
| `apply-migrations.sh` against a disposable schema | ✅ all 13 migrations apply, idempotent on re-run, checksums match Prisma's own                                                                                                                                               |
| `backup-db.mjs`                                   | ✅ runs (fails only on `mysqldump` not being on this sandbox's `PATH`, which is expected — it's a Windows dev machine, not the Linux host; the DB-URL parsing and file-handling logic that _is_ testable here ran correctly) |
| `deploy-release.sh`, `rollback.sh`                | Syntax-checked (`bash -n`) only — see "Known limitations"                                                                                                                                                                    |
| CI/deploy workflow YAML                           | ✅ both parse as valid YAML (validated with the `yaml` npm package); **not** validated by an actual GitHub Actions run — see below                                                                                           |

## Known limitations

- **The GitHub Actions workflows have not been run for real.** I have no way
  to trigger a workflow run from this sandbox (no `gh` CLI, and pushing to
  `main` myself is against the rules). They're written to well-established
  patterns (`appleboy/ssh-action`, `appleboy/scp-action`,
  `browser-actions/setup-chrome`, GitHub's own service-container syntax) and
  pass YAML validation, but the first real run — likely `ci.yml`, since it
  needs no secrets — will be the first real signal of whether they're
  correct. If it fails, send me the Actions log and I'll fix it.
- **The symlink-switch logic in `deploy-release.sh` and `rollback.sh` could
  not be exercised locally.** This Windows sandbox's filesystem doesn't
  support the `ln -s` / `readlink` calls those scripts depend on (confirmed:
  attempting it silently produced a plain directory, not a symlink). The
  actual host is Linux, where this is standard and reliable — but it means
  this part of the pipeline is syntax-checked, not behavior-tested, until
  the first real deploy.
- **Prisma's `binaryTargets` is still unset** (ADR 0005) — the CI build job
  runs on `ubuntu-latest` and ships that platform's compiled Prisma engine;
  if the production host's OpenSSL ABI doesn't match, the app will fail to
  boot after the first real deploy with a shared-library error. This is a
  known, flagged gap, not an oversight — it needs the host's `openssl
version` output, which isn't available yet (and isn't needed until the
  first real deploy either, per the scope change above).
- **`/api/health` isn't directly asserted in the Playwright critical-path
  flow.** It has its own integration test instead. Could add an explicit
  E2E check later if useful; didn't seem worth a dedicated flow for one
  endpoint already covered at the integration level.

## Manual QA

Walked through `apply-migrations.sh` manually against a disposable MySQL
schema on this machine (not the test DB used for other suites, to avoid any
cross-contamination): created an empty schema, ran the script, confirmed all
tables and the `_prisma_migrations` bookkeeping table were created
correctly, confirmed idempotency on a second run, confirmed checksums match
a database migrated by real `prisma migrate deploy`, then dropped the
schema. Read through `deploy-release.sh` and `rollback.sh` line by line
against the master plan's §3.1 pipeline steps to confirm every step is
present in the right order (shared-dir symlinks → backup → migrate → switch
→ restart → smoke-test → rollback-on-failure → prune).

## Deploy notes

- **No migrations in this phase** (no schema changes — this phase is pure
  tooling/infrastructure).
- **New GitHub Secrets needed before the first real deploy** (not now):
  `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_PORT`, `APP_PATH`,
  `HEALTH_CHECK_URL` — see `docs/deploy/github-secrets.md`.
- **No new cron jobs** (the existing backup cron line in `DEPLOYMENT.md` is
  updated to point at the new `scripts/deploy/backup-db.mjs` path — the
  human should update it on the host whenever they're next in there, no
  rush since nothing has actually deployed yet).
- **Action needed from the human**: none right now. When ready for the
  first real deploy, work through `docs/deploy/host-facts.md`,
  `docs/deploy/github-secrets.md`, and `DEPLOYMENT.md` in order.

## Pull request

`v2/phase-01-deployment-pipeline` → `main`.

> **Phase 1: Deployment pipeline**
>
> Builds the CI/CD pipeline from `UNIBAAZAR_V2_MASTER_PLAN.md` §3: GitHub
> Actions CI (test + build on every push), a deploy workflow (SSH upload,
> DB backup, migration via a Prisma-CLI-free script, symlink switch,
> restart, smoke test, automatic rollback on failure), and `/api/health`.
>
> Mid-phase scope change, agreed with the project owner: deploys are
> **manual** for now (`workflow_dispatch`), not automatic on merge — the
> plan is to build every phase before the first real production deploy
> (`docs/decisions/0007-manual-deploy-trigger.md`). `ci.yml` still tests
> and builds on every push regardless, keeping `main` provably deployable.
>
> `apply-migrations.sh` is verified end-to-end locally against a disposable
> database (checksums match real `prisma migrate deploy` exactly). The
> symlink-switch logic and the GitHub Actions workflows themselves haven't
> been run for real yet — no way to do that from this environment — so
> expect to iterate once the first real run (or the first real deploy)
> happens.
>
> No migrations, no env vars needed yet, no cron changes needed yet.
