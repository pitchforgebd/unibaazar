#!/bin/bash
# Manual rollback: re-points the `current` symlink at an already-unpacked
# release and restarts the app. Run this on the cPanel host, from the
# `~/unibaazar` directory (one level above `releases/` and `current`).
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

echo "Rolling back to $SHA..."
ln -sfn "$TARGET" current
touch current/tmp/restart.txt
echo "Done. Passenger will restart the app on the next request."
echo "Check: curl -fsS https://unibaazar.com/api/health"
