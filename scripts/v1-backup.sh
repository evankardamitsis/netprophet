#!/usr/bin/env bash
# Full backup of the v1 Supabase database (project linked in supabase/, ref in supabase/.temp/project-ref)
# before v1 is paused. Writes outside git, to $V1_BACKUP_DIR (default ~/netprophet-backups/v1-<date>).
#
# Needs: Docker running, Supabase CLI logged in, the v1 database password
# (env SUPABASE_DB_PASSWORD, or typed at the prompt; it is never written to disk).
#
# Produces:
#   roles.sql   cluster roles
#   schema.sql  schema of the app schemas
#   data.sql    data of the app schemas (COPY)
#   auth.sql    data of the auth schema (users, identities)
#   full.dump   pg_dump custom format of the public, auth and storage schemas (pg_restore). Best effort:
#               the other Supabase-managed schemas are not readable by `postgres`, and a failure here
#               does not undo the four dumps above.
#   SHA256SUMS
# Storage objects (files in buckets) are not in the database and are not covered here.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF="$(cat "$ROOT/supabase/.temp/project-ref")"
POOLER="$(cat "$ROOT/supabase/.temp/pooler-url")"
OUT="${V1_BACKUP_DIR:-$HOME/netprophet-backups/v1-$(date +%Y%m%d-%H%M%S)}"

if [[ "$REF" != "mgojbigzulgkjomgirrm" ]]; then
  echo "supabase/ is linked to $REF, expected the v1 project mgojbigzulgkjomgirrm" >&2
  exit 1
fi
docker info >/dev/null 2>&1 || { echo "Docker is not running" >&2; exit 1; }

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  read -r -s -p "v1 database password: " SUPABASE_DB_PASSWORD
  echo
fi
export SUPABASE_DB_PASSWORD

# session pooler (5432), not the transaction pooler (6543): pg_dump needs a session.
# The password goes in PGPASSWORD, never in the URL.
DB_URL="$(printf '%s' "$POOLER" | sed -e 's|:\[YOUR-PASSWORD\]@|@|' -e 's|:6543/|:5432/|')"

mkdir -p "$OUT"
chmod 700 "$OUT"
cd "$OUT"

dump() { supabase db dump --workdir "$ROOT" --linked "$@"; }

# absolute paths: the CLI resolves a relative -f against --workdir (the repo), not the current directory
echo "roles"   && dump --role-only -f "$OUT/roles.sql"
echo "schema"  && dump -f "$OUT/schema.sql"
echo "data"    && dump --data-only --use-copy -f "$OUT/data.sql"
echo "auth"    && dump --data-only --use-copy --schema auth -f "$OUT/auth.sql"

echo "full"
if ! docker run --rm -e PGPASSWORD="$SUPABASE_DB_PASSWORD" -v "$OUT":/out postgres:17 \
  pg_dump --dbname="$DB_URL" --schema=public --schema=auth --schema=storage \
  --format=custom --no-owner --no-privileges --file=/out/full.dump; then
  echo "full.dump failed; roles/schema/data/auth .sql are complete" >&2
  rm -f full.dump
fi

shasum -a 256 ./*.sql ./*.dump 2>/dev/null > SHA256SUMS
chmod 600 ./*
ls -lh
echo "Backup written to $OUT"
