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

## Phase 14 — Deploy readiness ✅ done

Was "migration rehearsal", blocked on a production dump. The human
confirmed the production database holds **only demo/test data** and that
v1 is being deleted and replaced rather than upgraded — so there is
nothing to preserve and a rehearsal would have proved nothing. Waived
and replaced with verifying the path that will actually run, a first
deploy onto an empty database (ADR 0025).

That verification found three defects, none of them reachable without
exercising the pipeline, and none of which a restored dump would have
caught — the pipeline had never run end to end, because deploys have
been deliberately deferred since ADR 0007:

- [x] the release tarball **omitted `scripts/`**, so `deploy.yml`'s final
      step — `bash .../scripts/deploy/deploy-release.sh` — would have
      failed on the first real deploy's first command
- [x] `--exclude='.next/cache'` sat after the path list, where tar treats
      it as positional and it matched nothing: **710MB of webpack cache
      in every release**, and an invocation that exits non-zero
- [x] `apply-migrations.sh` **could not parse a DB password containing
      symbols** — exactly what cPanel generates for a fresh install
- [x] every deploy script syntax-checked (`bash -n`, `node --check`)
- [x] `docs/launch-checklist.md` §1 rewritten as the fresh-install
      sequence, including the two steps that are the whole recovery plan
      for deploy #1: copy `shared/uploads` off the host, and keep a final
      pre-wipe dump outside the repo

**Done when:** the release artifact contains everything the deploy
invokes and the fresh-install path is written down. ✅ See
`docs/qa/phase-14-report.md`. Phase 12's rehearsal gate closes on ADR
0025 instead.

Still blocked, carried forward: `hasMerchantReturnPolicy` needs the real
return window in days (from Phase 13).

---

## Phase 15 — Merge and first deploy

- [ ] **first**, with no `next dev` running, `npm run test:parity` and
      confirm **8/8**. Phase 14 fixed two defects in that suite but could
      not observe the fix pass — a stray dev server was corrupting every
      production build (`docs/qa/phase-14-report.md`).
- [ ] merge the Phase 4–14 branch chain into `main` (one merge, per the
      standing no-per-phase-PR decision)
- [ ] work `docs/launch-checklist.md` §1 first — the uploads copy, the
      pre-wipe dump, and the empty schema all have to exist before the
      deploy runs
- [ ] trigger `deploy.yml` by hand
- [ ] `node scripts/bootstrap-admin.cjs` to create the first admin —
      there is no other way in on a fresh database
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
- [ ] `playwright.config.ts`'s `reuseExistingServer: !process.env.CI` —
      locally it silently tests against whatever stale server holds the
      port, which cost a wrong diagnosis in Phase 14. CI is unaffected.
      Either check the build id or stop reusing.

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
