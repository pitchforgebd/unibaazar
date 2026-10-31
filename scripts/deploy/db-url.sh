# Sourced, not executed: reads DATABASE_URL (from the environment, else from
# ./.env) and sets DB_USER, DB_PASS, DB_HOST, DB_PORT and DB_NAME. Shared by
# apply-migrations.sh and backup-db.sh, which both talk to MySQL with its own
# CLI tools — no Node, so they don't compete with the running app for the
# host's thread limit.

if [ -z "${DATABASE_URL:-}" ]; then
  if [ ! -f .env ]; then
    echo "DATABASE_URL not set and no .env in the current directory" >&2
    exit 1
  fi
  # Read the one line rather than `source`-ing .env: the URL's query string
  # contains an unquoted "&", which bash would run as a background job.
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
# and authentication failed.
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
if [ "$creds" != "${creds#*:}" ]; then
  DB_PASS="$(urldecode "${creds#*:}")"
else
  DB_PASS=""
fi
hostport="${hostpart%%/*}"
DB_NAME="${hostpart#*/}"
DB_HOST="${hostport%%:*}"
if [ "$hostport" != "$DB_HOST" ]; then
  DB_PORT="${hostport#*:}"
else
  DB_PORT=3306
fi
