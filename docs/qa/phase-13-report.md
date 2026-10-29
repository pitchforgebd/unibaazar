# Phase 13 QA report: pre-launch correctness fixes

Branch: `v2/phase-12-hardening` (continues the chain). Date: 2026-10-29.

First phase past the master plan's Phase 12 — see
`docs/post-launch-plan.md` for how 13–18 are laid out.

## What was done

### Rate limits and order caps keyed on identity, not IP (ADR 0024)

Every write guard was keyed on client IP alone, which is the wrong key
for this market. Bangladesh's mobile carriers put very large numbers of
subscribers behind one CGNAT IPv4, so:

- `ordersFromIpToday >= 5` refused the **6th order of the day from an
  entire carrier's NAT pool** — with a fraud message, so it would have
  read as an attack rather than lost revenue.
- `otp: 5 / 15 min / IP` throttled **logins**, and OTP is the primary
  sign-in method here.

Now two-tier: the tight limit keys on the identity being acted on (the
phone or email in the request, SHA-256 hashed so the limiter table holds
no raw PII), and the per-IP limit stays as a loose flood backstop.

|            | per-identity | per-IP backstop |
| ---------- | ------------ | --------------- |
| login      | 8 / 15 min   | 80 / 15 min     |
| otp        | 5 / 15 min   | 60 / 15 min     |
| checkout   | 6 / hour     | 100 / hour      |
| contact    | 5 / hour     | 40 / hour       |
| newsletter | 3 / hour     | 40 / hour       |

Daily order caps: **phone 5**, **device 5**, **IP 40** (was IP 5).

Every route that already knew the identity now passes it — login, OTP
request and verify, forgot, reset, register, checkout (`order.phone`),
contact, newsletter.

### `clientIp()` no longer trusts client-supplied headers (ADR 0024)

It read the **leftmost** `X-Forwarded-For` entry, which is whatever the
client sent — so anyone could choose their own rate-limit key to evade a
limit, or spend someone else's budget to lock them out. It now counts
`TRUSTED_PROXY_HOPS` (default 1, this host's Apache reverse proxy) from
the right and ignores anything further left.

## Not done — blocked on a fact only the human has

`hasMerchantReturnPolicy` JSON-LD needs the real return window in days.
Still not invented: structured data contradicting the actual
return-policy page is a Google policy violation, which is worse than
omitting the field (ADR 0022). Carried to the Phase 13 line in
`docs/post-launch-plan.md`.

## Test matrix and results

| Check                                           | Result                                                                                                                                        |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                                       | ✅ pass                                                                                                                                       |
| Lint                                            | ✅ pass                                                                                                                                       |
| Unit tests                                      | ✅ 325/325 (38 files; +7 — the cap split and the `X-Forwarded-For` spoofing fix are both pinned so the rule can't quietly revert to IP-first) |
| Integration tests                               | ✅ 42/42 (11 files)                                                                                                                           |
| E2E critical path — Chromium desktop + mobile   | ✅ 1/1 each                                                                                                                                   |
| E2E critical path — WebKit, iOS Safari, Firefox | ✅ 3/3                                                                                                                                        |
| a11y (axe)                                      | ✅ 6/6                                                                                                                                        |
| Parity                                          | ✅ 8/8                                                                                                                                        |
| Visual snapshots                                | ✅ 2/2                                                                                                                                        |
| **Full browser matrix, no manual intervention** | ✅ 21/21                                                                                                                                      |

### Behavioural verification against the running server

Unit tests pin the rules; these prove the thing actually works end to
end, which is what the phase is for:

| Probe                                            | Result                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| 8 OTP requests, **same** phone                   | `200 200 200 200 200 429 429 429` — account targeting still blocked at 5     |
| 12 OTP requests, **12 different** phones, one IP | all `200` — under the old rule 6–12 were `429`, i.e. real customers refused  |
| Flood with unique phones from one IP             | first `429` at request **#61**, matching the configured 60 — backstop intact |

## Known limitations

- **The per-IP ceilings are a judgement call, not a measurement.** They
  are set roughly an order of magnitude above the per-identity limit. If
  real traffic ever trips them, raise them — the per-identity tier is
  what provides the actual protection.
- **An attacker with many phone numbers now gets more total attempts**
  (60/15 min of OTP per IP vs 5). Deliberate: the old setting bought
  that narrow protection by refusing real customers, and Turnstile plus
  the per-identity cap are the right tools for breadth.
- **`TRUSTED_PROXY_HOPS` must be raised if a CDN or extra proxy is ever
  put in front**, or `clientIp()` returns the CDN's address and the
  per-IP backstop collapses into one shared bucket. Flagged in Phase 15
  of the post-launch plan, since the real host is the only place to
  confirm it.

## Deploy notes

- **No new migration** (reuses Phase 12's `RateLimitHit` table).
- **One new optional env var**: `TRUSTED_PROXY_HOPS`, default `1`, which
  is correct for this host. Nothing to set unless the topology changes.
- **No new cron jobs.**

## Summary

Phase 13 fixed the one thing I would not have wanted to discover after
launch: limits tuned for a world without carrier NAT, on a store whose
customers mostly arrive through carrier NAT. The 6th order of the day
from a whole mobile network would have been refused as fraud, and OTP
logins throttled at peak. Both now key on the customer's identity, with
IP demoted to a flood backstop — verified behaviourally, not just
asserted. The `X-Forwarded-For` spoofing hole found alongside it is
closed too.

Next: **Phase 14 needs a production dump** to run the migration
rehearsal, which is the gate that closes Phase 12 and clears the way to
merge and deploy.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
