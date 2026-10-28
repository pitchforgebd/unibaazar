# UniBaazar v2 launch checklist

Written in Phase 12. Work top to bottom on launch day. Anything marked
**[human]** needs a person with credentials or a judgement call — the
codebase can't do it and shouldn't pretend to.

Related: `DEPLOYMENT.md` (how a deploy actually runs),
`docs/qa/phase-12-report.md` (what was verified and how),
`docs/decisions/0023-phase-12-scope-hardening.md` (what was deliberately
left out, and why).

---

## 1. Before the deploy

### Data migration rehearsal **[human provides the dump]**

This is the phase's formal gate (master plan, Phase 12: _"Done when: the
human approves the rehearsal results"_).

- [ ] **[human]** Export a fresh production dump (`mysqldump`) and place
      it somewhere local. Do **not** point anything at the live DB — see
      `CLAUDE.md`.
- [ ] Restore it into a scratch schema: `mysql -u root scratch_rehearsal < dump.sql`
- [ ] Point `.env.rehearsal`'s `DATABASE_URL` at `scratch_rehearsal` and
      run `dotenv -e .env.rehearsal -- npx prisma migrate deploy`.
- [ ] Verify nothing was lost, comparing against the dump's own counts: - [ ] `Order` row count and `SUM(total)` unchanged - [ ] `OrderItem` row count unchanged - [ ] `Customer` / `User` row counts unchanged - [ ] every historical order still resolves its items, payment and
      status history (spot-check the 10 oldest and 10 newest) - [ ] `Payment.status` values all map onto the 8-state enum from
      Phase 7's migration (nothing silently coerced)
- [ ] **[human]** Approve the rehearsal result. Nothing below should run
      before this.

### Code and config

- [ ] `main` is green in CI (verify + cross-browser jobs).
- [ ] `npm audit --omit=dev --audit-level=critical` is clean (CI gates
      this; the known-deferred `high`s are listed in ADR 0023).
- [ ] `shared/.env` on the host has every variable `DEPLOYMENT.md` lists,
      including `SETTINGS_ENCRYPTION_KEY` (without it, every encrypted
      admin secret is unreadable) and `CRON_SECRET`.
- [ ] **[human]** Rotate anything that ever appeared in git history — see
      the secrets-leak note in the project memory/`DEPLOYMENT.md`.

### Backups and rollback

- [ ] A pre-deploy DB backup exists (`scripts/deploy/backup-db.mjs` runs
      automatically, but confirm the file landed in `shared/backups`).
- [ ] Rollback rehearsed at least once:
      `./releases/<sha>/scripts/deploy/rollback.sh <previous-sha>`.
- [ ] You know which release SHA is the rollback target
      (`/api/health` reports the running one).

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
