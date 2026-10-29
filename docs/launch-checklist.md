# UniBaazar v2 launch checklist

Written in Phase 12; §1 rewritten in Phase 14 once it was settled that
v1 is being replaced rather than upgraded. Work top to bottom on launch
day. Anything marked **[human]** needs a person with credentials or a
judgement call — the codebase can't do it and shouldn't pretend to.

Related: `DEPLOYMENT.md` (how a deploy actually runs),
`docs/qa/phase-12-report.md` and `docs/qa/phase-14-report.md` (what was
verified and how), `docs/decisions/0023-phase-12-scope-hardening.md`
(what was deliberately left out, and why),
`docs/decisions/0025-migration-rehearsal-waived-fresh-install-instead.md`
(why there is no rehearsal, and the three first-deploy bugs found in its
place).

---

## 1. Before the deploy

### Fresh install onto an empty database **[human]**

v1 is being **replaced, not upgraded**: the old deployment is deleted and
v2 installed clean. The master plan's data-migration rehearsal is
therefore waived — the production database holds only demo/test data, so
there is nothing to preserve and a rehearsal would prove nothing. The
reasoning, and the three first-deploy bugs that verifying this path
turned up instead, are in
`docs/decisions/0025-migration-rehearsal-waived-fresh-install-instead.md`.

Work these in order. The first two are the entire recovery plan if the
"only demo data" premise turns out to be wrong — there is no rollback
target on a first deploy.

- [ ] **[human]** **Copy `shared/uploads` off the host first.** Product
      images uploaded through the admin live only there — not in git, not
      in the release artifact. Deleting the old install deletes every
      one of them. Copy the folder down, or accept re-uploading the lot.
- [ ] **[human]** Take a final `mysqldump` of the old database and keep
      it **outside the repo**. `.gitignore` blocks `*.sql`, `*.sql.gz`
      and `*.dump`, but keep it off the working tree entirely.
- [ ] **[human]** Confirm there really is nothing real in that dump
      (count the rows in the `Order` table and glance at the phone
      numbers). If anything is real, stop — the waived rehearsal is the
      procedure to run, and it is in this file's git history.
- [ ] **[human]** Create the new MySQL database and user in cPanel.
      Leave the schema **empty** — `apply-migrations.sh` builds it.
      Create the schema and user _before_ the first deploy: the deploy
      backs up the database before migrating, and `mysqldump` against a
      schema that does not exist aborts the whole run.
- [ ] **[human]** Write `shared/.env` with `DATABASE_URL` pointing at
      it. A generated cPanel password is fine now — symbols and
      percent-escapes are both handled (ADR 0025) — but it must be
      percent-encoded in the URL, as Prisma requires.
- [ ] **[human]** Rotate every credential that ever appeared in git
      history before putting it in `shared/.env` — see the secrets-leak
      note in `DEPLOYMENT.md`. "The site still works" does not prove the
      Phase 0 leak was rotated.
- [ ] Deploy (§2 below). `apply-migrations.sh` creates
      `_prisma_migrations` and applies all of them in order on a brand-new
      schema.
- [ ] **[human]** Create the first admin — the only way in on a fresh
      database: `node scripts/bootstrap-admin.cjs` from inside the
      release directory. It seeds roles, permissions and grants too.
      Plain CommonJS on purpose, so it runs within the host's thread
      ceiling (`ARCHITECTURE.md` §12).
- [ ] **[human]** Restore `shared/uploads`, then spot-check that product
      images actually render on the storefront.
- [ ] **[human]** Configure settings that used to live in the old
      install's database: store details, delivery charges, theme, and
      every integration credential in §4.

### Code and config

- [ ] `main` is green in CI (verify + cross-browser jobs).
- [ ] `npm audit --omit=dev --audit-level=critical` is clean (CI gates
      this; the known-deferred `high`s are listed in ADR 0023).
- [ ] `shared/.env` on the host has every variable `DEPLOYMENT.md` lists,
      including `SETTINGS_ENCRYPTION_KEY` (without it, every encrypted
      admin secret is unreadable) and `CRON_SECRET`.

### Backups and rollback

**Deploy #1 has no rollback target**, and that is not a bug —
`deploy-release.sh` reports `<none, this was the first deploy>` and
stops rather than pretending otherwise. Until a second release exists,
recovery means the pre-wipe dump and the `shared/uploads` copy from §1.

- [ ] A pre-deploy DB backup exists (`scripts/deploy/backup-db.mjs` runs
      automatically, but confirm the file landed in `shared/backups`).
      On deploy #1 this is a dump of an empty schema — it proves the
      backup step works, nothing more.
- [ ] **From deploy #2 on:** rollback rehearsed at least once,
      `./releases/<sha>/scripts/deploy/rollback.sh <previous-sha>`, and
      you know which SHA is the target (`/api/health` reports the
      running one).

---

## 2. The deploy

- [ ] Trigger `deploy.yml` by hand from the Actions tab (deploys are
      deliberately manual — `docs/decisions/0007-manual-deploy-trigger.md`).
- [ ] `/api/health` returns the SHA you just shipped.
- [ ] Storefront loads in both locales (`/` and `/bn`).
- [ ] Admin login works, and one admin write (e.g. a product quick-edit)
      shows up on the storefront within seconds.

---

## 3. Cron jobs

Add every line from `DEPLOYMENT.md`'s "Cron jobs" section in cPanel →
Cron Jobs, with the real `CRON_SECRET`:

- [ ] `cancel-unpaid-orders` — hourly
- [ ] `low-stock-sweep` — every 30 min
- [ ] `payment-reconciliation` — daily 3am
- [ ] `retry-conversions` — daily 4am
- [ ] `abandoned-cart` — daily 10am
- [ ] `backup-db.mjs` — daily 2am
- [ ] Confirm each one by running it once by hand and checking the
      response is `{"data":{...}}`, not an auth error.

---

## 4. Third-party services **[human]**

Each of these needs real credentials this codebase has never had — see
ADRs 0018 (payments), 0019 (courier/SMS/email), 0020 (Meta), 0021
(analytics).

### Payments

- [ ] **[human]** SSLCommerz store ID + password entered in Admin →
      Settings → Integrations (encrypted at rest, not `.env`).
- [ ] **[human]** Gateway switched from sandbox to **live**.
- [ ] **[human]** Click "Test payment" and confirm the gateway accepts
      the session.
- [ ] Place one real low-value order end to end, confirm the payment
      reaches `PAID` and the order moves to `CONFIRMED`.
- [ ] Refund that order from Admin → Orders and confirm
      `Payment.refundedAmount` tracks it.

### Courier / SMS / email

- [ ] **[human]** Steadfast API key + secret saved; "Test connection"
      returns a real balance.
- [ ] **[human]** BulkSMSBD API key + sender ID saved; "Test SMS"
      arrives on a real handset — **send one Bengali message** and
      confirm it isn't garbled (Phase 8 fixed the GSM-7/Unicode bug; this
      confirms it against the real gateway).
- [ ] **[human]** SMTP credentials saved; "Test email" arrives and
      renders as branded HTML, not plain text.
- [ ] Trigger one real OTP login and confirm the code actually arrives
      (Phase 8 fixed this never being sent at all).

### Meta / analytics

- [ ] **[human]** Meta Pixel ID + Conversions API token saved in Admin →
      Settings → Tracking.
- [ ] **[human]** In Meta Events Manager → Test Events, confirm browser
      **and** server events both arrive and **deduplicate** (this is the
      one check Phase 9 could not perform without real credentials).
- [ ] **[human]** Confirm a gateway order only reports `Purchase` after
      payment is actually confirmed (Phase 9's fix) — place one and watch
      Events Manager.
- [ ] **[human]** GA4 measurement ID (and/or GTM container) saved; a
      `page_view` shows up in GA4 Realtime after accepting cookies.
- [ ] **[human]** Google Ads conversion ID + label saved, if running ads.
- [ ] Reject cookies in a fresh browser and confirm **no** pixel network
      requests fire (Phase 10's categorized consent).

### Search

- [ ] **[human]** Google Search Console: add the property, submit
      `https://unibaazar.com/sitemap.xml` (the index — not the children).
- [ ] **[human]** Bing Webmaster Tools: same URL.
- [ ] **[human]** Google Merchant Center: submit `/feeds/google`.
- [ ] **[human]** Meta Commerce Manager: submit `/feeds/facebook`.
- [ ] Spot-check a product page in Google's Rich Results Test — Product
      (or ProductGroup) and BreadcrumbList should both be detected.

---

## 5. Monitoring

- [ ] `/api/health` is reachable and reports the right SHA.
- [ ] **[human]** An uptime monitor pings `/api/health` (any free
      service) and alerts a real phone/inbox.
- [ ] Admin → Maintenance's job log shows the cron runs landing.
- [ ] Admin → Orders → Notification logs shows real SMS/email sends.
- [ ] Admin → Settings → Tracking shows Conversions API sends as `sent`,
      not `failed`.
- [ ] **[human]** Decide who watches the 404 log (Admin → SEO) in the
      first week — a v1→v2 URL change that nobody redirects is the most
      likely source of lost traffic, and the redirect manager now
      actually works (Phase 11).

---

## 6. First-week watchlist

- [ ] 404 log: create redirects for anything with repeat hits.
- [ ] Payment reconciliation alerts (daily 3am job) — any mismatch means
      the gateway and the DB disagree about money.
- [ ] Conversions API log: anything stuck `failed` after 5 retries means
      a bad/expired token.
- [ ] Abandoned-cart emails are going out but not to the same cart twice.
- [ ] Courier bookings reach Steadfast (Admin → Orders bulk "Send to
      Steadfast").
- [ ] **[human]** Review the deferred dependency majors in ADR 0023
      (prisma 7, zod 4, next 16) and schedule them as their own change —
      they are known `high` advisories, just not safe to bundle into a
      launch.
