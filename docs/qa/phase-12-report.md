# Phase 12 QA report: hardening, full QA, and launch prep

Branch: `v2/phase-12-hardening`. Date: 2026-10-29.

> **This phase is not closed.** Its stated "done when" is _"the human
> approves the rehearsal results"_, and the data-migration rehearsal
> needs a production dump only the human can provide. All of the code
> work is complete and verified; the approval gate is open. See
> "What's blocking closure" at the bottom.

## What was done

Per ADR 0023 (a §5.6 survey found most security items already built
across earlier phases — sanitiser, constant-time compares, RBAC,
Turnstile, upload magic-byte sniffing + re-encoding, staff 2FA, session
revoke, admin audit logging, AES-GCM secrets at rest):

1. **Dependency audit — one critical fixed.** `next` 15.5.27 → 15.5.28
   cleared a **critical** advisory in Next itself plus a `postcss`
   high; `npm audit fix` cleared `markdown-it`. Production advisories
   40 → 35, critical 1 → 0. The five remaining `high`s all need major
   upgrades (prisma 7, zod 4, next 16) and are deferred to their own
   migrations — see ADR 0023 for the reasoning and the launch checklist
   for the follow-up.
2. **`npm audit` in CI** (§5.6's explicit ask): a hard gate at
   `--audit-level=critical` on production deps, plus an informational
   full report.
3. **Rate limiting backed by the DB** (§5.6): new `RateLimitHit` table
   and `rateLimitPersistent()`, wired into `guardWrite()` — the single
   call site covering exactly the buckets §5.6 names (login, OTP,
   checkout, contact, newsletter). The old in-memory limiter reset on
   every restart, so a deploy or crash handed an attacker a fresh
   budget. It is kept for the two high-volume telemetry routes, where a
   DB write per page view would cost more than the limit is worth.
4. **CSRF defence-in-depth** (§5.6): `assertSameOrigin` added inside
   `handle()` on the session-authenticated mutations that lacked it —
   password change, profile, address create/delete, product reviews and
   questions, order cancel and return, admin notification marking. The
   baseline was already sound (`sameSite: "lax"` cookies), but Chrome's
   Lax+POST grace window leaves a real narrow gap for a freshly-set
   cookie.
5. **Cross-browser regression** (WebKit, iOS Safari, Firefox) as
   `npm run test:e2e:cross`, in `verify:full`, and as its own CI job.
6. **k6 load test** for listing + checkout
   (`scripts/load/checkout-and-listing.js`) at deliberately modest
   concurrency for this host's ~5-thread ceiling, exercising checkout
   via `/api/v1/cart/quote` so it writes nothing.
7. **`docs/launch-checklist.md`**, with every credential-dependent step
   marked **[human]**.

## Real bugs found and fixed

The cross-browser gate paid for itself on its first run, and the fixes
were all in the _test_ layer rather than the product — which is itself
the finding: four phases of QA notes blamed "test environment
artifacts" for things that were reproducible defects.

1. **Authenticated flows were untestable in WebKit.** `start:test`
   serves a production build over plain http, so the session cookie was
   marked `Secure`; WebKit stores such a cookie but refuses to _send_
   it over an insecure origin (Chromium and Firefox grant localhost an
   exception). Login returned 200, the cookie was stored, and `/admin`
   still bounced to `/login`. Fixed by keying the `Secure` flag off the
   site URL's scheme rather than `NODE_ENV`
   (`src/server/security/cookies.ts`). Never user-facing — production is
   https — but it blinded the suite to the entire admin panel and
   account area in WebKit.
2. **The parity theme test never restored the colour it set**, and a
   random top bar colour is almost never AA-contrast-safe against the
   white text on it. Every `npm run test:a11y` after a parity run failed
   on every page. **This is the actual root cause of the "stale test-DB
   theme colour" artifact written up as an environmental curiosity in
   the Phase 9, 10 and 11 QA reports.** The sibling checkout test
   already restored its state with a comment explaining this exact
   hazard.
3. **`globalSetup` pointed at the wrong database.** It runs in the
   `playwright test` process, which never loaded `.env.test`, so its
   `PrismaClient` used the dev DB. The playwright npm scripts now run
   under `dotenv -e .env.test`, matching `db:migrate:test` and
   `test:integration`.
4. **This phase's own DB-backed limiter made the suites fight.** Parity
   performs exactly 8 admin logins — the login limit — so once limits
   persisted, anything running after it started exhausted. Handled in
   `e2e/global-setup.ts`, which also clears the day's `127.0.0.1` orders
   so the per-IP order-fraud guard can't block a second full-matrix run.

### A note on how two of those were diagnosed

My first two explanations for the WebKit failure were both wrong: a
`router.push()`/`router.refresh()` race (I changed eight call sites
before testing the theory, then reverted all of them, comments
included), and a misread of `context.cookies()` as proving the cookie
was being sent. The cause only became clear from running the same probe
on two engines side by side and comparing. Recorded because the wrong
turns are the useful part — and because a confidently-worded comment
asserting a bug that does not exist would have outlived the mistake.

## Test matrix and results

| Check                                                                  | Result                                                                                                                                                                            |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                                                              | ✅ pass                                                                                                                                                                           |
| Lint                                                                   | ✅ pass                                                                                                                                                                           |
| Unit tests                                                             | ✅ 318/318 pass (38 files)                                                                                                                                                        |
| Integration tests                                                      | ✅ 42/42 pass (11 files; +4 — the DB limiter's allow/reject, restart-survival, window expiry and bucket isolation)                                                                |
| Dependency audit (production deps)                                     | ✅ 0 critical (was 1); 5 known `high`s deferred to major upgrades, catalogued in ADR 0023                                                                                         |
| E2E critical path — Chromium desktop                                   | ✅ pass                                                                                                                                                                           |
| E2E critical path — Chromium mobile (Pixel 7)                          | ✅ pass                                                                                                                                                                           |
| E2E critical path — **WebKit desktop**                                 | ✅ pass (newly possible)                                                                                                                                                          |
| E2E critical path — **iOS Safari (iPhone 14)**                         | ✅ pass (newly possible)                                                                                                                                                          |
| E2E critical path — **Firefox**                                        | ✅ pass (newly possible)                                                                                                                                                          |
| a11y (axe): home/shop/product/login/cart/design-system                 | ✅ 6/6 pass                                                                                                                                                                       |
| Parity (settings/menus/products/theme/checkout/social/system/tracking) | ✅ 8/8 pass                                                                                                                                                                       |
| Visual snapshots                                                       | ✅ 2/2 pass                                                                                                                                                                       |
| Lighthouse                                                             | ✅ performance/a11y/best-practices pass their `error` thresholds on all 4 URLs; `/checkout`'s SEO score stays the documented by-design `warn` (it is deliberately `noindex`)      |
| **Full matrix run twice back to back, no manual intervention**         | ✅ 21 browser tests per round, identical both rounds — the first time in this rebuild that's been true                                                                            |
| k6 load test                                                           | ⚠️ script written and its assumptions verified against the running server (the quote endpoint returns a numeric total); **not executed** — k6 isn't installed in this environment |

## Known limitations

- **k6 not executed here.** The script is a deliverable, not a result.
  Run it against a staging host that resembles production; running it
  against this dev machine would measure the wrong hardware, and
  running it against production would risk real customers.
- **CSP nonces deferred.** The remaining CSP weakness is `script-src
'unsafe-inline'`. Fixing it needs `'strict-dynamic'` because pixels
  are injected at runtime, and whether each pixel survives that is
  unverifiable here — there are no real Meta/GA4/TikTok/Clarity
  credentials in this environment (same blocker as ADRs 0019–0021). ADR
  0023 records the exact steps to do it safely on staging.
- **Five `high` advisories remain** in production dependencies, all
  requiring major upgrades. Catalogued, not forgotten.
- **The order-fraud guard still caps a full matrix at 5 COD orders per
  IP per day.** `global-setup.ts` clears the day's localhost orders so
  repeated local runs work, but adding more order-placing browser
  projects would need that limit revisited.

## What's blocking closure

The **data-migration rehearsal** against a copy of the production
database. It needs:

1. **[human]** a fresh `mysqldump` of production, placed locally;
2. a restore into a scratch schema and `prisma migrate deploy` against
   it;
3. the integrity checks listed in `docs/launch-checklist.md` §1 (order
   and item counts, `SUM(total)`, customer counts, oldest/newest orders
   still resolving their items and payment history, and every
   `Payment.status` mapping cleanly onto Phase 7's 8-state enum);
4. **[human]** approval of the result.

`CLAUDE.md` forbids connecting to the production database, so step 1 has
to come from a person. Everything needed to run steps 2 and 3 the moment
a dump exists is written down.

## Deploy notes

- **New migration**: `20261029010000_rate_limit_hit` (one table).
- **No new env vars.** `NEXT_PUBLIC_SITE_URL` now also controls the
  auth-cookie `Secure` flag, so it must be the real `https://` origin in
  production — it already had to be, for canonical URLs, sitemaps and
  OAuth callbacks.
- **No new cron jobs.**
- **Action needed from the human**: the rehearsal above, then work
  `docs/launch-checklist.md` top to bottom.

## Summary

Phase 12 closed the four §5.6 gaps that were real (DB-backed rate
limiting, CSRF coverage, `npm audit` in CI, and a critical `next`
advisory), added the cross-browser and load-test tooling the plan asks
for, and wrote the launch checklist. The cross-browser gate immediately
found that authenticated flows had never been testable in WebKit, and
pursuing that uncovered three more defects that had been making the
regression suite unreliable since Phase 9 — including the real cause of
the "stale theme colour" artifact three previous QA reports had written
off as environmental.

`npm run verify` green (typecheck, lint, 318/318 unit), 42/42
integration, the full browser matrix green across five device/engine
combinations and **repeatable twice with no manual intervention**,
Lighthouse green on its `error` thresholds.

CSP nonces and three dependency majors stay explicitly deferred with
written reasoning. The phase stays **open** pending the human's
migration rehearsal and approval — the final merge and deploy follow
that, not this report.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
