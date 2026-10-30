#!/bin/bash
# One-off audit: find any SQL statement in prisma/migrations that references a
# table name with different casing than the CREATE TABLE that defined it.
# MySQL on Windows (lower_case_table_names=1) treats names case-insensitively,
# so a mismatch like this applies silently in local dev/CI-on-Windows but
# fails on Linux (lower_case_table_names=0, the GitHub Actions / production
# host default) with "Table 'x' doesn't exist". Not meant to be run in CI —
# a manual check, kept here for the next time a migration is added by hand.
set -euo pipefail
cd "$(dirname "$0")/.."

declare -A canonical

for dir in $(ls prisma/migrations | sort); do
  f="prisma/migrations/$dir/migration.sql"
  [ -f "$f" ] || continue
  while IFS= read -r tbl; do
    [ -z "$tbl" ] && continue
    key=$(echo "$tbl" | tr '[:upper:]' '[:lower:]')
    if [ -n "${canonical[$key]:-}" ] && [ "${canonical[$key]}" != "$tbl" ]; then
      echo "CASE CHANGE at CREATE in $dir: was '${canonical[$key]}', now '$tbl'"
    fi
    canonical[$key]="$tbl"
  done < <(LC_ALL=C grep -oE 'CREATE TABLE `[^`]+`' "$f" | sed -E 's/CREATE TABLE `([^`]+)`/\1/')
done

echo "--- checking every reference against the table's CREATE-time name ---"

for dir in $(ls prisma/migrations | sort); do
  f="prisma/migrations/$dir/migration.sql"
  [ -f "$f" ] || continue
  while IFS= read -r ref; do
    [ -z "$ref" ] && continue
    key=$(echo "$ref" | tr '[:upper:]' '[:lower:]')
    canon="${canonical[$key]:-}"
    if [ -n "$canon" ] && [ "$canon" != "$ref" ]; then
      echo "MISMATCH in $dir: referenced \`$ref\`, but table was created as \`$canon\`"
    fi
  done < <(LC_ALL=C grep -oE '(ALTER TABLE|REFERENCES|DROP TABLE|RENAME TABLE|TRUNCATE TABLE) `[^`]+`' "$f" \
    | sed -E 's/^(ALTER TABLE|REFERENCES|DROP TABLE|RENAME TABLE|TRUNCATE TABLE) `([^`]+)`/\2/')
done

echo "--- done ---"
