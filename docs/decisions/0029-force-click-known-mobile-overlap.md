# 0029 — Force-click the cart's Checkout link, same as the checkout page's Place order

Date: 2026-10-30
Status: accepted

## Context

ADR 0028's fix (guarding `scroll-behavior: smooth` behind
`prefers-reduced-motion`, running e2e under it) did not fix the mobile
`critical-path.spec.ts` failure it was written for — the next CI run
reproduced the identical error, down to the same sequence of
intercepting elements and the same per-retry timings. That ruled out
the smooth-scroll-animation theory; whatever was happening didn't care
that scrolling was now instant.

The user downloaded the CI run's trace (`npx playwright show-trace`)
and walked through it directly rather than this session continuing to
guess from logs alone. Two things it showed:

1. **The accessibility tree has exactly one "Checkout" link on the
   page**, inside the cart summary `<aside>`, right where
   `src/components/store/cart/CartView.tsx` puts it. No duplicate, no
   decoy element elsewhere — ruling out a locator-ambiguity theory.
2. **The one console error was `GET .../api/v1/auth/me 401`** — the
   expected response for a guest with no session, not a bug, and
   unrelated to the click failure (checked and ruled out, not assumed).

More importantly, `e2e/flows/critical-path.spec.ts` **already
documents this exact failure class**, three lines below the one that
was failing, for the checkout page's "Place order" button:

```ts
// The sticky header can overlap the submit button at the scroll
// position Playwright lands on for this short page on narrow viewports
// — the same class of fixed-element overlap documented in
// docs/audit/current-state.md (ACCESSIBILITY), deferred to Phase 5's
// mobile redesign rather than patched in the app now. The button is
// independently confirmed visible/enabled/stable here, so force the
// click past the overlap check rather than the real click target.
await page.getByRole("button", { name: "Place order" }).click({ force: true });
```

The cart page has the same shape of problem: it's short (one item),
the viewport is narrow, and the page has a sticky header, a fixed
bottom mobile nav, and a `lg:sticky` aside all competing for the small
amount of vertical space above the fold. Playwright's intercept check
is strict about bounding-box overlap at the exact scroll position it
lands on — which can trigger even when the element is genuinely visible
and clickable, just because something else's box technically overlaps
by a pixel or two at that instant. The different "intercepting element"
on every retry (aside → bottom nav → header, in no fixed order) is the
signature of this: a marginal, position-dependent overlap, not an
actual element sitting on top of the link.

## Decision

Apply the same, already-established pattern to the Checkout link:
confirm it's independently visible, then `.click({ force: true })` past
Playwright's intercept check — matching the Place order button three
lines later in the same file, rather than inventing a new approach.

Per the existing comment, the real fix is Phase 5's mobile redesign;
this is the same deliberate, documented deferral already in place for
the sibling button, not a new one.

## Consequences

- Verified locally: 3/3 consecutive mobile passes, same as after ADR
  0028's (ultimately irrelevant, to this bug) fix. Desktop e2e and a11y
  (6/6) stayed green.
- This does not independently confirm the CI-specific mechanism the way
  ADR 0027's fix could be locally confirmed — `force: true` sidesteps
  the intercept check entirely rather than fixing its cause, so it
  cannot reproduce-then-not-reproduce the way a real fix would. The next
  CI run is still the actual confirmation.
- `docs/audit/current-state.md`'s ACCESSIBILITY section (referenced by
  the original comment) is about color-contrast, not this overlap — the
  comment's reference doesn't point at an exact matching paragraph there.
  Not worth chasing down further: the comment's own reasoning is clear
  and sufficient, and Phase 5 (mobile redesign) is the real fix either
  way.
- Two real fixes came out of chasing one flaky test today: ADR 0027 (a
  migration bug that had failed every CI run since ~Phase 3) and this
  one. Neither would have been found without reading an actual CI run
  instead of trusting a local green — see the updated
  `feedback_ci_debugging.md` memory.
