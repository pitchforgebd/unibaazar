# Post-Phase-12 plan (Phases 13–18)

`UNIBAAZAR_V2_MASTER_PLAN.md` ends at Phase 12. All 12 of its phases are
code-complete; what remains is the work of actually going live, plus the
items each phase deliberately deferred with written reasoning.

Ordered by dependency and risk. Phases 13–16 are the launch path; 17–18
are after.

Related: `docs/launch-checklist.md` (the operational runbook, with every
credential-dependent step marked **[human]**), `docs/qa/phase-NN-report.md`,
`docs/decisions/`.

---

## Phase 13 — Pre-launch correctness fixes ✅ done

Pure code, no credentials needed.

- [x] Rate limits and daily order caps re-keyed on **identity** rather
      than IP — Bangladesh's CGNAT mobile networks made the per-IP
      numbers refuse real customers (ADR 0024).
- [x] `clientIp()` no longer trusts the client-supplied `X-Forwarded-For`
      entry, which let anyone pick their own rate-limit key (ADR 0024).
- [ ] `hasMerchantReturnPolicy` JSON-LD — **blocked**: needs the real
      return window in days. Not invented, because structured data that
      contradicts the return-policy page is worse than omitting the
      field (ADR 0022).

**Done when:** full regression green and the new limits verified against
a running server. ✅ See `docs/qa/phase-13-report.md`.

---

## Phase 14 — Migration rehearsal 🔒 blocked on a production dump

This is the open gate on Phase 12 — its stated "done when" is the human
approving the rehearsal.

- [ ] **[human]** fresh `mysqldump` of production, placed locally
      (`CLAUDE.md` forbids connecting to production from here)
- [ ] restore into a scratch schema, run `prisma migrate deploy`
- [ ] integrity checks per `docs/launch-checklist.md` §1: order and item
      counts, `SUM(total)`, customer counts, oldest/newest 10 orders
      still resolving their items and payment history, every
      `Payment.status` mapping cleanly onto Phase 7's 8-state enum
- [ ] **[human]** confirm the Phase 0 leaked DB/admin passwords were
      actually rotated — "the site still works" doesn't prove it
- [ ] rehearse backup + rollback once

**Done when:** the human approves the rehearsal report. Phase 12 closes
with it.

---

## Phase 15 — Merge and first deploy

- [ ] merge the Phase 4–13 branch chain into `main` (one merge, per the
      standing no-per-phase-PR decision)
- [ ] trigger `deploy.yml` by hand
- [ ] install the 6 cron entries from `DEPLOYMENT.md`, running each once
      to confirm it authenticates
- [ ] post-deploy smoke: `/api/health` SHA, both locales, one admin
      write appearing on the storefront
- [ ] **verify `X-Forwarded-For` behaviour on the real host** — only
      possible here, and `TRUSTED_PROXY_HOPS` depends on it (ADR 0024)

**Done when:** the live site serves the new SHA and the rollback target
is known.

---

## Phase 16 — Third-party go-live

The human's credentials; this side verifies and debugs.

- [ ] **[human]** SSLCommerz switched to live, Steadfast, BulkSMSBD,
      SMTP, Meta Pixel + CAPI token, GA4 / Ads
- [ ] **[human]** Meta Events Manager → Test Events: confirm browser and
      server events arrive **and deduplicate** — never verifiable from
      this environment (ADR 0020)
- [ ] one real Bengali SMS, confirming it isn't garbled against the real
      gateway (Phase 8's GSM-7/Unicode fix)
- [ ] one real low-value order end to end, through `PAID`, then refunded
- [ ] confirm a gateway order only reports `Purchase` after payment is
      actually confirmed (Phase 9's fix)
- [ ] reject cookies in a fresh browser, confirm no pixel requests fire
      (Phase 10's categorised consent)
- [ ] **[human]** Search Console + Bing: submit `/sitemap.xml` (the
      index only); Merchant Center `/feeds/google`; Meta Commerce
      `/feeds/facebook`
- [ ] **[human]** uptime monitor on `/api/health`

**Done when:** money and notifications both proven in the real
environment.

---

## Phase 17 — Post-launch hardening

Each item needs the live environment to verify properly, which is why
none of it belongs before launch.

- [ ] dependency majors, **one at a time**, full regression after each:
      `prisma 7` → `zod 4` → `next 16`. All three carry `high`
      advisories; none is safe to bundle with a launch (ADR 0023).
- [ ] CSP nonces + `'strict-dynamic'` — now verifiable, because real
      pixel IDs will exist. Removes the last `script-src 'unsafe-inline'`
      (ADR 0023 has the exact steps).
- [ ] run the k6 load test (`scripts/load/checkout-and-listing.js`)
      against the real host, off-peak.

**Done when:** no `high` advisories in production dependencies and no
`unsafe-inline` in the CSP.

---

## Phase 18 — Deferred features and debt

No deadline; driven by business need or a credential arriving.

- [ ] Pathao / RedX couriers; direct bKash / Nagad / AamarPay; Meta
      auto-posting of new products (all credential-blocked)
- [ ] per-product catalog-feed include/exclude (ADR 0022)
- [ ] daily analytics rollup tables — deliberately deferred as premature
      at current data volume; revisit when live queries get slow
      (ADR 0021)
- [ ] full GA4 e-commerce `items[]` schema (ADR 0021)
- [ ] `LocalBusiness` JSON-LD, IndexNow — both "optional" in the master
      plan
- [ ] ESLint import-boundary rule (ADR 0001) and finishing the
      `src/server/*` → `modules/*` move (ADR 0010)
