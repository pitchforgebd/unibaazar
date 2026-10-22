# Phase 4 QA report: Design system and motion system

Branch: `v2/phase-04-design-system`. Date: 2026-10-22.

## What was built

1. **Theme tokens and 4 presets** (`src/lib/theme/`) — Bazaar (default,
   orange), Luxe (dark, gold), Fresh (green), Tech (blue), each a set of
   CSS custom properties reusing the existing semantic Tailwind color
   names (`primary`, `ink`, `page`, `card`, `foreground`, `muted`) plus
   one new one (`accent`). `tailwind.config.ts`'s colors all resolve
   through `rgb(var(--color-x) / <alpha-value>)` so opacity modifiers
   (`bg-primary/10`) keep working across ~15 existing call sites.
   `styleTag.ts` renders the active preset as a per-request `<style>` tag
   in `src/app/[locale]/layout.tsx`, read from the admin's saved
   `theme.presetId` — switching presets is live on the next page load,
   no rebuild. Admin keeps a static fallback and never re-skins.
2. **Admin → Settings → Theme**: a new `ThemePresetPicker` — swatch
   picker with a real, live-updating mini component preview (scoped via
   inline CSS variables), applying immediately via the existing
   `themeAction`.
3. **`src/components/ui/`**: Button, IconButton, Input, Textarea, Select,
   Checkbox, RadioGroup/Radio, Badge, Tooltip, Dialog, AlertDialog, Sheet,
   Tabs, Spinner, `toast/ToastStack`. Built by a background agent in an
   isolated worktree, reviewed and integrated cleanly (no conflicts, one
   backward-compatible extension to the existing toast store).
4. **`src/components/motion/`**: Reveal, Stagger/StaggerItem, PressScale,
   flyToCart/useFlyToCart, CountUp, Marquee, Shimmer, ShakeOnError,
   PageTransition — built in parallel by a second background agent, also
   integrated cleanly.
5. **`/_design`** — the dev-only showcase route, every primitive above in
   every preset and both locales, with its own axe pass and visual
   snapshot. Blocked in real production; reachable in the test build only
   via a dedicated opt-in env var.
6. **ADRs 0014** (token architecture) **and 0015** (Phase 4 scope
   boundaries: preset selection vs. per-token editing, no density axis).

## Real bugs found and fixed this phase

Re-enabling `e2e/a11y/key-pages.spec.ts`'s `color-contrast` rule (disabled
since before Phase 2, explicitly pending this phase per its own comment)
surfaced real, previously-undetected WCAG AA failures on the **live
storefront**, not just the new design-system module:

1. The brand orange itself (`#F95B09`, white button text) — 3.22:1,
   needs 4.5:1. This was the Phase 0 audit's own flagged example.
2. Three courier footer badges (Pathao, RedX, iEX) used their own brand
   hex as label text on white — all three below 4.5:1.
3. The top announcement bar's default color (separate setting from the
   theme preset) was still the old unfixed orange — and fixing it then
   made `LanguageToggle`'s 80%-opacity inactive-tab text fail too.
4. The homepage's "Offers" promo tile used `text-primary` on a black
   `bg-ink` card — primary is tuned for light backgrounds, not dark ones.
5. Hero-slider and side-banner placeholder tiles (no uploaded image) used
   a procedurally generated `hsl(hue, S%, 42%)` background with white
   text — 42% lightness fails white-text contrast for most hues (yellow,
   the worst case, was only ~2:1). Lowered to 24%, verified safe across
   all 360 hue degrees by sweeping the full range, not just the hues
   currently seeded.

Also discovered, while adding a stricter unit-level check beyond what the
e2e suite exercises: "primary used as inline text" (as opposed to "white
text on a primary button") can't be satisfied by Luxe's single `primary`
token no matter what value it takes — white-button-contrast and
dark-background-text-contrast pull its required lightness in
mathematically disjoint directions (proven by sweeping luminance ranges,
not just trial and error). Documented as a deliberate exception in
`presets.test.ts` rather than silently excluded.

## Test matrix and results

| Check                                                                                                | Result                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                                                                                            | ✅ pass                                                                                                                                                                                                                       |
| Lint                                                                                                 | ✅ pass                                                                                                                                                                                                                       |
| Unit tests                                                                                           | ✅ 209/209 pass (22 files; ~70 new — theme/contrast, components/ui, components/motion)                                                                                                                                        |
| Integration tests                                                                                    | ✅ 15/15 pass (unaffected by this phase)                                                                                                                                                                                      |
| E2E critical path (desktop + mobile)                                                                 | ✅ both pass against the rewired checkout UI (Phase 3) under the new token system                                                                                                                                             |
| **a11y (axe, desktop), `color-contrast` re-enabled**: home/shop/product/login/cart/**design-system** | ✅ **6/6 pass** — the master plan's "every primitive gets an axe pass," and the first time this suite has run with contrast checking actually on                                                                              |
| Visual snapshot: `/_design` (new) and homepage (re-baselined)                                        | ✅ both captured and stable on a second run                                                                                                                                                                                   |
| Parity (settings/menus/products)                                                                     | ✅ 3/3 pass                                                                                                                                                                                                                   |
| Lighthouse                                                                                           | ⚠️ same pre-existing, non-regressing `/checkout` SEO warning as every prior phase's report (deliberately `robots.txt`-disallowed page)                                                                                        |
| Preset switching live, no rebuild                                                                    | ✅ verified manually: saved a preset in Admin → Settings → Theme, confirmed the storefront's `<style>` tag (and rendered colors) changed on the very next request, no deploy/restart                                          |
| `/_design` blocked in production, reachable in the test build                                        | ✅ verified against an actual `NODE_ENV=production` build both ways (404 without `ALLOW_DESIGN_ROUTE=1`, 200 with it) — caught and fixed a real bug where the block was being evaluated at build time instead of request time |

## Known limitations

- **Admin theme editing is preset-selection only**, not independent
  per-token overrides, and there's no "density" token yet — see ADR 0015.
- **`components/ui`/`components/motion` are purely additive this
  phase** — no existing storefront or admin screen has been migrated to
  use them yet. That's Phase 5 (storefront rebuild) and Phase 6 (admin
  rebuild)'s job; Phase 4's job was building the primitives and proving
  them (tokens, accessibility, reduced-motion, visual/axe coverage), not
  wiring them into real screens.
- **`PressScale` only responds to pointer input** (mouse/pen/touch), not
  keyboard — `Button`'s own `active:scale-97` CSS covers keyboard press
  feedback independently, so this only matters for non-Button elements
  wrapped in `PressScale` (e.g. product cards).
- **The Luxe "primary as inline text" exception** (above) means any
  future screen using `text-primary` for inline/link text (not a button)
  should use `text-ink` instead if it needs to render correctly on Luxe —
  not automatically enforced by a lint rule, just documented.

## Manual QA

- Walked the admin theme picker by hand: selecting a swatch updates the
  scoped live preview immediately (color, radius, heading font all
  visibly change); clicking "Apply" persists it and the picker's own
  "Currently live" label moves to the new preset after a
  `router.refresh()`.
- Spot-checked `/_design` and `/bn/_design` in a live dev server: all 4
  presets render side by side, every Dialog/AlertDialog/Sheet/Tabs/Toast
  demo is interactive, and the `ShoppingCart` fly-to-cart demo visibly
  animates (or, under simulated `prefers-reduced-motion`, degrades to a
  simple fade as required).
- Re-ran the full `npm run verify:full` chain twice: once right after
  integrating the two background agents' work, once more after all the
  contrast fixes above, confirming neither pass regressed the other.
- Note on a real false alarm hit while verifying: the mobile critical-path
  E2E test failed once with "Too many orders from this connection today"
  — the fraud-rate-limit guard correctly tripping from this session's own
  repeated local test runs accumulating in the test database, not a code
  regression. Resolved by truncating the test DB's order tables (the
  established pattern from earlier phases); re-ran clean afterward.

## Deploy notes

- **New dependency**: `motion` (14.6.0) — the animation library
  `components/motion` is built on. Client-side only, no server impact.
- **No new migrations, no new env vars for production** —
  `ALLOW_DESIGN_ROUTE` is test-infrastructure-only (set in `.env.test`/CI,
  never in a real deploy) and the feature is blocked by default without
  it.
- **No new cron jobs.**
- **Action needed from the human**: none.

## Pull request

`v2/phase-04-design-system` → `main`.

> **Phase 4: Design system and motion system**
>
> Builds the token/component foundation per `UNIBAAZAR_V2_MASTER_PLAN.md`
> §4.1/§4.4: 4 theme presets switchable live from admin with no rebuild,
> a full `components/ui` primitive set and `components/motion`
> micro-interaction set (both accessible, reduced-motion-aware, and
> token-driven), and a dev-only `/_design` showcase covering every
> primitive in every preset and locale.
>
> **Done-when criteria met**: every primitive has a visual snapshot and
> an axe pass (6/6 a11y pages green, `color-contrast` actually re-enabled
> rather than left disabled); preset switching works live with no
> reload/rebuild (verified against a real production-mode build).
>
> Also fixes every real WCAG AA contrast failure re-enabling that axe
> rule surfaced on the live storefront — not just the design system's own
> new tokens — including the brand orange itself, three courier badges,
> the top bar's default color, a homepage promo tile, and the hue-based
> placeholder backgrounds for banners/hero slides.
>
> New dependency (`motion`), no new env vars for production, no new
> migrations, no new cron jobs.
>
> Full test matrix and known limitations in `docs/qa/phase-04-report.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
