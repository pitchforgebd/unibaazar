# Phase 8 QA report: Courier, SMS, and email modules

Branch: `v2/phase-08-courier-sms-email`. Date: 2026-10-24.

## What was built

Per ADR 0019 (survey found the real gap narrower than, and in one place
more urgent than, the master plan's wishlist — see "Real bugs found"
below):

1. **Fixed a live-site bug: OTP and password-reset codes were never
   delivered.** `requestOtp()`/`requestReset()` generated and stored a
   code correctly but never sent it — the SMS/email call was simply
   missing. `src/server/auth/accounts.ts` now has `deliverCode()`,
   wired into `issueCode()`, sending via SMS when the flow resolved a
   phone and falling back to email for an email-based reset.
2. **Bengali/Unicode SMS support.** `bulksmsbd.ts` always sent
   `type=text` (GSM-7 only) before this phase — any Bengali-language
   SMS template an admin saved would silently garble on delivery, not
   fail loudly. New `needsUnicode()` checks every character against the
   real GSM 03.38 default alphabet and switches to `type=unicode` (UCS-2)
   whenever the body needs it.
3. **Notification idempotency.** New `NotificationDedupe` table +
   `claimNotification()` (same unique-constraint-claim shape Phase 7's
   `claimWebhookEvent` uses), wired into `sendSms`/`sendEmail` via an
   optional `dedupeKey` and into `queueStatusNotice()`'s order-status
   notices — a retried/raced request can't double-send the same
   notice twice.
4. **Template-rendering test coverage.** `fillTemplate()` (admin-editable
   SMS/email templates) and `brandedEmailHtml()` had zero tests before
   this phase; both now have direct unit coverage, including Bengali
   values substituted into an English template and a fully Bengali
   template.
5. **Branded, responsive HTML email.** Every `sendEmail()` call now also
   renders a shared, inline-styled, table-based HTML layout
   (`src/lib/email/template.ts`) alongside the plain-text body it
   already sent — previously `text`-only, so every client capable of
   HTML rendered it as a wall of plain text. Order-status notices get an
   action button linking to `/track-order`, prefilled with the order
   number and phone.
6. **Daily abandoned-cart reminder email.** New
   `src/server/admin/maintenance/abandoned-cart.ts` finds carts quiet
   for 2 hours–7 days with an email on file and sends a reminder, deduped
   per `(cart id, cart's current updatedAt)` so a daily re-run can't
   double-send. Wired into Admin → Maintenance ("Email abandoned carts")
   and a new `POST /api/v1/cron/abandoned-cart` route.
7. **Courier/SMS balance and fraud checks.** `steadfastProvider` gained
   `balance()` and `fraudCheck(phone)`; `bulkSmsBdProvider` gained
   `balance()`. Admin → Settings → Integrations' "Test connection"
   buttons now make a real call instead of logging a no-op: the courier
   test calls Steadfast's balance endpoint, the SMS test appends the
   account's balance to its success message.
8. **Admin notification log viewer.** `SmsLog`/`EmailLog` rows existed
   since early on but had no admin screen — every send or dedupe-skip
   was only inspectable via a raw DB query. New tab at
   `/admin/orders/notification-logs` lists both, most recent first.
9. ADR 0019 (Phase 8 scope — survey-first, same approach as ADRs
   0016–0018).

## Explicitly deferred — blocked on credentials or genuinely out of scope

Per ADR 0019 and CLAUDE.md's stop-and-ask condition 4:

- **Pathao/RedX courier integrations** — Steadfast is the one real,
  working courier provider; each of these needs its own merchant
  credentials this environment doesn't have.
- **Courier/SMS auto-selection rules** — meaningless with exactly one
  working provider per channel; revisit once a second provider exists.
- **Live sandbox verification of the Steadfast balance/fraud-check
  endpoints** — implemented against third-party client documentation
  (explicitly commented as such in `steadfast.ts`), not an official
  published API reference; no live Steadfast account to confirm field
  names against. Same caveat already applied to the pre-existing
  book/status calls.
- **Cart-recovery magic link** — the abandoned-cart email's action
  button links to `/cart`, which only recovers a cart for a session/
  cookie that still has it (a logged-in user, or the same browser that
  built the cart). A tokenized recovery link that works from any device
  would need its own token/schema design; ADR 0019 scoped the email
  trigger itself, not a cart-recovery token system.

## Real bugs found and fixed this phase

1. **OTP/password-reset codes were never delivered** (see "What was
   built" #1) — a real, live-site-breaking bug, found by tracing every
   call site of `issueCode()` before assuming the flow worked, not by
   anything in the master plan's own wishlist pointing at it.
2. **Bengali SMS templates would silently garble** (see #2) —
   `type=text` was hardcoded regardless of body content.
3. **A stale custom `theme.primary` value in this session's local test
   DB** (`#6fa0ce`, saved during earlier manual QA this session) failed
   AA contrast against `TopBar.tsx`'s white text — reproduced 5/5 across
   every key page's a11y run. Not a code bug: the shipped default
   (`#C94607`) is already documented as AA-compliant
   (`src/server/settings/store.ts`'s `themeDefaults` comment), and the
   code already documents that an admin-picked custom color can still
   fail contrast. Fixed by resetting the test DB's `theme` setting back
   to the shipped default — a test-environment data-hygiene fix, not an
   application change.

## Test matrix and results

| Check                                                                  | Result                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                                                              | ✅ pass                                                                                                                                                                                                                                       |
| Lint                                                                   | ✅ pass                                                                                                                                                                                                                                       |
| Unit tests                                                             | ✅ 268/268 pass (32 files; +22 from Phase 7's 246 — SMS unicode detection, branded-email rendering/escaping, abandoned-cart selection, template-rendering coverage)                                                                           |
| Integration tests                                                      | ✅ 28/28 pass (7 files — notification-dedupe claim/concurrent-race/skip-logging coverage added this phase, alongside the pre-existing payment/order/inventory suites)                                                                         |
| E2E critical path (desktop + mobile)                                   | ✅ both pass — COD checkout through to admin seeing the order is unaffected                                                                                                                                                                   |
| a11y (axe, desktop): home/shop/product/login/cart/design-system        | ✅ 6/6 pass (after resetting the stale test-DB theme color above — unrelated to this phase's code)                                                                                                                                            |
| Parity (settings/menus/products/theme/checkout/social/system/tracking) | ✅ 8/8 pass                                                                                                                                                                                                                                   |
| Visual snapshots                                                       | ✅ 2/2 pass                                                                                                                                                                                                                                   |
| Lighthouse                                                             | ✅ performance/a11y/best-practices all pass their `error` thresholds on all 4 URLs; `/checkout`'s SEO score (0.63) stays the documented, by-design `warn` exception for a correctly-`noindex`'d transactional page (unchanged from Phase 6/7) |

Manual QA, this phase's touched surfaces specifically:

- **Notification logs page** (`/admin/orders/notification-logs`):
  verified via a logged-in manager session — both the SMS log and email
  log tables render, including the empty-state message when a table has
  no rows yet.
- **Abandoned-cart cron**: verified `POST /api/v1/cron/abandoned-cart`
  with the real `CRON_SECRET` header returns `{ checked, queued }`
  against the test DB.
- **Branded email**: verified `brandedEmailHtml()` escapes injected HTML
  in a template placeholder (a customer's own entered name flows
  straight into the order-status template via `fillTemplate`) rather
  than rendering it, and renders a fully Bengali body correctly.
- **`/track-order`**, the abandoned-cart and order-status emails' action
  link target: loads and prefills from its `?order=&phone=` query
  params for a guest visitor with no session.

One test-environment artifact encountered and resolved during this
phase's QA, not a regression: this session's own heavy repeated local
E2E/manual testing from `127.0.0.1` had pushed both the per-IP daily
order-fraud guard (`>=5 orders/day/IP`, `src/server/security/fraud.ts`)
and the in-memory login rate limiter (`8 attempts/15min`,
`src/server/security/rate-limit.ts`) past their thresholds mid-QA,
intermittently blocking the mobile E2E critical-path run. Confirmed via
direct code + test-DB inspection (exactly 5 same-day orders from
`127.0.0.1` at the moment of failure) rather than guessed; resolved by
clearing that day's test-only order rows and restarting the test server
process (which holds the rate limiter's in-memory state) — not an
application change, same class of artifact already documented for
Phase 7's login-rate-limiter false alarms.

## Known limitations

- **No cart-recovery token** — see "Explicitly deferred" above; the
  abandoned-cart email's "Return to your cart" link only works for a
  session/cookie that still holds the cart.
- **Steadfast balance/fraud-check field names are unverified against a
  live account** — see "Explicitly deferred" above.
- **SMS/email templates stay plain-English-string defaults, not routed
  through next-intl** — this matches the pre-existing pattern
  (`notify.ts`'s `defaults`, `accounts.ts`'s `CODE_MESSAGES`) rather than
  a new gap introduced this phase: these are admin-editable free-text
  templates sent to a customer's phone/inbox, not UI strings rendered in
  the app's own locale switcher, so next-intl's locale-keyed JSON files
  don't fit how they're already edited and stored.

## Deploy notes

- **New migration** (already applied, `20261024020000_notification_dedupe`):
  new `NotificationDedupe` table.
- **No new required env vars.**
- **New cron job**: `POST /api/v1/cron/abandoned-cart`, daily at 10am —
  added to `DEPLOYMENT.md`'s cron list.
- **Action needed from the human**: none to merge this phase. Before the
  first real deploy, consider reviewing the abandoned-cart email's
  default copy/timing (2h–7d window) and, if a second courier or SMS
  provider is ever added, revisit the "deferred: auto-selection rules"
  item above.

## Summary

Phase 8 (Courier, SMS, and email modules): fixed a real, live-site
OTP/password-reset delivery bug found by tracing call sites rather than
trusting the master plan's framing of this phase as pure "provider
polish"; added Bengali-safe SMS encoding, notification idempotency,
branded HTML email with a new abandoned-cart reminder cron, courier/SMS
balance and fraud-check calls wired into real "Test connection" buttons,
and the missing SMS/email admin log viewer. Pathao/RedX and
auto-selection rules stay explicitly deferred pending credentials or a
second provider to choose between.

`npm run verify` green (typecheck, lint, 268/268 unit), 28/28 integration
tests, E2E critical path clean (desktop + mobile), a11y 6/6, parity 8/8,
visual 2/2, Lighthouse green on its `error`-level thresholds. Full test
matrix and known limitations above.

Per the standing no-per-phase-PR workflow (2026-10-23): branch pushed, no
PR opened, proceeding straight into Phase 9 (Facebook/Meta module).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
