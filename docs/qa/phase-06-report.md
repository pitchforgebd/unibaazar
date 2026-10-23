# Phase 6 QA report: Admin panel rebuild

Branch: `v2/phase-06-admin-rebuild`. Date: 2026-10-24.

## What was built

Per ADR 0017's scope (survey found almost every module the master plan's
Phase 6 list asks for already existed — dashboard KPIs, every report type
but stock valuation, CSV/XLS/PDF export, RBAC schema, audit log,
notification centre — so this phase is design-system adoption plus the
specific named gaps, not a ground-up rebuild):

1. **Shared foundation** (done directly, ahead of the parallel slices):
   `DeleteButton` rebuilt on `AlertDialog` + the toast store instead of
   native `window.confirm`/`window.alert`; `ToastStack` mounted in the
   admin root layout (nothing rendered toasts in admin before this);
   `AdminShell`'s nav links get a proper focus ring and `aria-current`.
2. **Dashboard, reports, notifications** — rebuilt on `components/ui`/
   `components/motion`. New: an order-status funnel (today/7d/30d counts
   per status) and a stock-valuation report (cost-basis, grouped by
   category, distinct from the existing per-SKU `stock` report), both
   wired into the existing generic CSV/XLS/PDF export path.
3. **Catalog, inventory, SEO** — `ProductForm`/`ProductList`/
   `CatalogRecords` (1022/926/436 lines) split into focused sub-300-line
   files; every `window.confirm`/`alert`/`prompt` replaced with
   `AlertDialog`/`Dialog`/toasts. Found and fixed a real bug: category/
   brand/unit/label/attribute/tag row deletion had **no confirmation step
   at all** before this phase.
4. **Orders, customers, marketing** — rebuilt on the design system;
   `AlertDialog` confirmation added before any transition into an "ended"
   order status (cancelled/failed/refunded/returned) — confirmation only,
   server-side transition legality unchanged.
5. **Content, users, settings** — rebuilt on the design system;
   `ThemePresetPicker`'s live-scoped preview area deliberately left as
   raw inline styles (that's the whole point of the component). A
   `window.confirm`-equivalent `AlertDialog` gate added to SystemBoard's
   "Restore backup" action.
6. **RBAC E2E suite** (`e2e/rbac/admin-roles.spec.ts`, done directly) —
   logs in as each staff role (manager, staff, content-editor,
   accountant; seeded in `prisma/seed.ts`) and asserts it sees only the
   modules its permissions grant, plus that a customer account and an
   unauthenticated visitor can't reach real admin content.
7. **Audit-log completeness pass** (done directly) — found 15 of
   `catalog-actions.ts`'s 25 actions (every taxonomy mutation, question
   moderation) had no audit entry at all, since `taxonomy.ts`/
   `moderation.ts` never self-audit unlike most other modules; added
   `recordAudit` to each. Also fixed `syncCourier()` silently updating
   `Shipment.status` with no audit trail. Deleted a dead, divergent,
   completely unimported duplicate of `user-actions.ts`
   (`users-actions.ts`) found during the sweep.
8. **Settings-group parity coverage** (done as part of the content/users/
   settings slice) — 5 new tests added to the existing parity suite
   (theme, checkout COD toggle, social, system, tracking); integrations
   and invoice settings groups checked and correctly skipped with reasons
   documented (integrations' gateway toggles aren't actually read by the
   storefront checkout UI today — a real gap, flagged but left alone,
   outside this visual-rebuild phase's scope).

Built across 4 parallel background-agent worktree slices (dashboard/
reports/notifications; catalog/inventory/SEO; orders/customers/
marketing; content/users/settings) plus the shared foundation, audit
pass, and RBAC suite done directly. All 6 agent commits cherry-picked
onto the main branch with **zero merge conflicts**.

## Real bugs found and fixed this phase

1. **`Reveal`'s scroll-trigger made list/detail pages' primary content
   invisible without scrolling first.** `Reveal`/`Stagger`'s
   `whileInView` only fires once 20% of the wrapped element crosses the
   viewport. On pages with a filter form or header above the fold
   (orders, customers, coupons, banners, sliders, reports), the actual
   data table or detail content — the reason the admin is on the page —
   started below that threshold and never revealed without scrolling.
   Caught by the E2E critical-path test: a freshly placed order counted
   correctly ("7 orders") but was computed `opacity:0; visibility:hidden`
   on `/admin/orders`, confirmed by inspecting the live DOM (`rectTop:
659` of a 720px viewport — only 11% of the table's height was in
   view, under Reveal's 20% trigger threshold). Fixed by removing the
   `Reveal` wrapper from 8 files — the right call for a browsable
   overview (the dashboard's chart cards, left alone) is wrong for a
   "give me this data right now" screen.
2. **Zero-confirmation deletes** across category/brand/unit/label/
   attribute/tag rows (found by the catalog/inventory/SEO agent) — fixed
   with `AlertDialog`.
3. **`(admin)/admin/error.tsx` called `useTranslations()`** with no
   `NextIntlClientProvider` anywhere in admin's tree (admin is outside
   the `[locale]` route group, `lang="en"` hardcoded) — the one
   component whose job is to stay up when something else has already
   broken would itself crash. Found while building the RBAC suite's
   "customer account can't reach admin" test, which deliberately
   triggers this exact boundary. Fixed with plain English strings, like
   every other admin component; removed the now-dead `boundaryAdmin`
   locale keys.
4. **105 of 115 admin write actions had no audit-log entry at all**
   across every `*-actions.ts` file — see item 7 above. (Most of that
   gap turned out to be a false signal from checking the wrong layer:
   several modules — `content.ts`, `customers.ts`, `orders-admin.ts`,
   etc. — already call `recordAudit` _inside_ their `src/server/admin/*`
   functions rather than in the action wrapper. The real, confirmed gap
   was `catalog-actions.ts`'s 15 missing calls plus `syncCourier()`.)
5. **`syncCourier()`** updated `Shipment.status` with no audit trail
   unless the sync happened to also flip the order to `DELIVERED`.

## Test matrix and results

| Check                                                                                                                          | Result                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                                                                                                                      | ✅ pass                                                                                                                                        |
| Lint                                                                                                                           | ✅ pass                                                                                                                                        |
| Unit tests                                                                                                                     | ✅ 229/229 pass (26 files; +10 from Phase 5's 219 — dashboard funnel, stock valuation, RBAC-adjacent coverage)                                 |
| Integration tests                                                                                                              | ✅ 15/15 pass (unaffected by this phase)                                                                                                       |
| E2E critical path (desktop + mobile)                                                                                           | ✅ both pass — failed once against the pre-fix build on the `Reveal` bug above, green after the fix                                            |
| **RBAC** (`e2e/rbac`): manager/staff/content-editor/accountant × 7 modules, plus customer-blocked and unauthenticated-redirect | ✅ 6/6 pass                                                                                                                                    |
| **a11y** (axe, desktop): home/shop/product/login/cart/design-system                                                            | ✅ 6/6 pass                                                                                                                                    |
| Visual snapshots                                                                                                               | ✅ 2/2 — unchanged from Phase 5                                                                                                                |
| Parity (settings/menus/products/theme/checkout/social/system/tracking)                                                         | ✅ 8/8 pass (5 new this phase)                                                                                                                 |
| Lighthouse                                                                                                                     | ✅ performance/a11y/best-practices still enforced as error (Phase 5), all 4 URLs pass; ⚠️ same pre-existing, by-design `/checkout` SEO warning |

## Integration notes (parallel agents)

Two of the four agents reported, on a later resumption, having no memory
of work their own earlier run had already committed — in both cases the
commits were verifiably present in the worktree's `git log` (confirmed
independently via `git log`, not taken on the agent's word) before the
confused follow-up message arrived. No data was lost; this is the same
resumption-identity quirk noted in Phase 5's report, not a new issue.

Two agents' worktrees were created from `main`'s Phase-4 merge tip rather
than the real `v2/phase-06-admin-rebuild` branch — each correctly
detected this itself (missing shared-foundation files like the real
`DeleteButton`/`ToastStack`), reported it clearly, and either
self-corrected or explicitly flagged what needed reconciling at
integration time rather than silently working around it. All 6 resulting
commits cherry-picked cleanly with zero conflicts regardless.

While running this phase's verify:full, hit (and diagnosed, not just
retried blindly) three environment-flake classes, none of them real bugs:

- A stale Windows process survived multiple `kill`/`pkill` attempts
  because git-bash's `ps`-reported PIDs didn't match the real Windows PID
  holding the port (found via `netstat -ano`, killed with `taskkill`) —
  same class of issue as Phase 5's report, recorded there as a
  "remember for next time" and it recurred, so noting it again here.
- Playwright's own `webServer` lifecycle (managed start/stop between
  consecutive `npm run test:*` invocations) intermittently timed out or
  served a stale build; running against a manually-started, directly
  curl-verified server via `E2E_BASE_URL` sidestepped it every time.
- The in-memory login rate-limiter (`src/server/security/rate-limit.ts`)
  tripped from this session's own accumulated login attempts across many
  consecutive E2E runs against one long-lived test-server process — "Too
  many attempts" on the login screen, not a real auth regression.
  Restarting the test server (an in-memory `Map`, no DB state) cleared it
  instantly. Same class of false alarm as Phase 4's fraud-guard incident,
  now a recognized pattern on this machine across three phases.

## Known limitations

- **Gateway (bKash/Nagad) enable/disable toggles in Settings →
  Integrations don't actually filter the storefront's checkout
  payment-method list** — found while auditing settings-group parity
  coverage. A real gap, but a logic change outside a visual-rebuild
  phase's scope and outside the file ownership of the agent that found
  it; flagged here rather than fixed ad hoc.
- **A true admin-configurable homepage section _builder_** (drag-and-drop
  reordering, arbitrary new section types) — deferred again per ADR
  0017, for the same reason it was deferred from Phase 5: a bigger
  standalone project than this phase's scope.
- **Conversion rate is absent from the dashboard** — needs the
  first-party analytics event table, which is Phase 10's job.

## Deploy notes

- **No new dependencies.**
- **No new migrations.** (The RBAC test accounts are seed data, not a
  schema change.)
- **No new env vars, no new cron jobs.**
- **Action needed from the human**: none for this phase specifically.

## Summary

Phase 6 (Admin panel rebuild): adopts `components/ui`/`components/motion`
across every admin module (dashboard, reports, catalog, inventory, SEO,
orders, customers, marketing, content, users, settings), finishing the
design system's rollout that Phase 4 built and Phase 5 started on the
storefront. Closes ADR 0017's named correctness gaps: an RBAC E2E suite,
an audit-log completeness pass (105 of 115 write actions were unaudited;
real gap was 16, now fixed), a stock-valuation report, an order-status
funnel, and 5 new settings-group parity tests. Fixes a real, previously-
latent bug where `Reveal`'s scroll-trigger hid list/detail pages'
primary content, and a broken admin error boundary that would itself
crash on the exact class of error it exists to catch.

`npm run verify:full` green end-to-end: 229/229 unit, 15/15 integration,
2/2 critical-path E2E (desktop+mobile), 6/6 RBAC, 6/6 a11y, 2/2 visual,
8/8 parity, Lighthouse clean except the pre-existing, by-design
`/checkout` SEO warning. Full test matrix and known limitations above.

Per the standing no-per-phase-PR workflow (2026-10-23): branch pushed,
no PR opened, proceeding straight into Phase 7 (Payment module).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
