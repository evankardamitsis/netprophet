#!/usr/bin/env bash
# Supabase CLI for the v2 database without touching the v1 link in supabase/.
# The CLI only reads a folder named `supabase/`, so this works from .supabase-v2/ (gitignored), which holds a
# `supabase -> ../supabase-v2` symlink. Link state lands in supabase-v2/.temp (gitignored).
#
#   scripts/v2-db-remote.sh local-test     real Supabase stack in Docker (auth, storage, PostgREST): apply
#                                          migrations + seed, run the pgTAP suite against it, stop it again
#   scripts/v2-db-remote.sh link <ref>     link the v2 project (asks for the database password)
#   scripts/v2-db-remote.sh push           dry run, then apply migrations/ to the linked v2 project (no seed)
#   scripts/v2-db-remote.sh check          read-only check of the linked project: tables, views, RPCs
#
# The pgTAP suite needs seed.sql, so it runs on the local stack only. The real project gets migrations only;
# seeding it is the founder's call.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WD="$ROOT/.supabase-v2"
DB="$ROOT/supabase-v2"
V1_REF="mgojbigzulgkjomgirrm"

mkdir -p "$WD"
[ -L "$WD/supabase" ] || ln -s ../supabase-v2 "$WD/supabase"
sb() { supabase --workdir "$WD" "$@"; }

linked_ref() { cat "$DB/.temp/project-ref" 2>/dev/null || true; }
require_v2_link() {
  local ref; ref="$(linked_ref)"
  [ -n "$ref" ] || { echo "not linked: run scripts/v2-db-remote.sh link <ref>" >&2; exit 1; }
  [ "$ref" != "$V1_REF" ] || { echo "linked to the v1 project, refusing" >&2; exit 1; }
}

run_tests() {
  # PG* env must point at a database that already has migrations + seed applied
  local PSQL=(psql -X -q -v ON_ERROR_STOP=1)
  export PGOPTIONS="-c client_min_messages=warning"
  "${PSQL[@]}" -c "create extension if not exists pgtap with schema extensions"
  "${PSQL[@]}" -f "$DB/tests/support/helpers.sql"
  export VECTORS_DIR="$ROOT/packages/core/test-vectors"
  local out; out="$(mktemp -d)"
  local pass=0 fail=0 bad=0 t p f
  for t in $(ls "$DB"/tests/*.test.sql | sort); do
    if ! psql -X -q -t -A -v ON_ERROR_STOP=1 -f "$t" >"$out/tap" 2>"$out/err"; then
      echo "FAIL $(basename "$t") (sql error)"; cat "$out/err"; bad=$((bad + 1)); continue
    fi
    p=$(grep -c '^ok ' "$out/tap" || true); f=$(grep -c '^not ok ' "$out/tap" || true)
    pass=$((pass + p)); fail=$((fail + f))
    if [ "$f" != "0" ] || grep -q '^# Looks like' "$out/tap"; then
      echo "FAIL $(basename "$t")"; grep -E '^(not ok|#)' "$out/tap" || true; bad=$((bad + 1))
    else
      echo "ok   $(basename "$t")  ($p assertions)"
    fi
  done
  echo "assertions: $pass passed, $fail failed; files failing: $bad"
  [ "$bad" = "0" ]
}

case "${1:-}" in
  local-test)
    sb stop --no-backup >/dev/null 2>&1 || true
    sb start -x studio,imgproxy,inbucket,edge-runtime,logflare,vector,supavisor
    trap 'sb stop --no-backup >/dev/null 2>&1 || true' EXIT
    # connection of the throwaway local stack, as reported by the CLI (no credentials in this file)
    eval "$(sb status -o json 2>/dev/null | python3 -c '
import json, sys, shlex, urllib.parse as u
d = u.urlparse(json.load(sys.stdin)["DB_URL"])
for k, v in dict(PGHOST=d.hostname, PGPORT=d.port, PGUSER=d.username, PGPASSWORD=u.unquote(d.password or ""), PGDATABASE=d.path[1:]).items():
    print(f"export {k}={shlex.quote(str(v))}")
')"
    [ -n "${PGPORT:-}" ] || { echo "could not read DB_URL from supabase status" >&2; exit 1; }
    run_tests
    ;;
  link)
    ref="${2:?usage: link <project-ref>}"
    [ "$ref" != "$V1_REF" ] || { echo "that is the v1 project" >&2; exit 1; }
    sb link --project-ref "$ref"
    ;;
  push)
    require_v2_link
    sb db push --dry-run
    sb db push
    ;;
  check)
    require_v2_link
    sb db query --linked "select
        (select count(*) from information_schema.tables where table_schema = 'core' and table_type = 'BASE TABLE') as core_tables,
        (select count(*) from information_schema.views where table_schema = 'api') as api_views,
        (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'api') as api_functions,
        (select count(*) from core.sports) as sports,
        (select count(*) from core.players) as players"
    ;;
  *)
    sed -n '2,14p' "$0"; exit 2 ;;
esac
