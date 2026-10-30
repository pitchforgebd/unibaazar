# GitHub Actions secrets needed for deployment

Add these under the repo's **Settings → Secrets and variables → Actions →
New repository secret**. None of them should ever be pasted into chat,
committed to a file, or shared anywhere other than GitHub's secret store.

| Secret             | Value                                                                                                                                                                                                                                                                                       | Where it comes from                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `SSH_HOST`         | Your server's hostname or IP                                                                                                                                                                                                                                                                | cPanel account info, or your hosting provider's welcome email                                                 |
| `SSH_USER`         | Your cPanel username                                                                                                                                                                                                                                                                        | cPanel account info                                                                                           |
| `SSH_KEY`          | The **private** key generated for GitHub Actions                                                                                                                                                                                                                                            | cPanel → SSH Access → Manage SSH Keys (see `host-facts.md` §4) — the whole `-----BEGIN...-----END-----` block |
| `SSH_PASSPHRASE`   | The key's passphrase — **only add this secret if you set one.** Some cPanel hosts' "Generate a New Key" form requires a password and won't accept a blank one; `deploy.yml` passes this through on every SSH/SCP step, and it's safely empty (no passphrase) when the secret doesn't exist. | The password you set while generating the key, cPanel → SSH Access                                            |
| `SSH_PORT`         | Usually `22`, sometimes a custom port                                                                                                                                                                                                                                                       | cPanel → SSH Access page, or `echo $SSH_CONNECTION` while connected (the 4th field)                           |
| `APP_PATH`         | Absolute path to the app root, e.g. `/home/USER/unibaazar`                                                                                                                                                                                                                                  | `echo ~/unibaazar` on the host                                                                                |
| `HEALTH_CHECK_URL` | The full URL the deploy smoke test curls, e.g. `https://unibaazar.com/api/health` (or the staging URL during the Phase 1 dry run)                                                                                                                                                           | —                                                                                                             |

## Optional, for the GitHub "production" environment gate

`.github/workflows/deploy.yml` deploys under a GitHub **Environment** named
`production`. By default this has no extra protection — the workflow runs
automatically whenever `ci` succeeds on `main`. If you want a manual
approval step before every deploy actually touches the server:

1. Repo → **Settings → Environments → New environment** → name it exactly
   `production`.
2. Add yourself as a **required reviewer**.
3. From then on, every deploy pauses for your approval (visible in the
   Actions tab) before it runs.

This is optional — the master plan's design is "merge to `main` = deploy,"
no manual step. Turn this on only if you'd rather review before every
production deploy; it doesn't change anything else about the pipeline.

## Verifying secrets are set correctly

There's no way to "print" a secret back for verification (by design). The
first real test is the Phase 1 dry run against the staging target — if
`SSH_HOST`/`SSH_USER`/`SSH_KEY`/`SSH_PORT` are wrong, the "Ensure the
release/shared directories exist" step in `deploy.yml` fails immediately
with a connection error, which is easy to tell apart from an application
bug.
