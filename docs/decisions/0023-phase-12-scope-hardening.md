# 0023: Phase 12 scope — hardening, full QA, and launch prep

## Context

Phase 12 is the last phase: a security pass against §5.6, a dependency
audit, a k6 load test of checkout and listing, a full cross-browser
regression, a production data-migration rehearsal, and a launch
checklist. Its stated "done when" is **"the human approves the rehearsal
results"** — so unlike every earlier phase, this one cannot be finished
autonomously by design.

A §5.6 survey found most of it already built across earlier phases:
the sanitiser, constant-time compares, RBAC guards, Turnstile, upload
magic-byte sniffing plus `sharp` re-encoding, staff 2FA, the session
list/revoke screens, audit logging on admin writes, and AES-GCM
secrets-at-rest. Four items were genuinely missing or weaker than §5.6
asks.

## What was done

### 1. Dependency audit — one critical fixed

`npm audit --omit=dev` reported 40 vulnerabilities including **1
critical** in `next` itself. `next` 15.5.27 → **15.5.28** (a patch)
cleared the critical plus a `postcss` high; `npm audit fix` (non-breaking
only) cleared `markdown-it`. Production advisories went 40 → 35, critical
1 → 0.

The five remaining `high`s all require **major** upgrades:

| Package                                    | Fix requires | Why deferred                                                                      |
| ------------------------------------------ | ------------ | --------------------------------------------------------------------------------- |
| `prisma`, `@prisma/config`, `deepmerge-ts` | `prisma@7`   | ORM major across ~40 models and every query in the app                            |
| `zod`                                      | `zod@4`      | Validation major across every schema in `src/lib/validation/` and every API route |
| `postcss` (via next)                       | `next@16`    | Framework major                                                                   |

Each is its own migration with its own full regression, not something to
bundle into a launch phase — on a live store, a silent validation or
query-behaviour change is worse than a known, catalogued advisory. They
are listed in the launch checklist as scheduled follow-up work.

### 2. `npm audit` in CI (§5.6's explicit ask) — added

Two steps in `ci.yml`: a **hard gate** at `--audit-level=critical` on
production dependencies, and an informational full report. The gate is
`critical`, not `high`, precisely because of the three deferred majors
above — a `high` gate would make CI permanently red, which trains people
to ignore it. A _new_ critical still fails the build.

### 3. Rate limiting backed by the DB (§5.6's explicit ask) — added

`src/server/security/rate-limit.ts` was an in-memory `Map`, so every
limit reset on every server restart — a deploy, a crash, or just
restarting the process handed an attacker a fresh budget. This session's
own QA proved it repeatedly: restarting the test server was the standard
way to clear a tripped login limit.

New `RateLimitHit` table + `rateLimitPersistent()`, wired into
`guardWrite()` — which is the single call site covering exactly the
buckets §5.6 names (login, OTP, checkout, contact, newsletter). Expired
rows for a bucket are pruned on the way through, so the table
self-maintains without its own cron.

The in-memory limiter is **kept** for the two high-volume, non-security
telemetry routes (`/api/v1/tracking`, `/api/v1/seo/miss`): those fire on
every page view, and a DB write per page view costs this host more than
the limit is worth. §5.6 names only the four security buckets, so this
matches the plan rather than over-applying it.

### 4. CSRF defence-in-depth (§5.6's explicit ask) — tightened

The real posture was already sound: session cookies are
`sameSite: "lax"`, so browsers don't send them on cross-site POSTs, and
13 routes additionally called `assertSameOrigin`. But the coverage was
inconsistent — the session-authenticated mutations that matter most
(password change, profile update, address create/delete) relied on the
cookie policy alone. That leaves a narrow but real gap: Chrome's
"Lax+POST" grace period still sends a _newly set_ cookie on a top-level
cross-site POST for about two minutes.

`assertSameOrigin` is now called inside `handle()` (so it returns a 403,
not a 500) on: account password, profile, address create and delete,
product reviews and questions, order cancel and return, and admin
notification marking.

Deliberately **not** added to `auth/logout` and `auth/refresh` (nothing
an attacker gains by forcing either, and both take no `request`
argument today), nor to `cart/quote` and `orders/track` (read-only
computations that write nothing), nor to the payment/courier webhooks
(signature-verified) or `cron/*` (secret-gated).

### 5. Cross-browser regression — added, and it immediately paid for itself

`playwright.config.ts` gained `webkit`, `mobile-safari` (iPhone 14) and
`firefox` projects, plus `npm run test:e2e:cross`, a slot in
`verify:full`, and a separate `cross-browser` CI job. They're a separate
script rather than part of `test:e2e` so the common path still runs one
engine and only the release gate pays for three.

The first WebKit run failed, and chasing it down produced the three
findings below. Worth recording how it went wrong, because the first two
diagnoses were mine and both were wrong:

1. **Wrong guess #1: "`router.push()` then `router.refresh()` races in
   WebKit."** Plausible, and I changed eight call sites before testing
   it. Reverted in full once measurement disproved it — including the
   explanatory comments, which would have left a confidently-stated
   falsehood in the codebase for the next reader.
2. **Wrong guess #2: "WebKit won't store a `Secure` cookie over http."**
   `context.cookies()` showed the cookie present, which looked like a
   refutation.
3. **Actual cause**, found by comparing engines directly: WebKit _does_
   store it and _refuses to send it_ over an insecure origin. Chromium
   and Firefox grant `http://127.0.0.1` a secure-context exception;
   WebKit does not. `npm run start:test` serves a production build over
   plain http, so `secure: process.env.NODE_ENV === "production"` marked
   the session cookie `Secure` and WebKit dropped it from every request —
   login returned 200, the cookie was stored, and `/admin` still
   redirected to `/login`.

Fixed in `src/server/security/cookies.ts`: the `Secure` flag now follows
the configured site URL's **scheme** rather than `NODE_ENV`. Real
production (`https://unibaazar.com`) keeps it; a production build served
over http for local or CI testing doesn't, so WebKit can authenticate.
An unset or malformed value defaults to `true` — the safe direction.

This was never a user-facing bug (production is https, so Safari was
always fine). It was a hole in what the test suite _could_ cover:
authenticated flows were untestable in WebKit, which is most of the
admin panel and the whole account area.

### 5b. Making the regression suite actually repeatable

Running the full matrix twice in a row surfaced three ways the suites
sabotaged each other. All three had been silently costing time since
Phase 9 — every phase's QA notes include some variant of "cleared the
test DB and re-ran".

- **The DB-backed limiter made it worse before it made it better.** Once
  limits persisted, the parity suite's 8 admin logins — exactly the
  login limit — meant any suite running after it started already
  exhausted. `e2e/global-setup.ts` now clears `RateLimitHit` before each
  Playwright run. The limiter keeps its own direct coverage in
  `rate-limit-db.integration.test.ts`, so nothing is left untested.
- **`globalSetup` was clearing the wrong database.** It runs in the
  `playwright test` process, which never loaded `.env.test`, so its
  `PrismaClient` pointed at the _dev_ database. The six playwright npm
  scripts now run under `dotenv -e .env.test`, matching how
  `db:migrate:test` and `test:integration` already worked.
- **The parity theme test never restored the colour it set.** It writes a
  random top bar colour, which is almost never AA-contrast-safe against
  the white text `TopBar.tsx` renders on it — so every later
  `npm run test:a11y` failed on every page. The sibling checkout test
  already restored COD with a comment explaining exactly this hazard;
  the theme test just hadn't. **This is the root cause of the
  "stale test-DB theme colour" artifact written up as an environmental
  curiosity in the Phase 9, 10 and 11 QA reports** — it was a test
  defect the whole time.

The matrix now runs clean twice consecutively with no manual
intervention (21 browser tests per round), which is what a release gate
has to do to mean anything.

### 6. k6 load test — written

`scripts/load/checkout-and-listing.js` covers the two paths the plan
names, at **deliberately modest concurrency** (ramp to 15 VUs): the
production host is cPanel + CloudLinux with roughly a 5-OS-thread
ceiling (ARCHITECTURE.md §12), so a few hundred VUs would only measure
the hosting plan's limiter, and on a live site risks taking the store
down for real customers. Thresholds mirror §5.7's budgets as server-side
latency.

It exercises checkout through `/api/v1/cart/quote` rather than placing
orders — the same pricing/stock/coupon logic, without writing rows,
tripping the per-IP fraud guard, or consuming real stock.

k6 itself is not installed in this environment, so the script is
delivered as a runnable artifact (for the human, or a CI job) rather
than a recorded result.

### 7. `docs/launch-checklist.md` — written

Everything the plan asks for, with the items that need real credentials
or a human judgement call marked **[human]**.

## Explicitly deferred

### CSP with nonces (§5.6) — deferred, with specifics

The current CSP is already strong (`default-src 'self'`, `object-src
'none'`, `frame-ancestors 'none'`, `base-uri 'self'`, explicit
allowlists). Its one real weakness is `script-src 'unsafe-inline'`.

Fixing that properly means nonces plus `'strict-dynamic'`, because the
storefront injects third-party pixels at runtime via
`StorePixels.tsx`'s `addScript()` — dynamically inserted scripts don't
inherit a nonce, so without `'strict-dynamic'` every pixel silently
stops loading.

**That is exactly the surface this environment cannot verify**: there
are no real Meta/GA4/GTM/TikTok/Clarity/Hotjar/Pinterest/Snap
credentials here (deferred for the same reason in ADRs 0019–0021), so
there is no way to confirm each pixel still loads under
`'strict-dynamic'` before shipping. The failure mode on a live store is
either "all analytics silently stop" or, if the nonce plumbing is wrong,
a white screen. Shipping an unverifiable CSP tightening to a live
storefront is a worse trade than a catalogued, well-understood
`'unsafe-inline'`.

To do it safely later: configure real pixel IDs on a staging host, move
the CSP from `next.config.ts`'s static `headers()` into the (already
Node.js-runtime) middleware so a per-request nonce can be generated,
forward it as both a request and response header so Next.js nonces its
own bootstrap scripts, add `'strict-dynamic'`, then confirm each pixel
still loads and that admin — which the middleware matcher excludes —
keeps a CSP of its own.

### The data-migration rehearsal — blocked on the human

The rehearsal needs a production dump, which only the human can
provide, and `CLAUDE.md` forbids touching the production database. The
procedure and the exact integrity checks are written up as the first
section of the launch checklist. This is the phase's "done when", so
**Phase 12 cannot be closed without it** — the code work is complete and
verified, the approval gate is not.

## Consequences

- `guardWrite()` is now async-await on a DB round trip. It was already
  `async`, and every caller already awaited it, so no call site changed —
  but login/checkout now do one extra indexed query plus one insert.
  Acceptable: these are low-volume, security-critical paths, and the
  alternative was a limiter that forgets everything on restart.
- `RateLimitHit` grows with traffic between prunes. Pruning is per-bucket
  and happens on access, so a bucket nobody touches again keeps a few
  stale rows indefinitely — harmless at this scale, and cheaper than a
  cron job for it. Revisit if the table ever gets large.
- CI now has a second required job (`cross-browser`) that installs two
  more browser engines, so pipeline time goes up for everything merging
  to `main`. `verify:full` also runs `test:e2e:cross` now, so a local
  full-regression pass is slower than it was.
- `e2e/global-setup.ts` deletes rows (rate-limit counters, and today's
  `127.0.0.1` orders) before every Playwright run. That is safe against
  a disposable test database and unsafe against anything else — the
  playwright scripts load `.env.test` explicitly, so it can only ever
  reach the test DB, but anyone repointing `.env.test` at something they
  care about should know this runs.
- Auth cookies lose the `Secure` flag whenever `NEXT_PUBLIC_SITE_URL` is
  an `http://` URL. That is the intended behaviour for local and CI
  testing, and it means a production deploy that misconfigures that
  variable to `http://` would also drop `Secure`. The variable is
  already required to be the real https origin for canonical URLs,
  sitemaps and OAuth callbacks, so it being wrong would break far more
  visible things first.
