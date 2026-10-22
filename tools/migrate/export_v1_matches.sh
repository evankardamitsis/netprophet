#!/usr/bin/env bash
# After import_roster_matches.sql (-v sample=0) on the local stack: writes the v1 tournaments, events, matches,
# participants and results as one transaction of plain INSERT ... ON CONFLICT DO NOTHING, ready for
#   supabase --workdir .supabase-v2 db query --linked -f <out>
# The PG* environment must point at the LOCAL database (refuses anything that is not localhost/127.0.0.1).
# Players, accounts and profiles are never in the file. Re-applying it is a no-op.
#
#   PGHOST=127.0.0.1 PGPORT=54322 PGUSER=postgres PGDATABASE=postgres tools/migrate/export_v1_matches.sh out.sql
set -euo pipefail
OUT="${1:?usage: export_v1_matches.sh <out.sql>}"
case "${PGHOST:-localhost}" in
  localhost|127.0.0.1|/*) ;;
  *) echo "PGHOST=$PGHOST is not local; this reads the local staging copy only" >&2; exit 1 ;;
esac

# the local copy must hold v1 rows only in these tables (no hosted matches were mirrored)
other="$(psql -X -tA -c "select count(*) from core.matches where source_ref is distinct from 'v1:' || id::text")"
[ "$other" = "0" ] || { echo "$other local matches are not v1 rows; refusing to export them" >&2; exit 1; }

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
pg_dump --data-only --inserts --rows-per-insert=200 --on-conflict-do-nothing --no-owner --no-privileges \
  -t core.tournaments -t core.tournament_events -t core.matches -t core.match_participants -t core.match_results \
  -f "$tmp"
{
  echo 'begin;'
  # pg_dump 17.6+ writes \restrict lines (psql only; the Management API runs plain SQL), and transaction_timeout
  # exists on PostgreSQL 17 only (hosted is 17 today; dropping it keeps the file valid for any version)
  grep -v -E '^(\\(un)?restrict |SET transaction_timeout)' "$tmp"
  echo 'commit;'
} > "$OUT"
echo "wrote $OUT: $(grep -c '^INSERT' "$OUT") INSERT statements"
echo "rows: $(psql -X -tA -c "select format('tournaments %s, events %s, matches %s, participants %s, results %s',
  (select count(*) from core.tournaments), (select count(*) from core.tournament_events), (select count(*) from core.matches),
  (select count(*) from core.match_participants), (select count(*) from core.match_results))")"
