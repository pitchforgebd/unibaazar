#!/bin/bash
# Dumps the database to $BACKUP_DIR (default: <repo>/backups) and keeps the
# newest $BACKUP_KEEP (default 14). Runs before every deploy and as the
# daily cron.
#
# Plain bash + mysqldump on purpose — no Node. The host caps the account's
# total threads at roughly 100, and each running app instance already holds
# ~44 (Prisma's engine sizes its thread pool to the host's CPU count), so a
# Node process started next to a busy app aborted on startup with "core
# dumped" and failed the deploy before it did anything.
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../.."

# shellcheck source=db-url.sh
source "$SCRIPT_DIR/db-url.sh"

FOLDER="${BACKUP_DIR:-$PWD/backups}"
KEEP="${BACKUP_KEEP:-14}"
mkdir -p "$FOLDER"
FILE="$FOLDER/unibaazar-$(date -u +%Y-%m-%dT%H-%M-%SZ).sql"

# Written to a temp name and renamed only on success, so a failed dump never
# leaves a truncated file that looks like a good backup.
trap 'rm -f "$FILE.partial"' EXIT
MYSQL_PWD="$DB_PASS" mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
  --single-transaction "$DB_NAME" >"$FILE.partial"
mv "$FILE.partial" "$FILE"
echo "$FILE"

ls -1t "$FOLDER"/unibaazar-*.sql | tail -n "+$((KEEP + 1))" | while read -r old; do
  rm -f "$old"
  echo "removed old backup: $(basename "$old")"
done
