# 0027 — Fix a table-name case mismatch that CI had been hitting on every run

Date: 2026-10-30
Status: accepted

## Context

While readying the first real deploy, the user checked GitHub's Actions
tab for the first time this phase and found every single `ci` run —
across the whole history of the repo, every phase — had failed. This
had gone unnoticed because this project's own verification has always
relied on `npm run verify` / `npm run verify:full` run **locally on
Windows**, never on reading the actual GitHub Actions logs.

The `verify` job's `db:migrate:test` step failed with:

```
Error: P3018
Database error code: 1146
Database error:
Table 'unibaazar_test.flashsaleitem' doesn't exist
Migration name: 20261022081836_add_stock_reservation_and_flash_sold_count
```

The cause: `prisma/migrations/20261005180544_init/migration.sql` creates
the table as `` `FlashSaleItem` `` (matching the Prisma model's
PascalCase name), and
`prisma/migrations/20261005203830_marketing/migration.sql` correctly
references it in that same case. But
`20261022081836_add_stock_reservation_and_flash_sold_count/migration.sql`
references it as lowercase `` `flashsaleitem` ``.

MySQL's `lower_case_table_names` setting decides whether that matters:

- **Windows** (this machine, via Laragon) defaults to `1` —
  case-insensitive, storing and comparing table names in lowercase.
  `FlashSaleItem` and `flashsaleitem` resolve to the same table, so the
  migration applied without error, every time, locally.
- **Linux** (GitHub's `ubuntu-latest` runners, and the production host —
  CloudLinux 9, confirmed in
  `docs/decisions/0026-prisma-binary-target-rhel.md`) defaults to `0` —
  case-sensitive. `flashsaleitem` is a genuinely different name from
  `FlashSaleItem`, so the `ALTER TABLE` target doesn't exist and the
  migration fails outright.

Every `ci` run has hit this since the migration was added (around Phase
3, per its filename date and the `StockReservation` content matching
that phase's QA report). It would have hit the **first real deploy**
identically — `apply-migrations.sh` runs the same SQL files, on the same
Linux-family host.

## Decision

Fix the casing in place in the existing migration file, rather than
adding a new migration to correct it.

Migrations are meant to be immutable once applied — but this one has
**never successfully applied anywhere that matters**: CI's database is
a fresh container every run and has always failed on this exact step,
and production's database is empty (per
`docs/decisions/0025-migration-rehearsal-waived-fresh-install-instead.md`,
confirmed via `SHOW TABLES` returning no rows just before this fix). The
only place it "succeeded" is disposable local Windows dev/test
databases, which aren't a reason to preserve a broken migration file and
layer a second migration on top of it.

Also audited every other migration for the same class of bug —
`scripts/audit-migration-casing.sh` (kept in the repo for next time a
migration is hand-written) cross-references every `CREATE TABLE`'s exact
casing against every later `ALTER TABLE` / `REFERENCES` / `DROP TABLE` /
`RENAME TABLE` / `TRUNCATE TABLE` reference to the same table, case
insensitively. This was the only instance across all 19 migrations.

## Consequences

- `npm run db:migrate:test` now applies all 19 migrations cleanly from
  an empty schema, verified locally by dropping every table and
  re-running the full chain. **This does not prove the Linux-specific
  case-sensitivity behavior** — Windows would "pass" this regardless of
  whether the casing is right, since it doesn't enforce it. The real
  confirmation is the next `ci` run actually going green on GitHub.
- This was found only because the user happened to open the Actions tab
  and share what they saw. Reading actual CI logs — not just trusting a
  green local `verify:full` — should have caught this far earlier; see
  the memory note this session records about it.
- `scripts/audit-migration-casing.sh` is a manual check, not wired into
  `verify`/`verify:full` or CI — it's a one-off audit tool for the next
  time someone hand-writes a migration's SQL, not an automated gate.
