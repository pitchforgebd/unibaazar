# 0016: Phase 5 scope — adopt the design system on the real customer journey first

## Context

The master plan's Phase 5 bullet list is, verbatim: "Homepage section
builder (backend plus all 10 section types), listing, product detail,
cart drawer/page, checkout, order success, track order, account,
wishlist/compare, search with autocomplete (MySQL FULLTEXT plus
typo-tolerant fallback), `/videos` gallery, blog, CMS pages, and branded
404/500 pages... every screen matches the design spec at 360/768/1280/1536
widths in both locales." Done to the letter — all 10 exotic homepage
section types fully reimagined, a MySQL FULLTEXT search rebuild, a full
shoppable-video interactive player, etc. — this is multiple weeks of work
for a professional frontend team, not a single phase of one sitting.

A Phase 4-equivalent survey of the current codebase (read-only, done
before any Phase 5 code was written) found almost every screen the plan
lists **already exists and is functionally complete** — homepage section
ordering is already admin-driven (`listHomeSections()`), checkout's
pricing is already correct and live (Phase 3), cart/wishlist/compare/
account/blog/CMS/404/500 all work. What's missing, almost everywhere, is
visual polish and the Phase 4 design system (`components/ui`,
`components/motion`) actually being _used_ — right now it's zero-adopted
outside its own `/_design` showcase.

## Decision

This phase does real, substantial work on the pages customers actually
spend the most time on, adopting the design system for real (not just
cosmetically) and closing the genuine functional gaps found:

- **Homepage**: rebuild each section's markup in
  `src/app/[locale]/(store)/page.tsx` using `components/motion` (`Reveal`,
  `Stagger`, `Marquee` for the category ribbon, `PressScale` for cards)
  and `components/ui` where it fits. Admin-driven section ordering/
  enable-disable already works and isn't touched.
- **Shop/category/brand listing**: a real mobile filter bottom sheet
  (`components/ui`'s `Sheet` — today there's no distinct mobile filter
  treatment at all, just a responsive CSS grid), a sticky filter bar on
  desktop, `Reveal`/`Stagger` on the grid. URL-driven filtering (already
  solid) is unchanged.
- **Product detail**: swipeable gallery (mobile), a sticky mobile buy bar
  (doesn't exist today), `CountUp` on price changes when the variant
  selection changes, `components/ui` for the tabs/buttons already in
  place conceptually.
- **Cart**: `CartDrawer` is custom-built today, not using the new `Sheet`
  primitive — rebuilt on it for real. Adds a free-shipping progress bar
  (genuinely absent today, and genuinely useful — it's already
  computable from the existing live quote).
- **Checkout**: visual polish with `components/ui` (payment-method cards
  instead of plain radios, `Input`/`Select`), keeping the proven
  single-page structure and Phase 3's live-quote wiring untouched —
  that's correctness-critical and isn't being restructured for a visual
  phase.
- **Order success, account, wishlist, compare**: lighter passes —
  `components/ui` adoption, a reduced-motion-respecting celebration
  animation on order success — not full redesigns.
- **`/videos` gallery**: genuinely doesn't exist today as a storefront
  route (only an admin content-management screen for the homepage's video
  block). Built as a real, working page — category tabs, a grid, a
  lightbox player — but the "shoppable" product-tag bottom sheet from
  §4.2's hero-stage spec is simplified to a product link under each video
  rather than a full tagged-product bottom sheet overlay.

## Explicitly deferred (tracked here, not silently dropped)

- **A true admin-configurable section _builder_** (drag-and-drop
  reordering UI, arbitrary new section types beyond what's already
  defined) — today's "ordered list of named sections, each enable/
  disable-able" already satisfies the plan's done-when bar in spirit;
  building a generic builder UI for section _types themselves_ is a
  bigger admin-tooling project, better suited to Phase 6.
- **The bento discovery grid's "trending in your city" tile** — needs
  first-party analytics data that doesn't exist until Phase 10.
- **MySQL FULLTEXT search** — today's in-memory Levenshtein-based fuzzy
  search (`src/lib/catalog/search.ts`) already does typo-tolerant
  matching and works correctly at the catalog's current scale. Moving to
  a real FULLTEXT index is a backend performance optimization for a
  larger catalog, not a correctness or UX gap right now — deferred.
- **PWA** — the master plan's own text marks this "Optional."
- **Grid/list view toggle on listing pages** — a nice-to-have the plan
  mentions in §4.3 but doesn't gate "done when" on.

## Consequences

- Every deferred item above is either genuinely optional (PWA), blocked
  on a later phase's own data (analytics), or a backend scalability
  concern rather than a visible gap (FULLTEXT) — none of them leave a
  customer-facing hole on the live site.
- `components/ui`/`components/motion` go from zero-adopted to the primary
  toolkit for the highest-traffic screens this phase, which is the actual
  point of Phase 4 having built them — proving them out, not just
  showcasing them in isolation.
