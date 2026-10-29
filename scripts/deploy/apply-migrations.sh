#!/bin/bash
# Applies every committed Prisma migration that isn't already recorded in
# _prisma_migrations, using only the `mysql` CLI — no Node, no Prisma CLI.
# This runs *on the cPanel host* (never locally against production), because
# that's the only place DATABASE_URL points at the real database.
#
# Known limitation: MySQL DDL statements auto-commit, so a migration that
# mixes schema changes and data changes isn't atomic the way the master plan's
# "in a transaction where possible" aspires to — this is also true of
# `prisma migrate deploy` itself on MySQL, not something this script
# regresses. Keep migrations small and, per the master plan's rule, backward
# compatible (expand -> migrate data -> contract across two deploys) so a
# partial failure is always safe to retry or roll forward from.
#
# Usage: DATABASE_URL=mysql://user:pass@host:port/db ./apply-migrations.sh [migrations-dir]
# If DATABASE_URL isn't set, it's read from .env in the current directory.
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
MIGRATIONS_DIR="${2:-$SCRIPT_DIR/../../prisma/migrations}"

if [ -z "${DATABASE_URL:-}" ]; then
  if [ ! -f .env ]; then
    echo "DATABASE_URL not set and no .env in the current directory" >&2
    exit 1
  fi
  DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'\$//")"
fi

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is empty" >&2
  exit 1
fi

# Parse mysql://user:pass@host:port/dbname.
#
# Split on the *last* "@", not the first: cPanel generates DB passwords
# containing symbols, and one containing "@" used to put the remainder
# of the password into the hostname. Percent-escapes are decoded too,
# because that is how such a password has to be written in a URL for
# Prisma to accept it — undecoded, MYSQL_PWD got the literal "Pa%40ss"
# and authentication failed. Both bugs only ever bit on the *first*
# deploy to a fresh host, which is the only time this path runs, so
# neither had been hit before Phase 14.
# The backslash comes from a variable rather than being written inline:
# how `${var//%/\\x}` quotes its replacement differs between bash 4 and
# 5, and on one of them the backslash is dropped and every escape
# decodes to a literal "x". `${bs}x` means the same thing everywhere.
bs='\'
urldecode() { printf '%b' "${1//%/${bs}x}"; }

rest="${DATABASE_URL#mysql://}"
creds="${rest%@*}"
hostpart="${rest##*@}"
hostpart="${hostpart%%\?*}"
DB_USER="$(urldecode "${creds%%:*}")"
DB_PASS="$(urldecode "${creds#*:}")"
hostport="${hostpart%%/*}"
DB_NAME="${hostpart#*/}"
DB_HOST="${hostport%%:*}"
if [ "$hostport" != "$DB_HOST" ]; then
  DB_PORT="${hostport#*:}"
else
  DB_PORT=3306
fi

MYSQL="mysql -h $DB_HOST -P $DB_PORT -u $DB_USER $DB_NAME"
export MYSQL_PWD="$DB_PASS"

gen_uuid() {
  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen
  elif [ -r /proc/sys/kernel/random/uuid ]; then
    cat /proc/sys/kernel/random/uuid
  else
    # Fallback: build a v4-shaped UUID from random hex (not cryptographically
    # exact v4 bits, but unique enough for a primary key).
    hex="$(openssl rand -hex 16)"
    printf '%s-%s-%s-%s-%s\n' \
      "${hex:0:8}" "${hex:8:4}" "${hex:12:4}" "${hex:16:4}" "${hex:20:12}"
  fi
}

$MYSQL -e "SELECT 1" >/dev/null || {
  echo "Could not connect to $DB_HOST:$DB_PORT/$DB_NAME as $DB_USER" >&2
  exit 1
}

# Prisma creates this bookkeeping table itself on a brand-new database; since
# we're bypassing the Prisma CLI entirely, create it ourselves (same schema
# Prisma's migration engine uses) so `prisma migrate status` stays accurate
# from a dev machine pointed at this database.
$MYSQL -e "CREATE TABLE IF NOT EXISTS _prisma_migrations (
  id VARCHAR(36) PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  finished_at DATETIME(3),
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at DATETIME(3),
  started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  applied_steps_count INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"

applied_count=0
for dir in "$MIGRATIONS_DIR"/*/; do
  name="$(basename "$dir")"
  sql_file="$dir/migration.sql"
  [ -f "$sql_file" ] || continue

  already_applied="$($MYSQL -N -e \
    "SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name = '$name' AND finished_at IS NOT NULL" \
    2>/dev/null || echo 0)"

  if [ "$already_applied" != "0" ]; then
    echo "skip (already applied): $name"
    continue
  fi

  echo "applying: $name"
  checksum="$(sha256sum "$sql_file" | cut -d' ' -f1)"
  id="$(gen_uuid)"
  started_at="$(date -u +'%Y-%m-%d %H:%M:%S.%3N')"

  if ! $MYSQL < "$sql_file"; then
    echo "FAILED applying $name — fix the migration or restore from backup before retrying." >&2
    exit 1
  fi

  finished_at="$(date -u +'%Y-%m-%d %H:%M:%S.%3N')"
  $MYSQL -e "INSERT INTO _prisma_migrations
    (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
    VALUES ('$id', '$checksum', '$finished_at', '$name', '$started_at', 1)"

  applied_count=$((applied_count + 1))
done

echo "done: $applied_count migration(s) applied"
