# Changelog

All notable changes to UniBaazar are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); phases are tracked instead of
version numbers while the v2 rebuild (`UNIBAAZAR_V2_MASTER_PLAN.md`) is in progress.

## Phase 0 — Audit, safety, and baseline (2026-10-18)

### Security fixes

- `webhookSecret()` no longer falls back to a hardcoded literal when `AUTH_SECRET`
  is unset — it throws instead, closing a path where anyone who knew the fallback
  string could have forged payment-callback requests.
- OTP and password-reset codes now use `crypto.randomInt()` instead of
  `Math.random()`.
- Removed the real DB password and the seeded admin password from `DEPLOYMENT.md`
  (both were committed in plaintext and already pushed to `origin/main` —
  rotation still needed, see `docs/qa/phase-00-report.md`).

### Tooling added

- Vitest (`npm run test:unit`, `test:integration`) and Playwright
  (`test:e2e`, `test:e2e:mobile`, `test:a11y`, `test:visual`) with desktop + mobile
  projects.
- `npm run verify` / `verify:full` per the master plan's command reference.
- Lighthouse CI (`npm run lhci`) against home/shop/product/checkout.
- `docker-compose.test.yml` for an isolated MySQL 8 test database.
- commitlint + a `commit-msg` hook enforcing Conventional Commits.
- `.claude/settings.json` and `CLAUDE.md` (condensed operating rules for future
  sessions).

### Removed

- `src/lib/mock/cart.ts` — dead code, zero importers.

### Docs

- `docs/audit/current-state.md` — full Phase 0 codebase audit.
- `docs/decisions/0001`–`0003` — ADRs for import-boundary deferral, secret
  scanning without a local gitleaks binary, and the local test-DB workaround.
- `docs/qa/phase-00-report.md` — this phase's QA report.

### Known limitations carried forward (not fixed in Phase 0 — see audit doc)

- Delivery-charge calculation is duplicated between the authoritative checkout
  quote and a hardcoded cart/checkout preview; they can disagree.
- bKash/Nagad admin settings don't affect payment routing yet.
- The client-side cart's stock check reads mock catalog data, not the database.
- Organization/WebSite JSON-LD never reads admin-edited store settings.
- Near-zero automated test coverage on checkout, orders, payments, and auth.
- Storefront color tokens fail WCAG AA contrast in several places (brand
  orange, one delivery-partner badge color) — scheduled for Phase 4's design
  system.
