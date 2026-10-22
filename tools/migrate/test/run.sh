#!/usr/bin/env bash
# Test of tools/migrate/sql/import_roster_matches.sql on a small v1 fixture (tie-break-only sets, a duplicate
# v1 result, a player merged on v2, a v1 data error). Needs a LOCAL server (PG* env, superuser) and a database
# that already has every supabase-v2 migration applied, given as the template:
#   KEEP=1 V2_DB_MODE=docker scripts/v2-db-test.sh      # leaves np_v2_test running, or any throwaway copy
#   tools/migrate/test/run.sh np_v2_test
# Works on a copy (np_migrate_test) that is dropped at the end; the template is not touched.
set -euo pipefail
TEMPLATE="${1:?usage: tools/migrate/test/run.sh <database with the v2 migrations>}"
case "${PGHOST:-localhost}" in
  localhost|127.0.0.1|/*) ;;
  *) echo "PGHOST=$PGHOST is not local" >&2; exit 1 ;;
esac
HERE="$(cd "$(dirname "$0")" && pwd)"
DB=np_migrate_test
export PGOPTIONS="-c client_min_messages=warning"
P=(psql -X -q -v ON_ERROR_STOP=1)

"${P[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB template $TEMPLATE"
trap '"${P[@]}" -d postgres -c "drop database if exists $DB" >/dev/null 2>&1 || true' EXIT

"${P[@]}" -d "$DB" -f "$HERE/fixtures.sql"
# the v2 side before the cutover: the roster is there and player 5 was merged into player 1
"${P[@]}" -d "$DB" -c "
  insert into core.players (id, first_name, surname, gender, source, status)
  select id, first_name, last_name, 'm', 'import', 'active' from v1.players on conflict do nothing;
  update core.players set status = 'merged', merged_into = '00000000-0000-4000-8000-000000000001', hidden = true
   where id = '00000000-0000-4000-8000-000000000005';"
"${P[@]}" -d "$DB" -v sample=0 -f "$HERE/../sql/import_roster_matches.sql" >/dev/null
"${P[@]}" -d "$DB" -f "$HERE/assertions.sql"
# a second run changes nothing
"${P[@]}" -d "$DB" -v sample=0 -f "$HERE/../sql/import_roster_matches.sql" >/dev/null
n="$("${P[@]}" -d "$DB" -tA -c "select count(*) from core.matches where source_ref like 'v1:%'")"
[ "$n" = "4" ] || { echo "second run changed the match count to $n" >&2; exit 1; }
echo "ok: import_roster_matches.sql on the fixture, twice"
