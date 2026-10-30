# Host facts needed from the human (before the first real deploy)

**Answered 2026-10-30 — §1, §2 and §3 below are confirmed, §5 is
deliberately skipped, and §4 (SSH access) is the only one still open.**
The rebuild is code-complete (Phases 0–14) and the user is readying the
first real deploy, so this file is no longer deferred.

I can't connect to the production server or run anything on it myself (the
master plan forbids this). The CI/CD pipeline this phase builds is written to
best-practice defaults for a CloudLinux/cPanel + Passenger host, but a few
facts can only come from the actual host. Please run the commands below in
cPanel → **Terminal** (or SSH, if you already have it set up) and paste the
output back. Nothing here is destructive — these are all read-only checks.

## 1. OpenSSL version (determines Prisma's binary target) — ✅ answered

`/etc/os-release` doesn't exist on this host (cPanel's CageFS jail hides
it on many shared-hosting setups), but `uname -a` gave an `el9` kernel
tag and `/opt/alt/alt-nodejs20` exists — CloudLinux's own naming
convention. Confirmed: **CloudLinux 9 (RHEL-family), OpenSSL 3.5.8**.

`binaryTargets = ["native", "rhel-openssl-3.0.x"]` is now set in
`prisma/schema.prisma` — see
`docs/decisions/0026-prisma-binary-target-rhel.md`. Prisma groups engine
binaries by OpenSSL major version, so 3.5.8 maps onto the same
`rhel-openssl-3.0.x` target as any other OpenSSL 3.x release.

## 2. Node.js version available via Node Selector — ✅ answered

`alt-nodejs20` is available via CloudLinux's alt-stack, matching
`.nvmrc`'s Node 20. Confirm it's also selectable from cPanel's **Setup
Node.js App** version dropdown when creating the app (§6 below) — the
alt-stack listing and the Node Selector UI should agree, but there's no
harm double-checking at that step since it's a dropdown, not a typed
answer.

## 3. Your home directory and app path — ✅ answered

`echo ~` → `/home/unibaazer`, `whoami` → `unibaazer`. `APP_PATH` is
therefore `/home/unibaazer/unibaazar`, used as-is in `DEPLOYMENT.md` and
`docs/launch-checklist.md`.

## 4. SSH access for GitHub Actions — still open

The deploy workflow (`.github/workflows/deploy.yml`) connects over SSH to
upload the build and run the switch-over script. This needs:

1. Your cPanel plan to support **SSH Access** (cPanel → _Security_ → _SSH
   Access_). Some shared hosting plans disable this — check it's enabled.
2. A dedicated SSH key pair for GitHub Actions (don't reuse your personal
   key): cPanel → _Security_ → _SSH Access_ → _Manage SSH Keys_ →
   _Generate a New Key_. Leave the passphrase blank (GitHub Actions can't
   type one in). Click **Authorize** to add the public key to
   `~/.ssh/authorized_keys`.
3. The **private** key's contents (Manage Keys → click the key → _View/Download_
   → copy the private key, `-----BEGIN ... PRIVATE KEY-----` through
   `-----END ... PRIVATE KEY-----`) go into the GitHub secret `SSH_KEY` —
   see `docs/deploy/github-secrets.md`. Never paste it into chat with me;
   add it directly in GitHub's UI.
4. Confirm: is SSH on the standard port 22, or a non-standard port? (cPanel
   → SSH Access page shows this, or `cat /etc/ssh/sshd_config | grep -i port`
   if you have terminal access to check — may require root, skip if you
   can't.)

If your plan doesn't support SSH access at all, tell me — there's a
documented fallback (cPanel's Git Version Control deploy, §3.4 of the master
plan) that doesn't need SSH, and I'll build that path instead.

## 5. A staging subdomain, for a dry run — skipped by choice

This was originally written to test the deploy mechanism itself (a
migration plus a forced-failure rollback) against a disposable target
before trusting it with the real site. **Waived for the same reason as
the migration rehearsal** (`docs/decisions/0025-migration-rehearsal-waived-fresh-install-instead.md`):
there's no real data at risk — the production DB holds only demo data,
and the plan is a fresh install, not an in-place upgrade. The worst case
of a first-deploy failure here is the site staying down until it's
retried, not data loss, and setting up a whole second subdomain + Node
app + database just to rehearse that is more setup than the risk
justifies. If a real need for a staging environment comes up later
(e.g. before a risky future migration), revisit this section then.
