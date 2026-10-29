# Phase 5 QA report: Storefront rebuild

Branch: `v2/phase-05-storefront-rebuild`. Date: 2026-10-23.

## What was built

Per ADR 0016's scope (real design-system adoption on the pages customers
actually spend the most time on, not a literal rebuild of every exotic
homepage section type from the master plan's §5 wishlist):

1. **Homepage** (`src/app/[locale]/(store)/page.tsx` and new
   `home/CategoryRibbon.tsx`, `home/SideBanners.tsx`, `home/TrustStrip.tsx`,
   `home/BlogTeaser.tsx`) — every section rebuilt on `components/motion`
   (`Reveal`, `Stagger`, `Marquee` for the category ribbon) and
   `components/ui`. Hero slider paints its first slide at full opacity
   (LCP), pauses autoplay on hover/focus, and gets a gradient overlay at
   least as dark as the old flat one. Admin-driven section ordering is
   unchanged.
2. **Shop/category/brand listing** (`shop/ProductListing.tsx` + new
   `shop/FilterForm.tsx`, `shop/MobileFilters.tsx`, `shop/activeFilters.ts`) —
   a real mobile filter bottom sheet (`components/ui`'s `Sheet`) replacing
   the plain responsive grid's only-ever mobile treatment, and a sticky
   desktop filter sidebar. URL-driven filtering is unchanged.
3. **Product detail** (new `product/ProductGallery.tsx`, `GalleryZoom.tsx`,
   `SlideNav.tsx`, `useSwipe.ts`, `StickyBuyBar.tsx`) — swipeable gallery,
   a mobile sticky buy bar that only becomes reachable once the main buy
   row has scrolled above the fold (`inert` otherwise, so there's never a
   second "Add to cart" in the accessibility tree), fly-to-cart, `Tabs`.
4. **Cart** (`layout/CartDrawer.tsx` rebuilt on `Sheet`, new
   `cart/FreeDeliveryProgress.tsx`, `cart/QuantityStepper.tsx`) — a
   free-delivery progress bar reading the same `delivery.freeFrom` setting
   the server's checkout pricing uses, shown only when the client-side
   threshold fetch succeeds.
5. **Checkout** (`checkout/CheckoutForm.tsx` + new `ChoiceCard.tsx`,
   `CheckoutSummary.tsx`, `usePaymentChoices.tsx`) — `components/ui` visual
   polish (payment-method cards, `Input`/`Select`/`Button`) with the
   underlying form's data flow byte-identical to before (verified by diff
   against the pre-Phase-5 original): same `register(...)` calls, same
   `useCheckoutQuote` wiring, same submit logic.
6. **Order success, account, wishlist, compare** — `components/ui`
   adoption, a reduced-motion-respecting celebration on order success, a
   new `account/OrderTimeline.tsx`, `AccountForms.tsx` split into
   `AddressBook.tsx`/`ProfileForm.tsx`/`PasswordForm.tsx`, a usable
   side-by-side compare table at 360px.
7. **`/videos` gallery** — a real storefront route that didn't exist
   before (only an admin content screen for the homepage teaser did): a
   grid of every active `HomeVideo`, each opening a `Dialog` lightbox over
   the existing `YouTubeEmbed`. Simplified from ADR 0016's original
   "category tabs" text once the real `HomeVideo` schema turned out to
   have no category field to tab by (corrected in the ADR).
8. **404/500 reskin** — the storefront's `not-found.tsx`/`error.tsx` swapped
   the legacy `buttonClass` helper for the real `components/ui` `buttonStyles`;
   the two intentionally design-system-free root fallbacks
   (`src/app/not-found.tsx`, `src/app/global-error.tsx` — deliberately
   dependency-free for when even locale/layout machinery is broken) had
   their hardcoded brand hex updated to match Phase 4's AA-compliant value.

Built across 3 parallel background-agent worktree slices (homepage/listing;
product/cart; checkout/account/wishlist/compare) plus the `/videos` gallery
and error-page work done directly. Each agent's uncommitted or committed
work was integrated and re-verified against the main repo's install before
being folded into the branch — see "Integration notes" below for two
agents whose `node_modules`/worktree state didn't survive the hand-back.

## Real bugs found and fixed this phase

1. **`Reveal`/`Stagger`'s hidden state was axe-visible and tab-reachable.**
   The shared `revealVariants()` only set `opacity: 0` for not-yet-revealed
   content, which keeps it in the accessibility tree (axe can still compute
   a contrast ratio against it) and in the tab order. Surfaced by Phase 5
   turning scroll-reveal on for the shop listing grid for the first time:
   axe flagged a below-the-fold `ProductCard`'s price/rating text as a
   **serious color-contrast violation** (effectively invisible text
   composited through its own zero opacity against the page background).
   Fixed by adding `visibility: hidden`/`visible` alongside `opacity` to
   the shared variants (`src/components/motion/variants.ts`) — the same
   `inert`-style exclusion already used for the sticky buy bar. This was a
   latent bug since Phase 4 introduced `Reveal`/`Stagger`, just not
   previously exercised by a grid long enough to have off-screen items.
2. **Lighthouse's error-level enforcement**, left as `warn` by Phase 4's
   own comment pending this phase, is now flipped on for performance/
   accessibility/best-practices (see Lighthouse row below).

## Integration notes (parallel agents)

Two of the three background agents reported finishing work that, on
resumption, they had no memory of having done — in both cases the
commits/files were still verifiably present in their worktree's `git log`
(confirmed independently, not taken on the agent's word) and were already
integrated before the confused follow-up message arrived. No actual data
was lost; this looks like a resumption-identity quirk in how the agent
runtime reconnects to a worktree, not a real error — noted here in case it
recurs in a later phase.

A third agent's worktree had a broken `node_modules` install
(`eslint-config-next` failed to load, from its own `npm ci`), which hung
its internal `verify` step for several hours with no commits produced. Its
uncommitted files were copied directly into the main repo and verified
there instead; the two agents' locale-key additions that had already
landed were merged in by hand (not overwritten) against this agent's own
(separately diffed) locale additions, to avoid clobbering either.

## Test matrix and results

| Check                                                               | Result                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                                                           | ✅ pass                                                                                                                                                                                                                                                                                           |
| Lint                                                                | ✅ pass                                                                                                                                                                                                                                                                                           |
| Unit tests                                                          | ✅ 219/219 pass (24 files; +10 from Phase 4's 209 — `useSwipe`, `activeFilters`, the `visibility` regression test)                                                                                                                                                                                |
| Integration tests                                                   | ✅ 15/15 pass (unaffected by this phase)                                                                                                                                                                                                                                                          |
| E2E critical path (desktop)                                         | ✅ pass — browse → cart → checkout (COD) → admin sees the order, against the rebuilt UI                                                                                                                                                                                                           |
| E2E critical path (mobile)                                          | ✅ pass — confirms the sticky buy bar's `inert` handling and fly-to-cart timing don't break the strict `"Add to cart"` selector                                                                                                                                                                   |
| **a11y (axe, desktop)**: home/shop/product/login/cart/design-system | ✅ **6/6 pass** — shop failed once (the `Reveal`/`Stagger` bug above) before the fix                                                                                                                                                                                                              |
| Visual snapshots                                                    | ✅ 2/2 — `/_design` unchanged; homepage re-baselined for the intentional hero redesign (reviewed the diff by hand before regenerating: new hero layout, decorative rings, no layout break)                                                                                                        |
| Parity (settings/menus/products)                                    | ✅ 3/3 pass                                                                                                                                                                                                                                                                                       |
| Lighthouse                                                          | ✅ performance/accessibility/best-practices now enforced as **error** (flipped per `lighthouserc.js`'s own comment); ⚠️ same pre-existing, non-regressing `/checkout` SEO warning (0.63 — the page is correctly `noindex`'d, which Lighthouse's `is-crawlable` audit always penalizes; not a gap) |

## Manual QA

- Mobile filter sheet on `/shop` at 360px: opened via keyboard (`Tab` to
  the trigger, `Enter`), confirmed focus lands inside the native `<dialog>`
  (via `showModal()`'s built-in focus containment), closed via `Escape`.
- Homepage in Bengali (`/bn`) under simulated `prefers-reduced-motion:
reduce`: `lang="bn"` set correctly, UI chrome strings translated
  ("Categories" → "ক্যাটাগরি", "Shop now" → "এখনই কিনুন"), no console/page
  errors. (The hero's own headline text is admin-entered banner content,
  not a translation key — it's in English only because the local dev DB's
  seed banner happens to be, not a Phase 5 gap.)
- Product page at 360px: confirmed exactly one `"Add to cart"` button is
  reachable in the accessibility tree before scrolling (the sticky bar's
  duplicate stays `inert` until the main buy row scrolls off-screen).
- Hit, diagnosed, and fixed an environment issue while running this QA: a
  stale `node.exe` process survived multiple `kill`/`pkill` attempts
  because git-bash's `ps`-reported PIDs didn't match the real Windows PID
  holding port 3100 (found via `netstat -ano`). That stale process was
  serving requests against an in-memory module cache that didn't match
  the (repeatedly rebuilt) `.next` output on disk, intermittently
  500'ing `/` and `/shop` with a "module not found in the React Client
  Manifest" error that looked like a real app bug until traced to the
  process itself. Killed via `taskkill //F //PID <real-pid>`; not a code
  issue, but worth remembering for the next session on this machine.

## Known limitations

- **Checkout's live-quote behavior with a real cart** wasn't exercised by
  every contributing agent in isolation (one worked without a dev DB) —
  covered instead by the integrated E2E critical-path run against the
  real test DB, which exercises exactly that path end-to-end.
- **`/track-order`** is unchanged this phase; its form/timeline live in
  `TrackOrderForm.tsx`, which wasn't in any agent's file list. It could
  reuse the new `account/OrderTimeline.tsx` in a later pass.
- **No upsell suggestions or add-to-cart haptics** (§4.4) — out of this
  phase's scope per ADR 0016.
- **The bento grid's "trending in your city" tile, MySQL FULLTEXT search,
  PWA, and a true admin section-type builder** — all explicitly deferred
  per ADR 0016, tracked there rather than silently dropped.

## Deploy notes

- **No new dependencies.**
- **No new migrations, no new env vars, no new cron jobs.**
- **Action needed from the human**: none for this phase specifically; the
  Lighthouse CI enforcement flip (warn → error for 3 categories) means a
  future PR that regresses performance/a11y/best-practices on one of the
  4 budgeted URLs will now fail CI rather than just warn.

## Summary

Phase 5 (Storefront rebuild): adopts `components/ui`/`components/motion`
across the real customer journey (homepage, listing, product, cart,
checkout, account, order success, wishlist/compare), per ADR 0016's scope.
Builds the `/videos` gallery as a real storefront route for the first
time. Fixes a real, previously-latent accessibility bug in the shared
`Reveal`/`Stagger` primitives (not-yet-revealed content was both
axe-contrast-visible and keyboard-tab-reachable) and flips Lighthouse's
performance/a11y/best-practices budgets from `warn` to `error` now that
the rebuild they were gating is complete.

`npm run verify:full` green end-to-end: 219/219 unit, 15/15 integration,
2/2 critical-path E2E (desktop+mobile), 6/6 a11y, 2/2 visual, 3/3 parity,
Lighthouse clean except the pre-existing, by-design `/checkout` SEO
warning. Full test matrix and known limitations above.

Per the standing no-per-phase-PR workflow (2026-10-23): branch pushed,
no PR opened, proceeding straight into Phase 6 (Admin panel rebuild).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
