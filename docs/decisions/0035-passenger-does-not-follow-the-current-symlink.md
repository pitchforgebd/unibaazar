# 0035 — `current` is a real directory, synced on every deploy, not a symlink

Date: 2026-10-30
Status: accepted

## Context

`DEPLOYMENT.md`'s step 6 flagged this explicitly, before the first real
deploy: _"This is the one thing I couldn't verify myself: whether
Passenger accepts `current` as a symlink and follows it correctly, vs.
needing the application root to be a real directory."_ The pipeline was
built on the symlink model (`current -> releases/<sha>`, repointed and
`restart.txt`-touched on every deploy) because it's the standard,
documented capistrano-style release pattern, and the fallback — rsync
into a fixed directory — was written down in advance in case it didn't
work.

It didn't work. On the first deploy, the cPanel "Setup Node.js App"
form's Application root field was entered as `unibaazar/current`
(a symlink at the time). After clicking Create, the field's saved value
had changed to the symlink's _literal resolved target_:
`unibaazar/releases/<that first SHA>`. cPanel's path-validation follows
the symlink and stores the real path, rather than keeping the string
the human typed.

The practical effect, confirmed across two further deploy attempts, not
assumed: `deploy-release.sh` correctly repointed the `current` symlink
to each new release and touched `restart.txt`, but Passenger was bound
to the old literal path the whole time and never looked at the new
code. Both deploys' smoke tests failed identically — not because the
new release was broken, but because Passenger was serving the _first_
one regardless of what `current` pointed at. The second attempt's
`stderr.log` for the new release was empty, confirming Passenger had
never executed any of that code at all.

## Decision

`current` is now a real directory, built with `mv` rather than
repointing a symlink. The original fallback plan was rsync into a fixed
directory — checked directly on the host rather than assumed, and
**neither `rsync` nor the Linux `cp -a` directory-copy idiom are
installed on this host**. `mv` on the same filesystem is a rename, not
a copy: a near-instant metadata operation regardless of file count,
which also sidesteps the "tens of thousands of small files" slowness
that already made `tar` extraction need a 30-minute budget (ADR 0034) —
`mv` never touches file content.

`scripts/deploy/deploy-release.sh` now, on each deploy: moves the
current live directory to a transient `current.previous` holding spot
(if one exists), moves the newly-unpacked release into `current`, and —
only once the smoke test passes — moves `current.previous` back into
`releases/<its-sha>` as an ordinary historical entry. Nothing is ever
bulk-copied; a release is always exactly one `mv` away from wherever it
needs to be. On smoke-test failure, the same moves run in reverse: the
failed release goes back to `releases/<sha>` (so its `stderr.log` etc.
can still be inspected — exactly how every host-specific fix today was
actually diagnosed), and the held previous release moves back into
`current`.

A new `current.sha` plain file (a sibling of `current/`, not inside it)
tracks which release is live, replacing the `readlink current` that
used to answer that question. `scripts/deploy/rollback.sh` updated the
same way for manual rollback to an arbitrary historical SHA. Both
scripts detect and remove a stale symlink left over from before this
fix on their first run, so no separate migration step is needed on the
host for the scripts themselves — only the cPanel Application root
field needs a one-time manual re-save (see `DEPLOYMENT.md` step 6),
since that's a cPanel UI setting outside what any deploy script can
reach.

The documented rsync fallback turned out not to fit this host either —
not kept as an alternative, the symlink model is removed entirely
rather than left as a second code path to maintain.

## Consequences

- Verified locally, completely: simulated three deploys in a row (two
  successful, one deliberately failing) using the exact sequence of
  `mv`/`rm`/`ln -sfn` calls the real scripts use. Confirmed: symlinks to
  `shared/.env` and `shared/uploads` resolve correctly after every
  switch; a failed deploy correctly restores the previous release's
  exact content and `current.sha`; `releases/` accumulates history
  correctly without ever losing or duplicating a release. This class of
  fix — plain filesystem operations, not host-specific binaries or
  OS/runtime detection — is fully testable without the real host, unlike
  ADR 0026's Prisma target or ADR 0033's Node path.
- The one-time cPanel re-save is a real step a human has to do — it's
  not something any script can reach, since it's cPanel's own stored
  Node.js Selector configuration, not a file on disk.
- `releases/` and `current`/`current.previous` must stay on the same
  filesystem for `mv` to be the cheap rename it's chosen for — true here
  (all under `~/unibaazar`), worth checking again if the layout ever
  changes (e.g. a separate mount for `shared/`).
- Not fully verified against the _real_ host yet — the simulation proves
  the logic; the next actual deploy, after the cPanel Application root
  is re-saved, is still the first time it runs for real.
