# 0017: Phase 6 scope — adopt the design system on admin, close the real gaps

## Context

The master plan's Phase 6 bullet list, verbatim: a dashboard with
today/7d/30d KPI comparisons, a revenue chart, an order-status funnel, top
products, low stock, courier success rate, conversion rate, and recent
orders; full coverage of catalog/orders/customers/inventory/marketing/
content/users-roles/settings/reports with CSV/XLSX/PDF export; a
notification centre with bell/sound/polling; "done when" every admin write
has an audit log entry, RBAC E2E proves each role sees only what it
should, and parity tests cover every settings group.

A survey of the current codebase (read-only, before any Phase 6 code was
written — the same approach ADR 0016 used for Phase 5) found, like Phase
5, that **almost everything on this list already exists and works**:

- Dashboard (`src/app/(admin)/admin/page.tsx` → `loadDashboard()`):
  today/week/month sales, a revenue chart, top products, low stock,
  recent orders, and courier success rate are all already computed and
  rendered. Conversion rate is the one KPI correctly absent — it depends
  on the first-party analytics event table, which is Phase 10's job.
- Reports (`src/server/admin/reports.ts`): sales, product/category/
  brand/profit grouping, coupon, returns, courier, tax, and customers
  reports all exist. CSV, XLS, and PDF export all exist
  (`reportToCsv`/`reportToExcel`/`renderReportPdf`,
  `admin/reports/export/route.ts`). The one report type on the plan's
  list that's genuinely missing is **stock valuation**.
- RBAC: a real role/permission matrix already exists in the schema
  (`Role`/`Permission`/`RolePermission`) and in admin
  (`RolesMatrix.tsx`, `src/app/(admin)/admin/users/roles`). What's
  missing is the **E2E test suite** the plan's "done when" asks for —
  there is currently no `e2e/**/*rbac*` or `*role*` spec at all.
- Audit log: `recordAudit()` exists and is already called from 14 server
  modules across the admin surface (orders, catalog, settings, content,
  marketing, etc.) — not newly built, but not yet audited end-to-end for
  completeness against every admin write path.
- Notification centre: `NotificationBell.tsx`,
  `/api/v1/admin/notifications`, and `admin/settings/notifications`
  already exist.
- Every admin module in the plan's list
  (catalog/orders/customers/inventory/marketing/content/users/settings/
  reports) already has real routes and server logic under
  `src/app/(admin)/admin/*` and `src/server/admin/*`.

What's genuinely missing, almost everywhere, is the same gap Phase 5
closed on the storefront: **visual polish and the Phase 4 design system
(`components/ui`, `components/motion`) actually being used** — admin was
explicitly excluded from Phase 5's adoption (ARCHITECTURE.md §4.2: "admin
adoption is still Phase 6 work") and today still renders with the
pre-Phase-4 legacy helpers (`buttonClass`/`fieldClass` from
`components/ui/controls.ts`) across every admin screen.

## Decision

This phase does two things:

1. **Adopt `components/ui`/`components/motion` across the admin panel**,
   mirroring Phase 5's approach: real functional screens get a visual
   rebuild on the design-system primitives (Button, Input, Select, Table-
   adjacent card/list patterns, Dialog/AlertDialog for destructive
   confirmations, Badge for status, Toast for action feedback), not a
   redesign of their underlying data/logic. Split across parallel
   background-agent worktree slices by module cluster, the same pattern
   Phase 5 used, with explicit file-ownership boundaries to avoid
   conflicts:
   - **Dashboard, reports, notification centre.**
   - **Catalog (products/brands/categories/attributes/tags/units),
     inventory.**
   - **Orders, customers, marketing (coupons/flash/banners).**
   - **Content (pages/blog/CMS/home sections/video gallery board), users
     & roles, settings.**
2. **Close the specific, named gaps** the survey found, done directly
   (not delegated — these are correctness-critical, matching
   [[feedback_phase3_scoping]]'s "don't cut rigor on what's in scope"
   precedent):
   - **RBAC E2E suite**: log in as each distinct role, assert each sees
     only the admin sections/actions its permissions grant and gets a
     real 403/redirect on everything else.
   - **Audit log completeness pass**: walk every admin server action that
     mutates data and confirm it calls `recordAudit()`; fix any that
     don't.
   - **Stock valuation report**, the one report type on the plan's list
     without an existing implementation.
   - **Order-status funnel** on the dashboard (today/7d/30d counts per
     status, not just the KPI cards that exist today).
   - **Settings-group parity test coverage**: confirm every settings
     group Phase 2's parity suite pattern covers has a test, add any
     missing.

## Explicitly deferred (tracked here, not silently dropped)

- **Conversion rate on the dashboard** — needs the first-party analytics
  event table, which doesn't exist until Phase 10. The KPI slot is left
  out entirely rather than faked with a placeholder.
- **A true admin-configurable homepage section _builder_** (drag-and-drop
  reordering, arbitrary new section types) — already deferred once by
  ADR 0015/0016 to "better suited to Phase 6," and deferred again here
  for the same reason a generic section-type builder is a bigger
  standalone project than this phase's design-system-adoption scope.
  Today's ordered, enable/disable-able section list stays as-is.
- **New report types beyond the master plan's named list** (e.g.
  anything not in "sales, product, category, profit, stock valuation,
  coupon, courier, returns, customers, tax") — the list above is now
  complete once stock valuation lands; nothing further is added
  speculatively.

## Consequences

- Same shape as Phase 5: `components/ui`/`components/motion` finish
  their rollout (storefront in Phase 5, admin here) rather than staying
  partially adopted indefinitely.
- The correctness-critical "done when" bar (audit log, RBAC E2E, settings
  parity) is met for real, not asserted — each is independently
  verifiable (a passing E2E suite, a completeness pass with its findings
  listed, not just "should be fine").
- Conversion rate's absence is a known, documented gap tied to a named
  future phase, not a silently missing KPI.
