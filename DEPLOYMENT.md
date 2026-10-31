# Deploying UniBaazar to cPanel

Target: `unibaazar.com`, repo `https://github.com/pitchforgebd/unibaazar.git`,
Node.js app on cPanel (Passenger), MySQL database on the same server.

**As of Phase 1 of the v2 rebuild, there's a real CI/CD pipeline — but
deploying is currently a deliberate manual step, not automatic on merge.**
The plan (`docs/decisions/0007-manual-deploy-trigger.md`) is to build the
whole v2 rebuild first and do one real deploy once everything's ready, not
deploy after every phase. Every push to `main` still runs the full test
suite and builds a release artifact (`ci.yml`) — that part always runs and
keeps `main` provably deployable — but shipping that artifact to the server
only happens when someone runs the `deploy` workflow by hand from the
Actions tab (**Actions → deploy → Run workflow**, enter the commit SHA to
ship). When it does run: GitHub Actions uploads the artifact, backs up the
database, migrates, switches the live release, restarts, and smoke-tests —
then automatically rolls back if the smoke test fails. The server never
builds, never installs dev tooling, and never runs the Prisma CLI — it only
receives a finished artifact and restarts. See
`UNIBAAZAR_V2_MASTER_PLAN.md` §3 for the full design and
`docs/deploy/host-facts.md` / `docs/deploy/github-secrets.md` for the
one-time setup this depends on — **not needed until the first real deploy**.

This replaces the old manual `git pull && npm install && npm run build`
flow entirely. That flow is gone — don't run `npm run build` or
`npx prisma migrate deploy` on the host anymore; see §12 "Troubleshooting"
if you're tempted to.

---

## 0. Before you start

- Confirm `unibaazar.com` already points at this cPanel account.
- Confirm your cPanel plan offers **Node.js Selector / Setup Node.js App**,
  **SSH Access**, and **Terminal**.
- Read `docs/deploy/host-facts.md` — it lists the exact commands to run on
  the host once, to confirm this pipeline will work on your specific setup
  (OpenSSL version, Node version, SSH availability).

---

## 1. Create the MySQL database (one-time, manual)

cPanel → **MySQL® Databases**.

1. Create a database (cPanel prefixes it with your username, e.g.
   `pitchfor_unibaazer_db` — note the exact prefixed name).
2. Create a DB user with a strong generated password
   (`openssl rand -base64 24`) — note the exact prefixed username too.
3. Add that user to that database with **ALL PRIVILEGES**.

---

## 2. Lay out the app directory (one-time, manual)

The automated pipeline expects this structure under `~/unibaazar`:

```
~/unibaazar/
  releases/<git-sha>/   # one folder per deploy, created automatically
  shared/
    .env                # you create this once, by hand — never overwritten by a deploy
    uploads/             # symlinked into every release as public/uploads
    backups/              # mysqldump output, 14 kept automatically
  incoming/              # deploy uploads land here briefly before unpacking
  current/               # real directory, moved into place from releases/<sha> on every deploy
  current.previous/      # transient holding spot, only exists mid-switch
  current.sha            # plain file: which release is currently live
```

`current` is a **real directory**, not a symlink — cPanel's Node.js
Selector resolves a symlinked Application root to its target at
creation time rather than following it on each request, so a symlink
repointed per deploy silently kept serving the first release forever.
Confirmed on the first real deploy, not assumed — see
`docs/decisions/0035-passenger-does-not-follow-the-current-symlink.md`.
Every deploy `mv`s the new release into `current` instead — a rename on
the same filesystem, not a copy, so it costs nothing extra regardless of
how many files are in `node_modules` (neither `rsync` nor `cp -a` are
installed on this host, confirmed directly).

Via Terminal:

```bash
mkdir -p ~/unibaazar/releases ~/unibaazar/shared/uploads ~/unibaazar/shared/backups ~/unibaazar/incoming
```

## 3. Create `shared/.env` (one-time, manual)

```bash
nano ~/unibaazar/shared/.env
```

```bash
DATABASE_URL=mysql://<prefixed-user>:<password>@localhost:3306/<prefixed-db>?connection_limit=3&pool_timeout=20
NEXT_PUBLIC_SITE_URL=https://unibaazar.com
AUTH_SECRET=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 32>
```

`connection_limit=3&pool_timeout=20` matters on this host — see
`UNIBAAZAR_V2_MASTER_PLAN.md` §3.3. Everything else in `.env.example`
(payment gateways, SMS, SMTP, social/pixel IDs) can stay unset — those are
also configurable from Admin → Settings, and features using them simply
no-op until configured.

This file is **never** touched by a deploy — each release's `.env` is a
symlink to it (`shared/.env`), and `mv` moves a symlink as-is (it's a
rename, not a copy, so there's nothing to dereference), so updating a
secret here and restarting is all that's needed to rotate it. It's also
never committed, and never leaves the server.

## 4. Set up GitHub Actions deployment (one-time)

Follow `docs/deploy/host-facts.md` (gathers the facts this needs) and then
`docs/deploy/github-secrets.md` (adds them as GitHub Secrets:
`SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_PORT`, `APP_PATH`,
`HEALTH_CHECK_URL`).

## 5. First deploy (triggers the pipeline for real, for the first time)

Make sure `main` has at least one successful `ci` run (every push to `main`
triggers one automatically). Then: **Actions tab → `deploy` → Run workflow
→** enter that commit's full SHA → **Run workflow**. Watch the `deploy` job.
On success, `~/unibaazar/current` now points at a real release.

## 6. Create the Node.js app in cPanel (one-time, manual — only after step 5)

cPanel → **Setup Node.js App** → **Create Application**.

| Field                    | Value               |
| ------------------------ | ------------------- |
| Node.js version          | 20.x                |
| Application mode         | Production          |
| Application root         | `unibaazar/current` |
| Application URL          | `unibaazar.com`     |
| Application startup file | `server.js`         |

Click **Create**, then **Restart**, then check
`https://unibaazar.com/api/health`. `current` is a real directory
(`scripts/deploy/deploy-release.sh` `mv`s each release into it), so
this Application root never needs touching again after this one-time
setup — no further cPanel UI steps for any future deploy.

**If `current` was ever created as a symlink on this account** (true
for the first deploy here, before `docs/decisions/0035-passenger-does-not-follow-the-current-symlink.md`
landed): cPanel silently resolved it to that first release's literal
path at save time instead of following it, so every later deploy kept
serving that same first release no matter what. The fix is one-time:
after a deploy has run with the mv-based script (which converts
`current` from a symlink to a real directory automatically), open this
app in cPanel, re-enter `unibaazar/current` as the Application root,
and **Save**.

**If that Edit/Save instead fails with "No such application or it's
broken. Unable to find app venv folder by this path: ..."**: the
app's `~/nodevenv/.../<old-path>` venv is gone even though cPanel's
config still references it, and this host's cPanel install has no
stock `Cpanel::API::NodejsApp` module — Node apps here are actually
managed by CloudLinux's `cloudlinux-selector` CLI, which hits the same
error on `set --new-app-root` (a rename also needs the old venv to
exist). See `docs/decisions/0036-nodejs-selector-registry-recovered-via-cli.md`
for the full diagnosis. Recovery, via SSH/Terminal:

```bash
# 1. Remove the broken registry entry (works even with the venv gone —
#    destroy doesn't need to activate it, only set/rename does).
/usr/sbin/cloudlinux-selector destroy --json --interpreter nodejs \
  --domain unibaazar.com --app-root unibaazar/<the broken literal path>

# 2. Create a fresh app straight at the real target — same field
#    values as the table above.
/usr/sbin/cloudlinux-selector create --json --interpreter nodejs \
  --domain unibaazar.com --app-root unibaazar/current --app-uri / \
  --version 20 --app-mode production --startup-file server.js

/usr/sbin/cloudlinux-selector restart --json --interpreter nodejs \
  --domain unibaazar.com --app-root unibaazar/current
```

Then check `https://unibaazar.com/api/health` — with `current` now a
real directory, there's nothing left for cPanel to resolve away, so
this is a one-time recovery, not a recurring step.

## 7. SSL

cPanel → **SSL/TLS Status** → run **AutoSSL** for `unibaazar.com` if not
already issued.

---

## Normal deploys (after first-time setup)

1. Merging a PR to `main` runs `ci` automatically: the full verify suite
   (typecheck, lint, unit, integration, E2E desktop + mobile, accessibility,
   Lighthouse) and builds a release artifact. **This alone does not touch
   the server** — see `docs/decisions/0007-manual-deploy-trigger.md` for why
   deploys are currently manual.
2. When you're actually ready to ship: **Actions tab → `deploy` → Run
   workflow →** enter the commit SHA to deploy → **Run workflow**. It
   uploads the artifact, backs up the database, applies any new migrations,
   syncs the release into `current`, restarts, and smoke-tests `/api/health`.
3. If the smoke test fails, it automatically syncs the previous release
   back into `current` and restarts — the bad deploy never stays live.

Watch progress in the repo's **Actions** tab either way.

## Rollback

Automatic on a failed smoke test (above). To roll back manually to any
earlier release:

```bash
cd ~/unibaazar
ls releases/              # pick a SHA
./releases/<any-sha>/scripts/deploy/rollback.sh <sha-to-roll-back-to>
```

## Cron jobs

cPanel → **Cron Jobs**. Replace `YOUR_CRON_SECRET` with the real
`CRON_SECRET` from `shared/.env`:

```bash
# Cancel unpaid non-COD orders stuck in PENDING for over 24h — hourly
0 * * * * curl -fsS -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" "https://unibaazar.com/api/v1/cron/cancel-unpaid-orders"

# Catch any variant that drifted below its low-stock threshold — every 30 min
*/30 * * * * curl -fsS -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" "https://unibaazar.com/api/v1/cron/low-stock-sweep"

# Sweep every payment for an amount/refund mismatch and alert if any are found — daily at 3am
0 3 * * * curl -fsS -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" "https://unibaazar.com/api/v1/cron/payment-reconciliation"

# Email a reminder for carts quiet 2h-7d with an address on file — daily at 10am
0 10 * * * curl -fsS -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" "https://unibaazar.com/api/v1/cron/abandoned-cart"

# Retry any failed Meta/TikTok Conversions API send, capped at 5 attempts — daily at 4am
0 4 * * * curl -fsS -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" "https://unibaazar.com/api/v1/cron/retry-conversions"

# Daily database backup at 2am (also runs automatically before every deploy)
0 2 * * * cd ~/unibaazar/current && BACKUP_DIR=~/unibaazar/shared/backups bash scripts/deploy/backup-db.sh
```

This list grows as later phases add more scheduled routes (stock-reservation
release, abandoned-cart reminders, courier sync, sitemap/feed regeneration,
analytics rollups — see `UNIBAAZAR_V2_MASTER_PLAN.md` §3.5). This file gets
updated each time one lands.

These use an `Authorization: Bearer` header rather than a `?secret=` query
parameter — a secret in a query string ends up in access logs. The endpoint
still accepts the old `?secret=` form too (`src/server/cron/auth.ts`), so
existing cron lines keep working, but prefer the header form for anything
you add or edit from here on.

## Submitting the sitemap to search engines (Phase 11)

`/sitemap.xml` is a sitemap _index_ — it lists every per-type sitemap
(products, categories, brands, pages, blog, videos, product/category
images) and is the only URL that needs submitting anywhere:

- **Google Search Console** → Sitemaps → add `https://unibaazar.com/sitemap.xml`.
- **Bing Webmaster Tools** → Sitemaps → same URL.

Deliberately not implemented: the deprecated `ResultOfSitemapPing`-style
`https://www.google.com/ping?sitemap=...` endpoint — Google retired it,
and Search Console re-crawls a submitted sitemap on its own schedule
(plus immediately after a `fetch` from inside Search Console itself).
Re-submitting after a bulk content change isn't necessary; Search
Console already notices via the sitemap's own `lastmod` dates.

---

## First login and smoke test (after the very first deploy)

Visit `https://unibaazar.com`.

Admin login: phone `01700000000`, password set by `prisma/seed.ts` (check
that file locally — **never commit the real value**, and change it
immediately after first login via Users → your account → change password).

Walk through: homepage loads and images render, add a product to cart, place
one real test order end to end, `/admin` shows the test order, Settings →
General has the real logo/favicon.

---

## Troubleshooting

| Symptom                                                                               | Likely cause                                                                                                                          |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `deploy` job fails at "Ensure the release/shared directories exist"                   | SSH secrets are wrong, or `shared/.env` hasn't been created yet (§3)                                                                  |
| Prisma engine fails to load (`Error loading shared library`)                          | `binaryTargets` in `prisma/schema.prisma` doesn't match the host's OpenSSL — see `docs/deploy/host-facts.md` §1                       |
| Smoke test times out, auto-rollback fires                                             | App didn't come up in 60s after restart, or `/api/health` isn't reachable at `HEALTH_CHECK_URL` — check the Node app's logs in cPanel |
| `/api/health` returns `db: "fail"`                                                    | `shared/.env`'s `DATABASE_URL` is wrong, or the DB is unreachable                                                                     |
| Blank/500 page right after a deploy                                                   | Give it 10–20s — Passenger is still booting the new process                                                                           |
| Uploaded product/banner images missing after a fresh server setup                     | Expected on the very first deploy — `shared/uploads/` starts empty and persists across every deploy after that                        |
| I manually ran `npm install`/`npm run build` on the server and now something's broken | Don't — the server never builds (§12 intro). Re-deploy from `main` to get back to a known-good artifact, or roll back (above)         |
| Logs                                                                                  | cPanel → Setup Node.js App → the app → log file path shown on that page                                                               |
