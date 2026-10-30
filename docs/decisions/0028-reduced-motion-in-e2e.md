# 0028 — Run e2e under `prefers-reduced-motion: reduce`; stop shipping unguarded smooth-scroll

Date: 2026-10-30
Status: accepted

## Context

With ADR 0027's migration fix letting CI actually reach the test suite,
`verify`'s mobile e2e run failed:
`e2e/flows/critical-path.spec.ts`'s cart → checkout click timed out,
with Playwright reporting a **different** intercepting element on each
retry — the fixed bottom mobile nav, then the cart summary `<aside>`
(the Checkout link's own parent), then the sticky header. The desktop
project passed; only mobile needs a real scroll to reach the Checkout
button.

Cause: `src/styles/globals.css` set `scroll-behavior: smooth` on `html`
unconditionally, with no `prefers-reduced-motion` guard. Playwright's
`.click()` auto-scrolls the target into view; with smooth scrolling
enabled, that scroll animates over several frames instead of jumping
instantly, so the target's on-screen position keeps moving while
Playwright waits for it to "stabilize." Whichever fixed/sticky element
happens to be geometrically on top of it at that instant intercepts the
click — a different one on each retry, because each retry's timing
differs slightly.

This was unguarded motion was also a real accessibility gap on its own,
independent of the test flakiness it caused: `prefers-reduced-motion:
reduce` exists specifically so vestibular-disorder users can turn
scroll animation off, and this ignored it. The project already has an
established pattern for this everywhere else —
`src/components/motion/{Marquee,Shimmer}.tsx` and
`usePrefersReducedMotion.ts` all gate on the media query — `globals.css`
was the one place that didn't.

## Decision

Two changes, addressing cause and effect:

1. **`src/styles/globals.css`**: moved `scroll-behavior: smooth` inside
   `@media (prefers-reduced-motion: no-preference)`, so it only applies
   when the visitor hasn't asked for reduced motion — matching the
   pattern used everywhere else in the codebase.
2. **`playwright.config.ts`**: added `reducedMotion: "reduce"` to the
   shared `use` block, so **every** project (desktop, mobile, and the
   cross-browser webkit/mobile-safari/firefox ones) runs under it.

Playwright's own default is `reducedMotion: "no-preference"` — it does
not request reduced motion unless told to — so (1) alone would not have
fixed the flaky test; Playwright still needed telling.

(2) is not only a flakiness fix. `CLAUDE.md`'s end-of-phase manual QA
checklist already calls for testing under `prefers-reduced-motion` by
hand, every phase. Running the whole e2e suite under it automatically
means that checklist item is now continuously covered rather than
relying on someone remembering to do it manually, and any future
unguarded animation that breaks under reduced motion — not just this
one — gets caught the same way.

## Consequences

- Verified locally: the mobile critical-path test passed 3/3 consecutive
  runs after the fix (it had failed 3/3 — the original attempt plus two
  retries — before it, on the exact same machine). Desktop e2e, a11y
  (6/6), and parity (8/8) all stayed green under the new
  `reducedMotion: "reduce"` default, so nothing in the existing suite
  relied on an animation actually completing.
- Unlike ADR 0027's case-sensitivity bug, this one **is** fully
  verifiable locally — it's a browser-engine behavior, not an
  OS/MySQL-config difference, so a local pass here is real evidence, not
  just a hopeful sign pending the next CI run.
- If a future animation is added without a `prefers-reduced-motion`
  guard, e2e now has a chance of catching it (if it's load-bearing
  enough to affect element positioning/timing during a test), but this
  is not a substitute for actually checking new motion work by hand —
  it only catches animations that happen to intersect with something a
  test clicks or asserts on.
