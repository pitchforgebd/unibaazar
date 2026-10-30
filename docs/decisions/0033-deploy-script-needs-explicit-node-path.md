# 0033 — Pin Node's path explicitly in `deploy-release.sh`

Date: 2026-10-30
Status: accepted

## Context

With CI fully green (ADR 0027–0032) and the SSH key issue resolved
(a GitHub-hosted drone-ssh error: `this private key is passphrase
protected` — the key had been generated via cPanel's web UI, whose
"Generate a New Key" form forced a passphrase this host wouldn't accept
blank; regenerated via `ssh-keygen -N ""` in Terminal instead, which
allows an empty one), the actual first deploy ran. It got through
directory setup, artifact upload, and unpacking — then failed:

```
.../scripts/deploy/deploy-release.sh: line 35: node: command not found
Backing up the database...
```

`deploy-release.sh` calls `node scripts/deploy/backup-db.mjs` for the
pre-migration database backup. The automated deploy's SSH session is
**non-interactive** — it runs one command over SSH, not a login shell —
so it doesn't source `.bashrc`/`.bash_profile`, and `node` wasn't
anywhere on its `PATH`.

This isn't only a non-interactive-session problem. `which node` also
exits 1 in an ordinary **interactive** cPanel Terminal session on this
host — confirmed directly. The reason: CloudLinux's Node Selector
(`/opt/alt/alt-nodejs20`, the package already confirmed present in
ADR 0026) installs a real, usable Node 20, but nothing puts it on
`PATH` until a cPanel "Setup Node.js App" is configured for at least
one application — and per `DEPLOYMENT.md`'s own documented order, that
happens _after_ the first successful deploy, not before. A deploy
script needing `node` before any Node.js App has ever been configured
is a real chicken-and-egg gap in that ordering, not specific to the
non-interactive-shell issue alone.

## Decision

`deploy-release.sh` now exports
`PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"` near the top, found
via `find /opt/alt/alt-nodejs20 -iname node` on the actual host rather
than guessed. This is host-specific and version-specific (tied to
`.nvmrc`'s Node 20, matching ADR 0026's own confirmed Node version) —
if the host's Node Selector version ever changes, this line needs
updating alongside `.nvmrc`.

`apply-migrations.sh` was re-checked and confirmed to have no `node`
call of its own (pure `bash` + the `mysql` CLI, by original design) —
this fix is scoped to the one call site that needed it.

Not fixed generally via `~/.bashrc` on the host: SSH's non-interactive
command execution doesn't reliably source shell startup files across
configurations, so that would not have fixed the automated deploy even
if it fixed interactive sessions. The explicit `export PATH=` inside
the script itself is the one fix that covers both the automated deploy
and (if the script is ever run by hand) a human's own Terminal session.

## Consequences

- The human still needs `node` on `PATH` for one thing this doesn't
  cover: `scripts/bootstrap-admin.cjs`, run by hand after the first
  deploy succeeds (per `docs/launch-checklist.md` §1) to create the
  first admin. Either run it as
  `/opt/alt/alt-nodejs20/root/usr/bin/node scripts/bootstrap-admin.cjs`,
  or add the same `export PATH=...` line to `~/.bashrc` first.
- Not verifiable locally — this is specific to this cPanel host's
  filesystem layout, same as ADR 0026/0027's host-specific fixes. The
  real confirmation is the next deploy run actually reaching the
  migration step.
- Once a cPanel "Setup Node.js App" is eventually configured (step 6 in
  `DEPLOYMENT.md`, after this first deploy succeeds), that app's own
  `nodevenv` will provide a _second_, independent way to reach Node 20
  — unrelated to this fix, and not a reason to remove it, since
  `deploy-release.sh` runs before any app-specific `nodevenv` exists on
  a fresh host and will on every future deploy too.
