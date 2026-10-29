# 0024: Rate limits and order caps keyed on identity, not IP

## Context

Every write guard in this app was keyed on the client IP alone:

```
login:    8  / 15 min / IP
otp:      5  / 15 min / IP
checkout: 10 / hour   / IP
contact:  5  / hour   / IP
newsletter: 5 / hour  / IP

fraud: ordersFromIpToday >= 5 || ordersFromDeviceToday >= 5  → order refused
```

Those numbers are reasonable for a market where one IP means roughly one
household. They are **wrong for this one**. Bangladesh's mobile networks
— GP, Robi, Banglalink, which is how most of this store's customers will
browse — put very large numbers of subscribers behind a single CGNAT
IPv4. Under that topology an IP-keyed counter doesn't measure "one
person trying too often", it measures "how busy this carrier's NAT pool
is right now".

The concrete consequences on a live store:

- **`ordersFromIpToday >= 5` blocks revenue.** The 6th order of the day
  from an entire carrier NAT pool is refused with "Too many orders from
  this connection today." Nothing in the logs says "capacity problem" —
  it reads as fraud, so it would likely have gone unnoticed for a while.
- **`otp: 5 / 15 min / IP` blocks logins.** OTP is the primary sign-in
  method here, so at peak a shared carrier IP exhausts the budget and
  real customers can't get a code.

A second, unrelated problem in the same code: `clientIp()` read the
**leftmost** `X-Forwarded-For` entry, which is whatever the client sent.
That let anyone choose their own rate-limit key — to evade a limit, or
to spend someone else's budget and lock them out.

Found while answering "can we go live?" rather than by a test, because
no test can tell you a threshold is wrong for a market.

## Decision

**Key the tight limit on the identity being acted on; keep IP only as a
flood backstop.**

```
                  per-identity        per-IP (backstop)
login:            8  / 15 min         80 / 15 min
otp:              5  / 15 min         60 / 15 min
checkout:         6  / hour          100 / hour
contact:          5  / hour           40 / hour
newsletter:       3  / hour           40 / hour

fraud daily order caps:
  phone   5   ← the real per-buyer identity for a COD, phone-account store
  device  5   ← ub_device cookie, per browser
  ip     40   ← loose; one host flooding checkout, not one buyer
```

`guardWrite()` takes an optional `identity` (the phone or email the
request acts on) and enforces both tiers. Every route that already knew
the identity now passes it: login, OTP request/verify, forgot, reset,
register, checkout (`order.phone`), contact, newsletter. Routes that
don't know one fall back to the per-IP backstop alone.

Identities are **hashed** (SHA-256) before becoming a bucket key, so the
`RateLimitHit` table never stores a raw phone number or email.

`clientIp()` now counts `TRUSTED_PROXY_HOPS` (default 1, this host's
cPanel/Apache reverse proxy) from the **right** of `X-Forwarded-For`,
ignoring anything further left as client-controlled.

## Why these numbers

The per-identity numbers are the _old_ per-IP numbers, near enough —
they were always sensible limits for one actor, which is what an
identity key actually measures. `checkout` tightened from 10 to 6 and
`newsletter` from 5 to 3 because per-identity they can afford to be
stricter than they were per-IP.

The per-IP ceilings are set roughly an order of magnitude above the
identity limit: high enough that a busy carrier NAT pool never reaches
them, low enough to still stop a single host hammering an endpoint. They
are a judgement call, not a measurement — if real traffic ever trips
them, raise them; the per-identity tier is what provides the actual
protection.

## Verified behaviourally, not just by unit test

Against the running server:

- 8 OTP requests for the **same** phone → `200 200 200 200 200 429 429 429`.
  Account targeting still blocked at 5.
- 12 OTP requests for **12 different** phones from one IP → all `200`.
  Under the old rule, requests 6–12 would have been `429` — exactly the
  customers CGNAT would have cost us.
- Flooding with unique phones from one IP → first `429` at request
  **#61**, matching the configured 60. The backstop still works.

`decideFraud`'s cap split and `clientIp`'s spoofing fix are pinned by
unit tests in `src/server/security/security.test.ts` so the rule can't
quietly revert to IP-first.

## Consequences

- An attacker who controls many phone numbers gets more total attempts
  than before (60/15min of OTP per IP vs 5). That is the deliberate
  trade: the previous setting bought that narrow protection by refusing
  real customers, and captcha (Turnstile, already wired) plus the
  per-identity cap are the right tools for credential-stuffing breadth.
- `TRUSTED_PROXY_HOPS` is a new optional env var. Default 1 is correct
  for this host. **If the app is ever put behind an extra proxy or CDN,
  this must be increased**, or `clientIp()` will return the CDN's
  address and the per-IP backstop will collapse into a single shared
  bucket.
- Order caps now need three queries instead of two (a per-phone
  same-day count added). All indexed, on the checkout path only.
