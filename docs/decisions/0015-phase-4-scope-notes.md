# 0015: Phase 4 scope notes — what's a preset switch vs. per-token editing

## Context

Master plan §4.1 says "colours, radius, font pair, and density are
admin-editable tokens. Ship 4 presets." Phase 4 built the 4 presets and a
live preset picker (`ThemePresetPicker`), but not every token is
independently admin-editable the way that sentence could be read — worth
recording precisely what exists today versus what a later phase would add.

## Decision / current state

- **An admin picks one of the 4 presets (Bazaar/Luxe/Fresh/Tech) as a
  whole.** They are not yet able to independently override just the
  radius, or just one color, while keeping the rest of a preset — the
  picker applies `THEME_PRESETS[id]` verbatim. `resolveThemeTokens()`
  (`src/lib/theme/presets.ts`) already accepts a `primary`/`primaryDark`
  override and is unused by the admin UI today — the plumbing for partial
  overrides exists at the data layer, just not wired to a form yet.
- **No "density" token was built.** §4.1 lists it alongside color/radius/
  font as an admin-editable axis; nothing in this phase defines what
  "density" means concretely (tighter spacing/line-height scale?) or adds
  a corresponding CSS variable. Deferred — needs its own design decision
  (what exactly varies, and by how much) before it's just an engineering
  task.
- **Haptics (`navigator.vibrate`) and the admin notification bell's own
  swing/badge-pop/sound-toggle were explicitly not built in
  `components/motion`**, per instruction to the agent that built it —
  both are one-line call-site concerns (haptics: a call inside
  add-to-cart; the bell: its own existing component), not reusable
  primitives, so they belong with whichever phase actually wires up
  add-to-cart haptics or rebuilds the admin bell (Phase 5/6), not this
  one.
- **`PressScale` only responds to mouse/pen/touch, not keyboard.**
  Pressing Enter/Space on a button wrapped in `PressScale` doesn't trigger
  the scale animation, because the wrapping element isn't focusable
  itself. `components/ui`'s `Button` already has its own
  `active:scale-97` CSS (unconditional, not motion-library-based)
  specifically so keyboard press feedback doesn't depend on
  `PressScale` — `PressScale` itself is for wrapping non-Button elements
  (product cards, thumbnails) where this gap doesn't apply the same way.

## Consequences

- Phase 6 (admin panel rebuild, which is where §4.5's command palette,
  saved views, etc. actually live per the master plan's own phase
  breakdown) is the natural place to add per-token override UI if the
  product direction wants it — `resolveThemeTokens()`'s override parameter
  is already there waiting.
- Density needs a product decision (what varies, by how much) before a
  follow-up implements it — flagging it now so it isn't assumed "done"
  just because Phase 4's QA report says the phase is complete.
