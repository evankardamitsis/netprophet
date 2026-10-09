#!/usr/bin/env bash
# Apply supabase-v2/migrations to a FRESH database, load seed.sql, then run the pgTAP files in supabase-v2/tests.
#
# Modes (V2_DB_MODE):
#   auto    docker if it works, else local                      (default)
#   docker  build supabase-v2/tests/Dockerfile (postgres:17 + pgTAP), run it, test, remove it   (CI uses this)
#   local   throw-away cluster from locally installed PostgreSQL binaries + postgresql-NN-pgtap
#   url     an existing server: set PGHOST PGPORT PGUSER PGPASSWORD (superuser, pgTAP installed)
# V2_DB_STUB=0 skips the Supabase stand-ins (roles, auth, storage) when the server already has them.
# KEEP=1 keeps the database / container for debugging.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="$ROOT/supabase-v2"
MODE="${V2_DB_MODE:-auto}"
DBNAME="np_v2_test"
WORK="$(mktemp -d)"
CONTAINER=""
PGBIN=""
PGDATA_DIR=""

log() { printf '\n== %s\n' "$*"; }
cleanup() {
  if [ "${KEEP:-0}" = "1" ]; then echo "KEEP=1: leaving database/cluster in place ($MODE)"; return; fi
  if [ -n "$CONTAINER" ]; then docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; fi
  if [ -n "$PGDATA_DIR" ] && [ -n "$PGBIN" ]; then
    runuser_pg "$PGBIN/pg_ctl" -D "$PGDATA_DIR" -m immediate stop >/dev/null 2>&1 || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

runuser_pg() { # run as the postgres OS user when we are root (initdb/postgres refuse to run as root)
  if [ "$(id -u)" = "0" ]; then runuser -u postgres -- "$@"; else "$@"; fi
}

start_docker() {
  command -v docker >/dev/null && docker info >/dev/null 2>&1 || return 1
  log "docker: building postgres:17 + pgTAP"
  docker build -q -t np-v2-pg:17 -f "$DB/tests/Dockerfile" "$DB/tests" >/dev/null || return 1
  CONTAINER="np-v2-db-$$"
  docker run -d --rm --name "$CONTAINER" -e POSTGRES_PASSWORD=postgres -p 127.0.0.1::5432 np-v2-pg:17 >/dev/null || return 1
  export PGHOST=127.0.0.1 PGUSER=postgres PGPASSWORD=postgres
  PGPORT="$(docker port "$CONTAINER" 5432/tcp | head -n1 | sed 's/.*://')"; export PGPORT
  for _ in $(seq 1 60); do
    if psql -X -d postgres -tAc 'select 1' >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}

start_local() {
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -n1 || true)"
  [ -n "$PGBIN" ] || { echo "no local PostgreSQL binaries found (apt install postgresql postgresql-NN-pgtap)"; return 1; }
  log "local: throw-away cluster from $PGBIN"
  PGDATA_DIR="$WORK/data"
  mkdir -p "$PGDATA_DIR" "$WORK/sock"
  if [ "$(id -u)" = "0" ]; then chown -R postgres "$WORK"; chmod 755 "$WORK"; fi
  runuser_pg "$PGBIN/initdb" -D "$PGDATA_DIR" -U postgres -E UTF8 --locale=C.UTF-8 --auth=trust >/dev/null
  runuser_pg "$PGBIN/pg_ctl" -D "$PGDATA_DIR" -w -l "$WORK/pg.log" \
    -o "-p 54329 -k $WORK/sock -c listen_addresses='' -c fsync=off" start >/dev/null
  export PGHOST="$WORK/sock" PGPORT=54329 PGUSER=postgres
  unset PGPASSWORD || true
}

case "$MODE" in
  docker) start_docker || { echo "docker mode failed"; exit 2; } ;;
  local)  start_local  || exit 2 ;;
  url)    : "${PGHOST:?set PGHOST/PGPORT/PGUSER/PGPASSWORD for url mode}" ;;
  auto)   start_docker || { echo "docker unavailable, falling back to local"; start_local || exit 2; } ;;
  *) echo "unknown V2_DB_MODE=$MODE"; exit 2 ;;
esac

export PGOPTIONS="-c client_min_messages=warning"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

log "creating fresh database $DBNAME"
"${PSQL[@]}" -d postgres -c "drop database if exists $DBNAME" -c "create database $DBNAME encoding 'UTF8' template template0 lc_collate 'C.UTF-8' lc_ctype 'C.UTF-8'" 2>/dev/null \
  || "${PSQL[@]}" -d postgres -c "drop database if exists $DBNAME" -c "create database $DBNAME encoding 'UTF8' template template0"
export PGDATABASE="$DBNAME"
"${PSQL[@]}" -c "alter database $DBNAME set search_path = public, extensions"

if [ "${V2_DB_STUB:-1}" = "1" ]; then
  log "supabase stand-ins (roles, auth, storage)"
  "${PSQL[@]}" -f "$DB/tests/support/supabase_stub.sql"
fi
"${PSQL[@]}" -c "create schema if not exists extensions" -c "create extension if not exists pgtap with schema extensions"

log "migrations"
for f in $(ls "$DB"/migrations/*.sql | sort); do
  echo "  $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done

log "seed.sql"
"${PSQL[@]}" -f "$DB/seed.sql"

log "test helpers"
"${PSQL[@]}" -f "$DB/tests/support/helpers.sql"

log "pgTAP"
PASS=0; FAIL=0; FILES=0; BAD=0
for t in $(ls "$DB"/tests/*.test.sql | sort); do
  FILES=$((FILES + 1))
  out="$WORK/$(basename "$t").tap"
  if ! psql -X -q -t -A -v ON_ERROR_STOP=1 -f "$t" >"$out" 2>"$out.err"; then
    echo "FAIL $(basename "$t") (sql error)"; cat "$out.err"; BAD=$((BAD + 1)); continue
  fi
  p=$(grep -c '^ok ' "$out" || true); f=$(grep -c '^not ok ' "$out" || true)
  PASS=$((PASS + p)); FAIL=$((FAIL + f))
  if [ "$f" != "0" ] || grep -q '^# Looks like' "$out"; then
    echo "FAIL $(basename "$t")"; grep -E '^(not ok|#)' "$out" || true; BAD=$((BAD + 1))
  else
    echo "ok   $(basename "$t")  ($p assertions)"
  fi
done

log "result: $PASS passed, $FAIL failed, across $FILES files"
[ "$BAD" = "0" ] && [ "$FAIL" = "0" ] && [ "$PASS" -gt 0 ]
