#!/bin/bash
# Switches the live release over, with an automatic rollback if the new one
# doesn't come up healthy. Invoked with the current working directory set to
# the newly-unpacked release directory (releases/<sha>/) — the CI workflow's
# SSH step does only the unpack-and-invoke part; everything else lives here
# so it's testable outside of GitHub Actions.
#
# Required env vars: APP_PATH (e.g. /home/USER/unibaazar), SHA (the release
# being deployed), HEALTH_CHECK_URL (the public /api/health URL to poll).
# Optional: SMOKE_TEST_RETRIES (default 12), SMOKE_TEST_DELAY (default 5s),
# KEEP_RELEASES (default 5).
set -euo pipefail

# The automated deploy's SSH session is non-interactive, so it doesn't
# source .bashrc/.bash_profile — on this host that means `node` isn't on
# PATH at all (confirmed: `which node` exits 1 even in an *interactive*
# cPanel Terminal session, since no cPanel "Setup Node.js App" has been
# configured yet — that only happens after the first deploy, per
# DEPLOYMENT.md's own step order). CloudLinux's Node Selector installs
# a real, usable Node 20 regardless, just not on PATH by default.
# Confirmed via `find /opt/alt/alt-nodejs20 -iname node` on this host —
# if a future Node version bump moves this (matching .nvmrc), this is
# the line to update.
export PATH="/opt/alt/alt-nodejs20/root/usr/bin:$PATH"

: "${APP_PATH:?APP_PATH is required}"
: "${SHA:?SHA is required}"
: "${HEALTH_CHECK_URL:?HEALTH_CHECK_URL is required}"
RETRIES="${SMOKE_TEST_RETRIES:-12}"
DELAY="${SMOKE_TEST_DELAY:-5}"
KEEP="${KEEP_RELEASES:-5}"

RELEASE_DIR="$APP_PATH/releases/$SHA"
cd "$RELEASE_DIR"

# Shared files/dirs survive every release.
mkdir -p "$APP_PATH/shared/uploads" "$APP_PATH/shared/backups"
ln -sfn "$APP_PATH/shared/uploads" "$RELEASE_DIR/public/uploads"
ln -sfn "$APP_PATH/shared/.env" "$RELEASE_DIR/.env"

PREVIOUS=""
if [ -L "$APP_PATH/current" ]; then
  PREVIOUS="$(readlink "$APP_PATH/current")"
fi

echo "Backing up the database..."
BACKUP_DIR="$APP_PATH/shared/backups" node scripts/deploy/backup-db.mjs

echo "Applying migrations..."
bash scripts/deploy/apply-migrations.sh

echo "Switching current -> $RELEASE_DIR"
ln -sfn "$RELEASE_DIR" "$APP_PATH/current"
mkdir -p "$APP_PATH/current/tmp"
touch "$APP_PATH/current/tmp/restart.txt"

echo "Smoke-testing ($RETRIES attempts, ${DELAY}s apart)..."
ok=""
for _ in $(seq 1 "$RETRIES"); do
  if curl -fsS "$HEALTH_CHECK_URL" 2>/dev/null | grep -q '"status":"ok"'; then
    ok="yes"
    break
  fi
  sleep "$DELAY"
done

if [ -z "$ok" ]; then
  echo "Smoke test failed — rolling back to ${PREVIOUS:-<none, this was the first deploy>}" >&2
  if [ -n "$PREVIOUS" ]; then
    ln -sfn "$PREVIOUS" "$APP_PATH/current"
    touch "$APP_PATH/current/tmp/restart.txt"
  fi
  exit 1
fi

echo "Deployed $SHA successfully."

# Keep only the most recent $KEEP releases.
cd "$APP_PATH/releases"
ls -1t | tail -n "+$((KEEP + 1))" | xargs -r rm -rf
