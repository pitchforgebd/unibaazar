# UniBaazar — working rules for Claude Code

This is a condensed, always-apply version of `UNIBAAZAR_V2_MASTER_PLAN.md` §0 and §2.
**Read the full master plan before starting or resuming phase work** — this file is a
quick reference, not a replacement.

## This is a live site

`unibaazar.com` has real customers and real orders. Never connect to the production
server or production database. Never run `next build`, `prisma migrate`, `npm run
db:seed`, or `tsx` scripts on the cPanel host — it has a hard ~5-OS-thread ceiling and
those commands reliably crash there (see `ARCHITECTURE.md` §12). If you need a fact
only the host can give you, print the exact command and stop until the human pastes
back the output.

## Autonomy

Inside a phase, make the call yourself and keep going — don't ask about routine
choices. Record non-obvious decisions as ADRs in `docs/decisions/NNNN-title.md`
(context → decision → consequences). Stop and ask only when:

1. an action would destroy or irreversibly change production data,
2. something would cost money,
3. the plan contradicts itself or the real code in a way that changes scope, or
4. a credential or account you don't have is needed.

## Git workflow

- One branch per phase: `v2/phase-NN-short-name`, from `main` (or the previous phase
  branch if unmerged).
- Commit after every completed task, Conventional Commits style
  (`feat(checkout): …`, `fix(payments): …`, `refactor(money): …`). Small, focused
  commits; pure file moves get their own commit, separate from logic changes.
- `npm run verify` before every commit (enforced by the pre-commit hook). Never
  commit red, never commit secrets, never force-push, never push to `main`.
- End of phase: push the branch, open a PR (`gh pr create` if available, otherwise
  put the PR description in the phase report), then **stop** — a human merges into
  `main`, and that merge is what triggers deployment.

## Code quality bar

- TypeScript `strict`, no `any`, no unexplained `@ts-ignore`. ESLint/Prettier clean.
- No dead code, no commented-out blocks, no stray `console.log`, no duplicated logic.
- Every server input validated with zod — never trust the client for price, stock,
  discounts, or permissions.
- Every user-facing string goes through `next-intl`, kept in lockstep between
  `src/locales/en.json` and `src/locales/bn.json`.
- New business logic gets unit tests; user flows get E2E tests.
- Keep components small; split files that grow past ~300 lines.

## End-of-phase protocol (always, before stopping)

1. `npm run verify:full` (typecheck, lint, unit, integration, Playwright E2E desktop
   - mobile, axe a11y, Lighthouse CI).
2. Manually test every feature touched in the phase, including edge cases: empty
   states, invalid input, out of stock, expired coupon, Bengali locale, 360px
   mobile, keyboard-only nav, `prefers-reduced-motion`, slow network.
3. Fix everything found, re-run until green.
4. Write `docs/qa/phase-NN-report.md`: what was built, the test matrix, screenshots,
   known limitations, deploy notes (migrations? new env vars? new cron jobs?).
5. Update `CHANGELOG.md`, `ARCHITECTURE.md`, and `docs/` to match reality.
6. Push, open the PR, summarize in plain English, **stop and wait**.

## Target architecture (where we're heading — see master plan §2.2 for the full tree)

- `app/` stays thin — route files parse input and call into `modules/`/`integrations/`,
  nothing else.
- Business logic lives in `modules/<domain>/` (catalog, pricing, inventory, cart,
  checkout, orders, customers, promotions, content, media, auth, access, settings,
  notifications, audit) and `integrations/<provider>/` (payments, courier, sms,
  email, meta, analytics, seo, captcha). This structure doesn't exist yet as of
  Phase 0 — the real code is still under `src/server/*`, `src/lib/*`,
  `src/components/*`, grouped by feature. It's introduced in Phase 2.
- Once `modules/` exists: modules talk to each other only through their exported
  `index.ts`, enforced by an ESLint import-boundary rule (deferred until then — see
  `docs/decisions/0001-defer-import-boundaries-to-phase-2.md`).
- `modules/pricing` will be the **only** place prices, discounts, delivery, and tax
  are computed (Phase 3). Until then, be aware `src/server/checkout/quote.ts` and
  `src/lib/catalog/pricing.ts` currently disagree on delivery-charge math — see
  `docs/audit/current-state.md`, finding on delivery-charge duplication.
- Every admin write must eventually call `revalidateTag()` for the affected tags so
  the storefront updates within seconds (Phase 2). Admin → storefront parity gaps
  found so far are tracked in the audit doc, not fixed ad hoc outside their
  scheduled phase.

## Commands

```
npm run dev / build / start
npm run verify            # typecheck + lint + test:unit — run before every commit
npm run verify:full       # verify + integration + e2e (desktop+mobile) + a11y + lighthouse
npm run test:unit         # Vitest, no DB
npm run test:integration  # Vitest against the test DB (.env.test)
npm run test:e2e / test:e2e:mobile   # Playwright
npm run test:a11y         # Playwright + axe-core
npm run test:visual       # Playwright visual snapshots
npm run db:up / db:down   # docker compose test MySQL (docker-compose.test.yml, port 3307)
npm run db:migrate:test / db:seed:test  # apply migrations/seed to .env.test's DB
npm run db:migrate / db:seed            # local dev DB (prisma migrate dev / db seed)
```

If Docker isn't available locally, point `DATABASE_URL` in `.env.test` at any
disposable MySQL 8 schema instead — see
`docs/decisions/0003-local-test-database-without-docker.md`.

## Where things are

- `UNIBAAZAR_V2_MASTER_PLAN.md` — source of truth, phase-by-phase plan.
- `ARCHITECTURE.md` — what the codebase actually looks like today.
- `DEPLOYMENT.md` — the cPanel deploy flow (being rewritten as Phase 1 lands CI/CD).
- `docs/audit/current-state.md` — the Phase 0 audit of what's solid, broken, mock,
  duplicated, or missing test coverage.
- `docs/decisions/` — ADRs.
- `docs/qa/phase-NN-report.md` — end-of-phase test results and deploy notes.
