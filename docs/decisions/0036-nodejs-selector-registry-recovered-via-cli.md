# 0036 — cPanel's Node.js Selector registry was corrupted; recreated via `cloudlinux-selector` CLI

Date: 2026-10-30
Status: accepted

## Context

After ADR 0035 made `current` a real directory, the plan was to open the
existing cPanel "Setup Node.js App" entry and re-save its Application root
as `unibaazar/current`. Doing that in the UI failed on Edit with:

```
No such application or it's broken. Unable to find app venv folder by
this path: '/home/unibaazer/nodevenv/unibaazar/releases/0d1fea4b621f6e8e2f67f09c3325c7611ca366f5'
```

Checked directly, not assumed: `~/nodevenv/unibaazar/releases/` was empty —
the venv for that app's original (literal, resolved-at-creation-time per
ADR 0035) app root no longer existed on disk, even though cPanel's config
still referenced it. This host's cPanel install doesn't even have the
stock `Cpanel::API::NodejsApp` module (`uapi NodejsApp list_nodejs_apps`
failed with `ModuleLoadError` — module not present in `@INC`); Node app
management here goes through CloudLinux's own `cloudlinux-selector` CLI
and its registry at `~/.cl.selector/node-selector.json` instead of stock
cPanel's JSON store. Both the UI's Edit and a direct
`cloudlinux-selector set --new-app-root` CLI call hit the identical
"venv folder missing" error — renaming a broken entry wasn't possible
through either path, because the rename operation itself needs to
activate the old venv first.

## Decision

Destroyed the broken registry entry directly
(`cloudlinux-selector destroy --app-root unibaazar/releases/<old-sha>`),
which succeeded immediately (destroy doesn't need the venv to exist —
only set/rename does). Confirmed the registry was then empty
(`~/.cl.selector/node-selector.json` → `{}`) and created a fresh app
straight at the correct target, per DEPLOYMENT.md's step 6 table, using
the CLI instead of the UI:

```bash
/usr/sbin/cloudlinux-selector create --json --interpreter nodejs \
  --domain unibaazar.com --app-root unibaazar/current --app-uri / \
  --version 20 --app-mode production --startup-file server.js
/usr/sbin/cloudlinux-selector restart --json --interpreter nodejs \
  --domain unibaazar.com --app-root unibaazar/current
```

`/api/health` immediately returned
`{"status":"ok","version":"9357fc14d6041c53916fe6dc3f98a34ebbd7eb22","db":"ok"}`
— the first real confirmation, all day, that Passenger is actually
serving the code `current/` points to. `current/stderr.log` was empty
afterward (no startup errors).

## Consequences

- `DEPLOYMENT.md` step 6 now documents this CLI path as the fallback if
  the "Setup Node.js App" UI ever shows the same "venv folder missing"
  error again (e.g. if the app root ever needs recreating): `destroy`
  the broken entry, then `create` fresh, both via `cloudlinux-selector`,
  rather than trying to Edit/rename through either the UI or `set`.
- This is a one-time recovery, not a recurring step — `current` is a real
  directory from now on (ADR 0035), so no future deploy repoints or
  recreates the Application root at all.
- Not verified by local simulation — this is cPanel/CloudLinux-specific
  state (its own app registry JSON, its own venv layout) with no local
  equivalent, same category as ADR 0026/0033/0034.
- Root cause of _why_ the venv went missing in the first place is still
  unknown — possibly cleaned up by CloudLinux housekeeping once the
  literal path it referenced stopped being touched (every later deploy
  only ever repointed a symlink past it, never recreated anything at that
  path). Not investigated further since the fix (CLI recreate) resolved
  it completely and the symlink-based model it was created under is now
  gone entirely.
