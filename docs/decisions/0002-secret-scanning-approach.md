# 0002: Secret scanning without a local gitleaks binary

## Context

Phase 0 calls for scanning git history with `gitleaks`. The `gitleaks` Go binary isn't
installable via `npm install` in this sandbox (no `gitleaks` npm package wraps it, and
there's no package manager with network access to a binary release here).

## Decision

- For this session: ran a manual regex sweep over `git log --all -p` for common secret
  shapes (private keys, cloud API key prefixes, `DATABASE_URL` with embedded
  credentials, `password: "..."` literals) plus targeted greps for the two secrets
  already known to be in `DEPLOYMENT.md`. Findings are in
  `docs/audit/current-state.md` and the Phase 0 QA report.
- For CI (Phase 1, when GitHub Actions is wired up): add the `gitleaks/gitleaks-action`
  marketplace action on push/PR. That action ships its own binary and needs no local
  npm install, so it isn't blocked by what happened in this sandbox.
- Added a pre-commit safety net now: `.gitleaks.toml` with the project's allowlist
  (so a future local gitleaks install, or the CI action, has a config to use) — see
  the file at the repo root.

## Consequences

- This session's scan is best-effort, not as exhaustive as a real gitleaks run
  (gitleaks has a much larger built-in detector ruleset for provider-specific key
  formats). The human should still run a real `gitleaks detect --source . --log-opts
="--all"` locally or via the CI action before fully trusting the history is clean.
