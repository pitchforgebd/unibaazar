# 0032 — Self-host fonts instead of `next/font/google`

Date: 2026-10-30
Status: accepted

## Context

With `verify` and `cross-browser` both reaching their last steps
(ADR 0027, 0029, 0030), `build:test`'s compile step failed three
separate times across the day — two different CI runs, two different
jobs (`verify`, `cross-browser`) — with the identical error:

```
src/app/fonts.ts
An error occurred in `next/font`.
TypeError: Cannot read properties of null (reading '1')
    at .../@next/font/dist/google/loader.js:122:78
```

Each time, a _different_ one of the three font families (`Poppins`,
`Noto Sans Bengali`, `Playfair Display`) was the one that failed — index
1, then 2, then 2 again, in the `Promise.all` the loader fires one
request per family from. A real misconfiguration in one specific font
would fail the same family every time; a different one failing each run
is the signature of `next/font/google`'s build-time network fetch to
Google's font API being transiently unreachable or rate-limited from
GitHub's shared runner IP pool — not something in `src/app/fonts.ts`.
`cross-browser`'s second run passed cleanly on the same unchanged code,
confirming it.

Retrying was the right first move (and worked, twice) — but by the
third occurrence, in the middle of chasing `build-artifact`'s database
issue (ADR 0031) to get a single fully-green run, repeated unrelated
font flakiness was actively costing CI cycles and blocking confirmation
of unrelated fixes. `next/font/local` removes the dependency entirely:
it reads font files from disk instead of fetching them at build time,
so there's nothing for a flaky network call to break.

## Decision

Downloaded the exact WOFF2 files Google's own CSS API serves for the
weights/subsets this project already used (`Poppins` latin 400/500/600/
700, `Noto Sans Bengali` bengali 400-700, `Playfair Display` latin
600-700) directly from `fonts.gstatic.com`, unmodified, verified
byte-for-byte identical between source and the Next.js build output.
`Noto Sans Bengali` and `Playfair Display` are variable fonts — Google
serves the identical file for every weight declaration in that family,
so each is one `next/font/local` `src` entry with a weight range
(`"400 700"` / `"600 700"`), not four/two separate files.

Moved `src/app/fonts.ts` to `src/app/fonts/index.ts` (same import
specifier, `@/app/fonts`, resolves to a directory index the same way),
with the font files under `./files/` and each family's SIL Open Font
License text under `./licenses/` — all three families are OFL-licensed,
and the license text is included the same way Google's own font
repository ships it, as these files aren't being relicensed, just
hosted here instead of fetched from `fonts.gstatic.com` at build time.

## Consequences

- Fully verified locally: `build:test`, the full unit suite (325/325),
  desktop + mobile e2e, a11y (6/6), and parity (8/8) all green against
  the self-hosted fonts. Bundled font files in `.next/static/media`
  confirmed byte-identical to the source files — Next.js doesn't
  transform them.
- The build no longer depends on Google's font API being reachable, at
  all, in any job. This removes the flakiness class entirely rather
  than hoping a retry succeeds next time.
- A production side-effect, not the reason for this change but
  worth noting: fonts now serve from the app's own origin instead of
  `fonts.gstatic.com`, which is one fewer third-party request on every
  page load and one fewer DNS/TLS handshake for a first-time visitor.
- **Font updates are now manual.** `next/font/google` would have picked
  up Google's own font-file updates automatically; these files are now
  static and only change if someone re-downloads them. Not expected to
  matter in practice — Poppins/Noto Sans Bengali/Playfair Display are
  stable, mature families — but worth knowing if a future visual bug
  ever traces back to "the font looks slightly different than Google
  Fonts' current version."
