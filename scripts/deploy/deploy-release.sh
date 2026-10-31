#!/bin/bash
# Switches the live release over, with an automatic rollback if the new one
# doesn't come up healthy. Invoked with the current working directory set to
# the newly-unpacked release directory (releases/<sha>/) — the CI workflow's
# SSH step does only the unpack-and-invoke part; everything else lives here
# so it's testable outside of GitHub Actions.
#
# `current` is a real directory, moved into place with `mv` on every
# deploy, not a symlink repointed per deploy and not rsync'd/copied —
# see docs/decisions/0035-passenger-does-not-follow-the-current-symlink.md.
# cPanel's "Setup Node.js App" resolved a symlinked Application root to
# its target at creation time instead of following it, so every deploy
# that repointed a symlink silently kept serving the first release.
# Neither `rsync` nor the Linux `cp -a` directory-copy idiom are
# installed on this host (confirmed directly, not assumed), so this uses
# `mv` instead: a rename on the same filesystem is a near-instant
# metadata operation regardless of how many files are inside,
# sidestepping the "tens of thousands of small files" slowness that
# already made `tar` extraction need a 30-minute budget (ADR 0034) —
# `mv` never touches file content or does per-file I/O at all. The
# previous live release is moved to a transient holding directory during
# the switch (so a failed smoke test can restore it without having
# copied anything), then moved back into `releases/` as a normal
# historical entry once the new one is confirmed healthy — nothing is
# ever deleted/recreated by bulk copy, only renamed.
#
# Required env vars: APP_PATH (e.g. /home/USER/unibaazar), SHA (the release
# being deployed), HEALTH_CHECK_URL (the public /api/health URL to poll).
# Optional: SMOKE_TEST_RETRIES (default 12), SMOKE_TEST_DELAY (default 5s).
set -euo pipefail

# No Node anywhere in this script (backups and migrations use the mysql CLI
# tools): a Node process started next to the running app could abort on the
# host's thread limit — see scripts/deploy/backup-db.sh.

: "${APP_PATH:?APP_PATH is required}"
: "${SHA:?SHA is required}"
: "${HEALTH_CHECK_URL:?HEALTH_CHECK_URL is required}"
RETRIES="${SMOKE_TEST_RETRIES:-12}"
DELAY="${SMOKE_TEST_DELAY:-5}"

RELEASE_DIR="$APP_PATH/releases/$SHA"
LIVE_DIR="$APP_PATH/current"
HOLD_DIR="$APP_PATH/current.previous"
SHA_FILE="$APP_PATH/current.sha"
cd "$RELEASE_DIR"

# Shared files/dirs survive every release. The symlinks' targets are
# absolute paths, so they resolve the same no matter which directory
# (releases/<sha>, then current after the mv below) contains them.
mkdir -p "$APP_PATH/shared/uploads" "$APP_PATH/shared/backups"
ln -sfn "$APP_PATH/shared/uploads" "$RELEASE_DIR/public/uploads"
ln -sfn "$APP_PATH/shared/.env" "$RELEASE_DIR/.env"

PREVIOUS_SHA=""
if [ -f "$SHA_FILE" ]; then
  PREVIOUS_SHA="$(cat "$SHA_FILE")"
fi

echo "Backing up the database..."
BACKUP_DIR="$APP_PATH/shared/backups" bash scripts/deploy/backup-db.sh

echo "Applying migrations..."
bash scripts/deploy/apply-migrations.sh

echo "Switching current -> $SHA"
rm -rf "$HOLD_DIR"
if [ -d "$LIVE_DIR" ] && [ ! -L "$LIVE_DIR" ]; then
  mv "$LIVE_DIR" "$HOLD_DIR"
elif [ -L "$LIVE_DIR" ]; then
  # One-time cleanup of a stale symlink left over from before ADR 0035 —
  # its target is the wrong release anyway (that's the bug being fixed),
  # so there's nothing real here worth preserving.
  rm -f "$LIVE_DIR"
fi
mv "$RELEASE_DIR" "$LIVE_DIR"
echo "$SHA" >"$SHA_FILE"
mkdir -p "$LIVE_DIR/tmp"
touch "$LIVE_DIR/tmp/restart.txt"

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
  echo "Smoke test failed — rolling back to ${PREVIOUS_SHA:-<none, this was the first deploy>}" >&2
  # Put the failed release back where it came from, for later inspection
  # (its stderr.log etc. — exactly what diagnosed every host-specific
  # fix today).
  rm -rf "$RELEASE_DIR"
  mv "$LIVE_DIR" "$RELEASE_DIR"
  if [ -d "$HOLD_DIR" ]; then
    mv "$HOLD_DIR" "$LIVE_DIR"
    echo "$PREVIOUS_SHA" >"$SHA_FILE"
    touch "$LIVE_DIR/tmp/restart.txt"
  else
    # First-ever deploy failing: there's no previous release to restore,
    # so current.sha must not keep pointing at a SHA whose content just
    # moved out of current/ and back into releases/.
    rm -f "$SHA_FILE"
  fi
  exit 1
fi

echo "Deployed $SHA successfully."

# The old live release goes back into releases/ as an ordinary
# historical entry — nothing copied, just renamed back.
if [ -n "$PREVIOUS_SHA" ] && [ -d "$HOLD_DIR" ]; then
  mv "$HOLD_DIR" "$APP_PATH/releases/$PREVIOUS_SHA"
fi

# Keep only the release just replaced — the rollback target — and drop
# everything else, including releases from failed deploys. Each release is
# ~38,500 files and the account's inode limit is 500,000, so keeping five
# (plus every failed attempt, which nothing used to clean up) had already
# reached 300,000.
cd "$APP_PATH/releases"
for entry in *; do
  if [ "$entry" != "$PREVIOUS_SHA" ]; then
    rm -rf "$entry"
  fi
done
