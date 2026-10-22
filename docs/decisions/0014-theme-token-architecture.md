# 0014: Theme token architecture — CSS variables, not a rebuild

## Context

Phase 4's master plan §4.1 asks for 4 theme presets (Bazaar/Luxe/Fresh/Tech)
that an admin can switch "with no rebuild." The existing `tailwind.config.ts`
had every brand color as a literal hex value, compiled into the stylesheet
at build time — switching a preset that way would need a real deploy.

## Decision

- **Colors are CSS custom properties, set per request.**
  `src/lib/theme/presets.ts` defines each preset's tokens as plain hex
  strings; `src/lib/theme/styleTag.ts` converts them to space-separated
  `r g b` channels (so Tailwind's `rgb(var(--color-x) / <alpha-value>)`
  color definitions keep supporting opacity modifiers like `bg-primary/10`,
  which turned out to be used in a dozen+ existing files) and renders a
  `:root{...}` `<style>` tag in `src/app/[locale]/layout.tsx`, read fresh
  from the DB-backed `Setting` row on every request. Saving a new preset in
  admin is live on the very next page load — no build step involved.
- **Reused the existing semantic token names** (`primary`, `primary-dark`,
  `peach`→`primaryLight`, `ink`, `page`, `card`, `foreground`, `muted`)
  instead of introducing the full `brand-50…950` scale the master plan's
  prose suggests. Every existing component already uses these names
  throughout the codebase; renaming them to adopt an 11-step scale would
  have meant touching hundreds of files for a scale nothing yet uses
  intermediate steps of. Added exactly one new token (`accent`, for
  deal/sale badges) since nothing existing covered that role.
- **Admin keeps a static fallback, never re-skins with storefront
  presets.** `src/styles/globals.css`'s `:root` block hardcodes the Bazaar
  preset's values (checked against drift by
  `src/lib/theme/globalsFallback.test.ts`) and is what admin pages render
  with, unconditionally — the admin UI has its own, separate "professional,
  dark-mode-capable" design direction (master plan §4.5, not yet built),
  and was never meant to visually shift every time someone previews a
  storefront theme.
- **Font pairing is heading-only.** `font-heading` (a new Tailwind utility)
  switches per preset (Poppins for most, Playfair Display for Luxe); body
  copy stays on Poppins + Noto Sans Bengali always, matching the master
  plan's own distinction ("a characterful display face for headings and a
  highly readable sans for body").

## A real bug found and fixed while building this

Writing `src/lib/theme/presets.test.ts` (automated WCAG AA contrast checks,
explicitly required by §4.1: "checked automatically in CI") immediately
failed on the **existing, already-live** brand orange: white button text on
`#F95B09` is only 3.22:1, and on the hover color `#E64A00` only 3.93:1 —
both below the 4.5:1 AA minimum. This is exactly the Phase 0 audit's
"Storefront color tokens fail WCAG AA contrast... (brand orange...)"
finding, explicitly scheduled for this phase. Darkened the Bazaar preset's
`primary`/`primaryDark` (and found the same issue in first-draft Luxe/Fresh
palettes) until every preset's ink/foreground-on-page/card and
white-on-primary/primaryDark pairing passes 4.5:1 — see the test file for
the exact pairs checked.

## Consequences

- Any new semantic color must be added in exactly 3 places kept in sync by
  a test, not convention: `ThemeTokens` (types.ts), every preset's value in
  `THEME_PRESETS`, and `themeStyleTag`/`themeCssVars`'s variable list — the
  contrast and style-tag tests will fail loudly if one is missed.
- `components/ui` and `components/motion` (built next, in parallel) must
  use these token class names (`bg-primary`, `text-ink`, `font-heading`,
  `rounded-theme`, the `fast`/`base`/`slow`/`page` transition durations)
  rather than literal colors/durations, or they won't actually re-skin
  with the rest of the storefront when an admin switches presets.
