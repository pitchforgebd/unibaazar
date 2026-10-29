# Phase 14 QA report: deploy readiness

Branch: `v2/phase-12-hardening` (continues the chain). Date: 2026-10-30.

See `docs/post-launch-plan.md` for how Phases 13–18 are laid out, and
`docs/decisions/0025-migration-rehearsal-waived-fresh-install-instead.md`
for why this phase is not the migration rehearsal it was planned as.

## What this phase was supposed to be, and what changed

The master plan closes Phase 12 with a data-migration rehearsal: dump
production, restore it into a scratch schema, migrate it, and prove
nothing was lost. Two facts from the human removed its purpose:

1. the production database holds **only demo/test data** — no real
   orders, no real payment history, no PII;
2. v1 is being **deleted and replaced**, not upgraded.

The rehearsal answers "will migrating the real data lose any of it?".
With no real data and no upgrade, that question has no content.
Restoring demo rows and counting them afterwards produces a green report
that proves nothing about launch.

So the rehearsal was waived (ADR 0025) and replaced with verifying the
path that _will_ run: a first deploy onto an empty database. That
mattered more than it sounds, because **the CI/CD pipeline had never
executed end to end** — deploys have been manual and deferred since ADR
0007, so no part of `ci.yml` → `deploy.yml` → `deploy-release.sh` had
ever actually happened.

## What was found

Three defects, all of them first-deploy-only, none reachable without
exercising the pipeline, and none that a restored dump would have caught.

### 1. The release artifact omitted `scripts/` — the first deploy would have died on its first command

`deploy.yml`'s final step is:

```
bash "$APP_PATH/releases/$SHA/scripts/deploy/deploy-release.sh"
```

and `deploy-release.sh` in turn runs `scripts/deploy/backup-db.mjs` and
`scripts/deploy/apply-migrations.sh`. The tar list in `ci.yml` never
included `scripts`, so all three were absent from the release. The very
first real deploy would have failed immediately, after the artifact had
already been uploaded and unpacked on the host.

`scripts/bootstrap-admin.cjs` was missing for the same reason, and it is
the only way to create the first admin user on a fresh database — so
even a hand-fixed deploy would have produced a site nobody could log
into.

### 2. `--exclude` was positional, so 710MB of webpack cache shipped in every release

The flag sat _after_ the path list:

```
tar -czf artifact/release.tar.gz .next public ... release-info.json --exclude='.next/cache'
```

GNU tar treats `--exclude` positionally — it applies only to paths that
follow it — so it matched nothing. Locally that invocation also prints
"the following options were used after any non-option arguments" and
exits non-zero, so depending on the runner's tar version the packaging
step either shipped the cache or failed the job outright. Both are bad
and the fix is the same: move the flag ahead of the paths.

Measured: `.next/cache` is **710MB**. Artifact after the fix: **7.5MB**,
tar exit 0.

This one dates from the original CI/CD commit (`852465b`), so it has
been there since Phase 1.

### 3. `apply-migrations.sh` could not parse a DB password containing symbols

The parser split credentials on the **first** `@` and never decoded
percent-escapes. A fresh install means a newly generated cPanel DB
password, which contains symbols. Both ways of writing one broke it:

| `DATABASE_URL` password                    | parsed as                | result                |
| ------------------------------------------ | ------------------------ | --------------------- |
| `Pa@ss123` (raw `@`)                       | host = `ss123@localhost` | could not connect     |
| `Pa%40ss123` (encoded, as Prisma requires) | `MYSQL_PWD=Pa%40ss123`   | authentication failed |

Both abort before any migration runs, so neither could corrupt
anything — but both abort the _first deploy to a fresh host_, which is
the only time this script path matters.

Fixed by splitting on the last `@` and decoding percent-escapes.

One detail is worth recording, because it cost a wrong first attempt:
the backslash for the decode has to come from a variable rather than
being written inline. Bash 4 and 5 disagree about how the replacement in
`${var//%/\\x}` is quoted, and on this machine the backslash was
silently dropped — every escape decoded to a literal `x`, turning
`Pa%40ss` into `Pax40ss`. Taking the backslash from a variable means the
same thing in both. Written inline it would have "worked" on the runner
and failed on the host, or the reverse.

## Test matrix and results

| Check                                           | Result                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| Typecheck                                       | ✅ pass                                                             |
| Lint                                            | ✅ pass                                                             |
| Unit tests                                      | ✅ 325/325 (38 files)                                               |
| Integration tests                               | ✅ 42/42 (11 files)                                                 |
| `build:test`                                    | ✅ pass                                                             |
| E2E critical path — Chromium desktop + mobile   | ✅ 1/1 each                                                         |
| E2E critical path — WebKit, iOS Safari, Firefox | ✅ 3/3                                                              |
| a11y (axe)                                      | ✅ 6/6                                                              |
| Lighthouse CI (4 URLs)                          | ✅ pass, with the documented `/checkout` SEO warning                |
| Parity                                          | ⚠️ 6/8 — two test defects found and fixed, **re-run not completed** |

No application code changed this phase, so the suites above are
unchanged from Phase 13 in substance. Two things are worth recording
anyway, because both cost real time and one is a genuine defect that had
been hiding.

### The e2e failure that wasn't

The first `verify:full` run failed the critical-path test with a strict
mode violation — `getByRole('button', { name: 'Add to cart' })` resolving
to two elements. Both the main buy box's button and `StickyBuyBar`'s
were in the accessibility tree, which cannot happen on a desktop
viewport: that bar is `md:hidden` plus `invisible` and `inert`. The page
snapshot also contained `navigation "Mobile"`, which is likewise
mobile-only. Two mobile-only elements visible at desktop width meant the
responsive CSS had not applied at all.

Cause: `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`,
and a `node server.js` from two hours earlier was still holding port
3100 — an orphan, because stopping the npm wrapper had left its child
alive. Playwright reused that server, whose in-memory build manifest
pointed at the `.next` that `build:test` had just replaced underneath it,
so assets 404'd and the page rendered unstyled. Killing the orphan and
re-running gave 1/1. Nothing was wrong with the test or the code.

`reuseExistingServer: !CI` is itself the trap — locally it will silently
test the wrong build whenever a stale server is up. CI is unaffected.
Noted for Phase 17.

### Two real parity defects, found by looking at the database

The parity suite then failed 2/8, and these were **not** environmental.
Both assertions used `getByText("saved", { exact: false })`:

- **social parity** — strict mode violation. That locator also matches
  the page's own intro copy, which ends "…keep the saved value". So when
  the status message rendered there were two matches and it failed; and
  when the status had not rendered yet, it matched the intro and
  **passed without the save having happened**. This assertion has
  therefore been verifying nothing, which means one of the "8/8 parity"
  lines in the Phase 9, 10, 11 and 13 reports was hollow.
- **settings parity** — the status never appeared inside the 10s budget;
  the snapshot still showed `status: Saving…`. These are real server
  actions that revalidate storefront tags, and four Playwright workers
  were competing.

Neither was a product bug, and the evidence is the test database rather
than a judgement call — after the failing run it held
`general.name = "UniBaazar Parity 1793303524204"` and
`social.facebook = "https://facebook.com/parity-1793303560754"`, the
exact values the two failing tests had submitted. Both saves had
succeeded.

Fixed by replacing all nine copies of that assertion with one
`expectSaved()` helper scoped to `role="status"` and filtered on
`/saved/i`, with a 20s budget. Scoping excludes body copy; the filter
excludes the submit button's own "Saving…" spinner label.

### Why the parity re-run is not in the table

The re-run could not be completed here. After the fix, `build:test`
began failing in "Collecting page data" with a different missing webpack
chunk each time (`./chunks/vendor-chunks/next.js`, then
`../../../../../webpack-runtime.js`). Wiping `.next` did not help, which
ruled out the stale-cache explanation this repo has hit before.

The cause is a `npm run dev` process started at 02:07 that this session
did not start: `next dev` and `next build` write the same `.next`
directory, so the build's page-data pass kept reading files the dev
server had replaced. The 01:43 build, before that process existed,
succeeded. Stopping someone else's dev server is not this session's call
to make, and the two alternatives were both worse — overriding `distDir`
means changing committed production config for a local convenience, and
pointing `E2E_BASE_URL` at the running dev server would have let the
parity tests write settings into the **dev** database.

So: the fix is committed and is typechecked and lint-clean, and the
reasoning behind it is written into the helper. It has not been observed
passing. **Phase 15 must run `npm run test:parity` with no `next dev`
running, and confirm 8/8, before the merge.** The two defects it fixes
were both diagnosed from recorded evidence, not inferred.

### Environment notes

- Disk on `C:` is at **95% (15GB free)**. Not implicated in any failure
  above, but `.next/cache` alone is 710MB and repeated production builds
  are not cheap.
- `npm run test:visual` is not part of `verify:full` and was not run.

### Deploy-path verification

The unit suite covers none of this — it is shell and YAML. Verified
directly:

| Probe                                                                   | Result                                               |
| ----------------------------------------------------------------------- | ---------------------------------------------------- |
| Build the artifact with the fixed tar command                           | exit **0** (was: warning + failure status)           |
| `.next/cache` entries in the artifact                                   | **0** (was: the full 710MB tree)                     |
| `scripts/` entries in the artifact                                      | all 5 deploy scripts + `bootstrap-admin.cjs` present |
| Artifact size                                                           | **7.5MB** (was ~718MB)                               |
| `bash -n` on every `scripts/deploy/*.sh`                                | 4/4 pass                                             |
| `node --check` on `backup-db.mjs`, `bootstrap-admin.cjs`, the k6 script | 3/3 pass                                             |
| `DATABASE_URL` parser — plain alphanumeric password                     | correct                                              |
| `DATABASE_URL` parser — raw `@` in password                             | correct (was: broken hostname)                       |
| `DATABASE_URL` parser — percent-encoded `@`                             | correct (was: literal `%40` used as the password)    |
| `DATABASE_URL` parser — mixed `%23`/`%25`/`%3A` plus a query string     | correct, including `%25` → `%`                       |
| `DATABASE_URL` parser — no explicit port                                | correct, defaults to 3306                            |

## Known limitations

- **The shell parsing has no automated test.** The repo has no harness
  for shell scripts, and adding one for a single parser is not worth a
  new tool in the toolchain immediately before a launch. It was verified
  behaviourally across the five password shapes above, and the reasoning
  lives in the script's own comments. Recorded as debt in Phase 18.
- **The parity fix has not been observed passing**, because a `next dev`
  process outside this session's control was corrupting every production
  build. Phase 15 must run `npm run test:parity` cleanly and confirm 8/8
  before the merge. Details above.
- **The deploy itself still has not run.** This phase proves the
  artifact contains what the deploy invokes, and that those scripts are
  syntactically sound and parse their input correctly. It cannot prove
  the deploy succeeds — that needs the host, and it is Phase 15. Expect
  to find something there; this phase found three things in a pipeline
  that looked finished.
- **Whether the old pipeline shipped a ~718MB artifact or failed the job
  outright is unknown.** It depends on the GitHub runner's tar version,
  and the Actions logs were not consulted (`gh` is not installed here).
  It does not change the fix.
- **`shared/uploads` is the genuinely unprotected asset.** Product
  images uploaded through the admin exist only on the host — not in git,
  not in the release. Deleting the old install deletes them. That is now
  the first line of `docs/launch-checklist.md` §1, but it is a step a
  human has to actually perform.
- **Phase 12's gate closes on ADR 0025 rather than an approved
  rehearsal.** A deliberate deviation from the master plan, written down
  so the plan and the code don't silently disagree. It is void if the
  "demo data only" premise is.

## Deploy notes

- **No new migration.** No application code changed in this phase — the
  diff is one CI workflow, one shell script, `.gitignore`, and docs.
- **No new env vars, no new cron jobs.**
- **`ci.yml` must run once on `main` before Phase 15's deploy**, because
  `deploy.yml` only ships an artifact from a successful `ci` run for the
  SHA being deployed — and the corrected artifact is the entire point.
- **Work `docs/launch-checklist.md` §1 in order before triggering the
  deploy.** The uploads copy, the pre-wipe dump and the empty schema all
  have to exist first; the schema in particular, because the deploy
  backs up the database before migrating, and `mysqldump` against a
  schema that does not exist aborts the run.

## Summary

Phase 14 was planned as a rehearsal of a migration that is not going to
happen, and it would have passed while telling us nothing. Pointed at
the path that is actually going to happen instead, it found that the
release artifact did not contain the scripts the deploy runs, that every
release carried 710MB of dead cache, and that a cPanel-generated
database password would have broken the migration step. The first real
deploy would have failed at its first command.

That is the cost of deferring deploys for fourteen phases, and it is the
argument for Phase 15 being a real deploy rather than more preparation.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
