# 0003: Local test database setup without Docker in this sandbox

## Context

Phase 0 calls for "a seeded test DB via `docker compose` (MySQL 8) for local and CI
use." Docker isn't installed in this sandboxed shell (`docker --version` fails), but
GitHub Actions runners have Docker by default, so CI is unaffected.

## Decision

- `docker-compose.test.yml` is the real, committed artifact: a MySQL 8 service on
  host port 3307 with a named volume, used by `npm run db:up` / `db:down` and by CI.
- For this session's own verification (proving migrations + seed + the baseline E2E
  suite actually pass), used the MySQL 8.0 server already running locally for this
  machine's other projects (Laragon's bundled MySQL on port 3306) and created a
  sibling, empty `unibaazar_test` schema there — never touching the existing
  `unibaazar` dev database. This is a one-off local workaround, not the documented
  path; `.env.test` still points at port 3307 (the docker-compose port) as the
  canonical local/CI setup.

## Consequences

- Anyone picking this up without Docker installed can reproduce the same workaround:
  point `DATABASE_URL` at any disposable MySQL 8 schema for local runs. Once Docker
  Desktop is installed, `npm run db:up` is the real, intended path and `.env.test`
  needs no change.
- `docs/qa/phase-00-report.md` records this so a future session doesn't assume the
  test DB CI container was verified in a real container during Phase 0 — it was
  proven against an equivalent standalone MySQL 8 instance instead.
