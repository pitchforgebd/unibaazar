#!/bin/bash
# Manual rollback: moves an already-unpacked release into the live
# directory and restarts the app. Run this on the cPanel host, from the
# `~/unibaazar` directory (one level above `releases/` and `current`).
#
# `current` is a real directory, moved into place with `mv` — neither
# `rsync` nor `cp -a`'s directory-copy idiom are installed on this host
# — see
# docs/decisions/0035-passenger-does-not-follow-the-current-symlink.md.
# `current.sha` tracks which release is live.
#
# Usage: ./scripts/deploy/rollback.sh <git-sha>
# List available releases with: ls releases/
set -euo pipefail

SHA="${1:-}"
if [ -z "$SHA" ]; then
  echo "Usage: $0 <git-sha>" >&2
  echo "Available releases:" >&2
  ls -1 releases/ >&2 2>/dev/null || true
  exit 1
fi

TARGET="releases/$SHA"
if [ ! -d "$TARGET" ]; then
  echo "No release directory at $TARGET" >&2
  exit 1
fi

CURRENT_SHA=""
if [ -f current.sha ]; then
  CURRENT_SHA="$(cat current.sha)"
fi

echo "Rolling back to $SHA..."
# The currently-live release goes back into releases/ under its own SHA
# — nothing is discarded, just renamed back to where deploy-release.sh
# would have put it.
if [ -d current ] && [ ! -L current ]; then
  if [ -n "$CURRENT_SHA" ]; then
    rm -rf "releases/$CURRENT_SHA"
    mv current "releases/$CURRENT_SHA"
  else
    rm -rf current
  fi
elif [ -L current ]; then
  rm -f current # stale pre-ADR-0035 symlink
fi

mv "$TARGET" current
echo "$SHA" >current.sha
mkdir -p current/tmp
touch current/tmp/restart.txt
echo "Done. Passenger will restart the app on the next request."
echo "Check: curl -fsS https://unibaazar.com/api/health"
