# Changelog

All notable changes to UniBaazar are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); phases are tracked instead of
version numbers while the v2 rebuild (`UNIBAAZAR_V2_MASTER_PLAN.md`) is in progress.

## Phase 2 (slice) — Admin Maintenance module (2026-10-18)

One slice of Phase 2 ("Foundation refactor"); the rest of the phase is still
in progress.

### Added

- `/admin/maintenance`: a super-admin-only admin module that runs idempotent
  maintenance jobs inside the already-warm app process (no background
  workers/queues — this host can't support them, see `ARCHITECTURE.md` §12).
  Registry in `src/server/admin/maintenance/jobs.ts`: cache clear, sitemap
  rebuild (no-op — `/sitemap.xml` is already always-fresh), search reindex
  (no-op — search has no separate index to rebuild), media backfill (stubbed;
  see "Scope note" below), seed demo catalog, and bootstrap admin account.
- `MaintenanceJobRun` Prisma model: logs every run (job, status, who
  triggered it, when, result summary) and backs the "last 5 runs" table shown
  per job.
- `requireSuperAdmin()`/`superAdminAccess()` in `src/server/admin/access.ts`
  — the first admin guard that checks the `super-admin` role directly rather
  than a permission slug, because `admin` and `super-admin` hold identical
  permission grants today.
- `src/server/media/backfill.ts`: a placeholder `backfillMediaVariants()`
  (exact signature the media-pipeline slice is expected to implement) so the
  Maintenance module's media-backfill job compiles and is wired up ahead of
  that parallel task landing.

### Removed

- `src/app/api/v1/cron/seed-catalog/route.ts` and
  `src/app/api/v1/cron/bootstrap-admin/route.ts` — the curl'd, `CRON_SECRET`-
  gated one-off bootstrap routes. Their upsert-based logic moved unchanged
  into the Maintenance module's "Seed demo catalog" and "Bootstrap admin
  account" jobs. The `cron/*` route pattern itself is unchanged for the
  remaining _scheduled_ jobs (`low-stock-sweep`, `cancel-unpaid-orders`).

### Scope note

`backfillMediaVariants()` is a stub (`throw new Error("not implemented yet
— see the media pipeline task")`) because the real implementation belongs to
a separate, parallel Phase 2 slice (the media pipeline) that may not have
landed yet. Whoever lands it replaces `src/server/media/backfill.ts` in
place; nothing else in the Maintenance module needs to change.

## Phase 1 — Deployment pipeline (2026-10-18)

### Added

- `.github/workflows/ci.yml`: full verify suite against a MySQL 8 service
  container on every push; builds and packages a release artifact on `main`.
- `.github/workflows/deploy.yml`: uploads a release over SSH, backs up the
  database, migrates, switches the live release, restarts, smoke-tests, and
  auto-rolls-back on failure. **Manual trigger** (`workflow_dispatch`), not
  automatic on merge — see "Scope change" below.
- `scripts/deploy/apply-migrations.sh`: applies committed Prisma migrations
  via the `mysql` CLI only, no Prisma CLI/Node — verified end to end
  locally (checksums match real `prisma migrate deploy` exactly).
- `scripts/deploy/deploy-release.sh`: the switch-over logic (backup,
  migrate, symlink switch, restart, smoke test, rollback on failure).
- `scripts/deploy/rollback.sh`: manual one-command rollback to any previous
  release.
- `GET /api/health`: `{status, version, db, uptime}`.
- `docs/deploy/host-facts.md`, `docs/deploy/github-secrets.md`: what's
  needed from the host/GitHub before the first real deploy.

### Changed

- `scripts/backup-db.{sh,mjs}` moved to `scripts/deploy/`, extended with a
  configurable `BACKUP_DIR` and 14-backup retention.
- `DEPLOYMENT.md` rewritten for the new pipeline.
- `CLAUDE.md` updated with the deploy-is-manual decision.

### Scope change (agreed with the project owner mid-phase)

Deploys are deliberately manual for now, not automatic on merge — the plan
is to build every v2 phase first and do one real production deploy once
everything's ready, since the site is live but not yet carrying real sales
traffic. See `docs/decisions/0007-manual-deploy-trigger.md`. `ci.yml` still
tests and builds on every push regardless, so `main` stays provably
deployable throughout. This also means this phase's original "done when"
criterion (a live dry-run deploy including a forced rollback) is deferred
to whenever that first real deploy happens, not a Phase 1 exit gate — see
`docs/qa/phase-01-report.md`.

## Phase 0 — Audit, safety, and baseline (2026-10-18)

### Security fixes

- `webhookSecret()` no longer falls back to a hardcoded literal when `AUTH_SECRET`
  is unset — it throws instead, closing a path where anyone who knew the fallback
  string could have forged payment-callback requests.
- OTP and password-reset codes now use `crypto.randomInt()` instead of
  `Math.random()`.
- Removed the real DB password and the seeded admin password from `DEPLOYMENT.md`
  (both were committed in plaintext and already pushed to `origin/main` —
  rotation still needed, see `docs/qa/phase-00-report.md`).

### Tooling added

- Vitest (`npm run test:unit`, `test:integration`) and Playwright
  (`test:e2e`, `test:e2e:mobile`, `test:a11y`, `test:visual`) with desktop + mobile
  projects.
- `npm run verify` / `verify:full` per the master plan's command reference.
- Lighthouse CI (`npm run lhci`) against home/shop/product/checkout.
- `docker-compose.test.yml` for an isolated MySQL 8 test database.
- commitlint + a `commit-msg` hook enforcing Conventional Commits.
- `.claude/settings.json` and `CLAUDE.md` (condensed operating rules for future
  sessions).

### Removed

- `src/lib/mock/cart.ts` — dead code, zero importers.

### Docs

- `docs/audit/current-state.md` — full Phase 0 codebase audit.
- `docs/decisions/0001`–`0003` — ADRs for import-boundary deferral, secret
  scanning without a local gitleaks binary, and the local test-DB workaround.
- `docs/qa/phase-00-report.md` — this phase's QA report.

### Known limitations carried forward (not fixed in Phase 0 — see audit doc)

- Delivery-charge calculation is duplicated between the authoritative checkout
  quote and a hardcoded cart/checkout preview; they can disagree.
- bKash/Nagad admin settings don't affect payment routing yet.
- The client-side cart's stock check reads mock catalog data, not the database.
- Organization/WebSite JSON-LD never reads admin-edited store settings.
- Near-zero automated test coverage on checkout, orders, payments, and auth.
- Storefront color tokens fail WCAG AA contrast in several places (brand
  orange, one delivery-partner badge color) — scheduled for Phase 4's design
  system.
