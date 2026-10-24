# 0019: Phase 8 scope — a live-site bug takes priority over the rest of the wishlist

## Context

The master plan's Phase 8 bullet list: a `CourierProvider` interface
(Steadfast first, then Pathao and RedX — single and bulk booking, status
webhook, balance, fraud check, auto-selection rules, customer-visible
tracking links, a cron sync fallback); an `SmsProvider` interface (one BD
provider — templates with variables, Unicode Bengali, a log, a balance
check, a test-send button); SMTP email (branded responsive templates for
order lifecycle/password reset/abandoned cart, a log, a test-send
button); an admin section per channel with status/settings/logs/health;
"done when" webhook signature tests pass, template rendering is tested
in both languages, and every send is idempotent.

A survey (same approach as ADRs 0016–0018) found real, working
infrastructure for all three channels — and one serious, live-site bug.

### The bug, found first, fixed first

`requestOtp()`/`requestReset()` (`src/server/auth/accounts.ts`) generate
and store a real verification code correctly, but **never actually send
it anywhere**. The only place the code leaves the server is a
`previewCode` field the API routes
(`src/app/api/v1/auth/{otp,forgot}/route.ts`) attach to the JSON response
**only when `NODE_ENV !== "production"`**. In production, a real
customer requesting an OTP login or a password reset gets
`{ sent: true }` and then nothing — the code never reaches their phone or
email. Both flows are completely non-functional for real users on the
live site today. `sendSms`/`sendEmail` and the `SmsProvider`/mailer
infrastructure these need already exist and work (proven by the admin
"Test SMS"/"Test email" buttons in Settings → Integrations, built in an
earlier phase) — they just were never wired into these two call sites.
Fixed first, directly, ahead of everything else below.

### What else the survey found

- **Courier**: `src/lib/courier/steadfast.ts` already does real
  single-order booking and status lookup, with credentials correctly
  sourced from the encrypted admin-settings system (same pattern Phase 7
  gave SSLCommerz). The webhook handler
  (`src/server/courier/webhook.ts`) already has signature verification,
  health tracking (consecutive-failure detection), and logging — more
  mature than the plan's bullet implies. Missing: bulk booking, a
  balance check, a fraud check (Steadfast's API has real endpoints for
  both, reachable with the same credentials already configured — not a
  credential gap). Pathao and RedX have zero code and would need their
  own separate merchant credentials.
- **SMS**: `src/lib/sms/bulksmsbd.ts` works, same encrypted-settings
  credential pattern, already logs to `SmsLog`. Two real bugs: it
  hardcodes `type: "text"` (GSM-7 encoding) on every send — Bengali text
  in that encoding fails or garbles, so the plan's explicit "Unicode
  Bengali" requirement isn't actually met; and there's no balance-check
  endpoint. No admin UI to browse `SmsLog`.
- **Email**: `src/lib/email/mailer.ts` works, same credential pattern,
  logs to `EmailLog` — but sends **plain text only**, and there is
  exactly one template (order-status change, shared by `notify.ts`),
  not separate password-reset or abandoned-cart templates. No admin UI
  to browse `EmailLog`.
- **Idempotency**: `queueStatusNotice()` (the one place that sends a
  real customer-facing SMS+email today) has no dedup guard — a retried
  or raced call sends twice. The plan's "done when" explicitly asks for
  idempotent sends.
- **Template tests**: zero test coverage for `fillTemplate()` or
  Bengali-content rendering — the plan's other explicit "done when" bar.

## Decision

**Fixed directly first, correctness-critical, no credentials needed:**

1. Wire real SMS/email delivery into `requestOtp()`/`requestReset()` —
   the live-site bug above.
2. Bengali/Unicode-aware SMS sending — detect non-GSM-7 content and send
   with BulkSMSBD's `type: "unicode"` instead of always `"text"`.
3. Idempotency key on notification sends (same `claimWebhookEvent()`-
   style unique-constraint guard Phase 7 built for payment webhooks,
   reused here for outbound notices).
4. Unit tests for `fillTemplate()`/notice rendering in English and
   Bengali — closes the plan's "done when" bar directly.

**Built this phase, using credentials already configured:**

5. Steadfast bulk booking, balance check, fraud check.
6. SMS balance check (BulkSMSBD has a real balance endpoint).
7. Admin log viewers for `SmsLog`/`EmailLog` (status, recipient, provider
   response), alongside the existing settings/test-send/webhook-health
   screens — not a new "per-channel admin section" from scratch, since
   settings/status/test-send already exist; this adds the missing "logs"
   piece.
8. Branded HTML email (a shared layout, not raw plain text) and
   distinct templates for password-reset and abandoned-cart, alongside
   the existing order-lifecycle one. Abandoned-cart email needs a
   trigger: a new daily cron (same shape as Phase 7's reconciliation
   job) that finds carts abandoned past a threshold and haven't already
   been emailed, reusing `listAbandonedCarts()` (already built, Phase 6)
   for the detection query.

**Explicitly deferred, blocked on credentials I don't have:**

- **Pathao and RedX courier integrations** — each needs its own merchant
  sandbox/production credentials. The `CourierProvider` interface
  already exists (`src/lib/courier/types.ts`) and Steadfast already
  implements it; adding a provider later is additive, not a rearchitect.
- **Auto-selection rules between couriers** — meaningless with exactly
  one working provider; revisit once a second one is implemented.
- **Live verification that BulkSMSBD's balance/unicode endpoints behave
  as documented** — built against their published API shape (same
  caveat the existing code already carries: "sourced from third-party
  client docs, not an official page"), not verified against a live
  account I don't have access to.

## Consequences

- The live-site bug is the headline of this phase, not a footnote — real
  customers could not complete OTP login or password reset before this
  fix landed.
- Same shape as Phases 5–7: a real survey before code, scope narrowed to
  what's genuinely missing or broken, deferred items tied to a named
  credential gap rather than silently dropped.
- Pathao/RedX stay a clean drop-in for whenever their credentials exist,
  since the provider interface was already built correctly.
