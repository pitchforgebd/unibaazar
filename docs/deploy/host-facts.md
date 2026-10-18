# Host facts needed from the human (Phase 1)

I can't connect to the production server or run anything on it myself (the
master plan forbids this). The CI/CD pipeline this phase builds is written to
best-practice defaults for a CloudLinux/cPanel + Passenger host, but a few
facts can only come from the actual host. Please run the commands below in
cPanel → **Terminal** (or SSH, if you already have it set up) and paste the
output back. Nothing here is destructive — these are all read-only checks.

## 1. OpenSSL version (determines Prisma's binary target)

CI builds the app on a GitHub-hosted Ubuntu runner, then ships the whole
`node_modules` folder (including Prisma's compiled query-engine binary) to
your host. That binary is compiled against a specific OpenSSL ABI — if it
doesn't match your host's OpenSSL, Prisma will fail to start with an error
like `Unable to require libquery_engine... Error loading shared library`.

```bash
openssl version
cat /etc/os-release
```

Paste both outputs back. I'll set `binaryTargets` in `prisma/schema.prisma`
to match (e.g. `rhel-openssl-3.0.x` for OpenSSL 3.0 on a RHEL-family OS like
CloudLinux, or `rhel-openssl-1.1.x` for OpenSSL 1.1).

## 2. Node.js version available via Node Selector

```bash
ls /usr/share/passenger/nodejs/ 2>/dev/null || echo "(try: cPanel UI -> Setup Node.js App -> Node.js version dropdown)"
```

`DEPLOYMENT.md` currently assumes Node 20.x — please confirm 20.x (or newer)
is actually offered in your cPanel's Node.js Selector/Setup Node.js App page.

## 3. Your home directory and app path

```bash
echo ~
whoami
```

I'll use `~/unibaazar` as the app root in all scripts and docs unless you
tell me otherwise — confirm that's where the app currently lives (per
`DEPLOYMENT.md`'s existing setup), or give me the real path.

## 4. SSH access for GitHub Actions

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

## 5. A staging subdomain or subdirectory, for the Phase 1 dry run

Phase 1 is "done" when a full deploy — including a migration and a
forced-failure automatic rollback — succeeds end to end against a **non-production**
target. Options, your call:

- **Subdomain** (e.g. `staging.unibaazar.com`): cPanel → _Domains_ →
  _Create A New Domain_ → check "Share document root" off, point it at a
  separate folder (e.g. `~/staging-unibaazar`), and set up a second
  **Setup Node.js App** entry for it with its own `.env` (a copy of
  production's, but pointed at a **separate staging database** — never the
  live one).
- **Subdirectory under the same domain**, if a subdomain isn't available —
  less clean but works.

Either way, I need: the staging URL, and confirmation that its database is
separate from production's (so a dry-run migration can't touch real orders).

---

Once you've got some or all of this, paste it back and I'll fill in the
remaining pieces (Prisma `binaryTargets`, the GitHub Secrets list, and
whether to prep the `.cpanel.yml` fallback). I'll keep building everything
else in this phase that doesn't depend on these answers in the meantime.
