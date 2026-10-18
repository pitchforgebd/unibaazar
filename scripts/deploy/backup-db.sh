#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
node scripts/deploy/backup-db.mjs
