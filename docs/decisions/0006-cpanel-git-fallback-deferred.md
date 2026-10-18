# 0006: cPanel Git Version Control fallback not built yet

## Context

Master plan §3.4 describes a fallback deploy path for hosts where SSH/rsync
from GitHub Actions isn't possible: CI pushes the built artifact to an
orphan `deploy` branch, and the server pulls it via cPanel's Git Version
Control feature, running a `.cpanel.yml` that does the same backup/migrate/
symlink/restart steps as the SSH path, but as shell commands cPanel itself
triggers.

## Decision

Didn't build this yet — it's conditional on SSH not being available
(`docs/deploy/host-facts.md` §4 asks the human to confirm). Building it
speculatively would mean creating an orphan `deploy` branch and a
`.cpanel.yml` for a path that may never be used, and no `.cpanel.yml` exists
to validate against without that branch existing.

## Consequences

- If the host facts come back saying SSH access isn't available on this
  cPanel plan, implement this fallback next: create the orphan `deploy`
  branch, write `.cpanel.yml` (backup → `apply-migrations.sh` → symlink →
  `touch tmp/restart.txt`, as shell steps only — no build), and add a CI job
  that force-pushes the built artifact to that branch instead of (or in
  addition to) the SSH-based `deploy.yml`.
- `scripts/deploy/apply-migrations.sh`, `backup-db.mjs`, and `rollback.sh`
  are already host-mechanism-agnostic (plain bash/Node, no SSH-specific
  assumptions), so they're reusable as-is for this fallback if it's ever
  needed.
