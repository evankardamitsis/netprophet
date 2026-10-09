# supabase-v2

The v2 database: a squashed, hand-written baseline, a dev seed and a pgTAP suite. It is a **new Supabase project**, separate from v1 (`supabase/` is v1 and is not touched).

## Run it locally (one command)

```bash
scripts/v2-db-test.sh
```

It creates a fresh database, applies `migrations/` in order, loads `seed.sql`, runs every `tests/*.test.sql` with pgTAP, then regenerates `packages/db/src/types.ts` from the migrated database and fails if the committed file is stale. Exit code 0 means everything passed.

| Mode (`V2_DB_MODE`) | What it needs | Notes |
|---|---|---|
| `auto` (default) | docker, else local | falls back to `local` when Docker or the registry is unavailable |
| `docker` | Docker + host `psql` | builds `tests/Dockerfile` (`postgres:17` + pgTAP), runs it on a random port. **CI uses this.** |
| `local` | PostgreSQL binaries + pgTAP, e.g. `apt install postgresql-16 postgresql-16-pgtap` | throw-away cluster in a temp dir (run as root it uses the `postgres` OS user) |
| `url` | `PGHOST PGPORT PGUSER PGPASSWORD` of a superuser, pgTAP installed | creates database `np_v2_test` on that server |

Other switches: `KEEP=1` leaves the cluster or container running for debugging, `V2_DB_STUB=0` skips the Supabase stand-ins, `V2_DB_WRITE_TYPES=1` rewrites `packages/db/src/types.ts` instead of checking it.

On plain PostgreSQL the script first loads `tests/support/supabase_stub.sql`: the `anon` / `authenticated` / `service_role` roles, a minimal `auth.users` plus `auth.uid()` / `auth.role()` (same JWT-claim logic as PostgREST) and a `storage` schema with `buckets`, `objects` and `foldername()`. Against a real Supabase database those already exist, so use `V2_DB_STUB=0`.

Debug a single file against a kept database:

```bash
KEEP=1 V2_DB_MODE=local scripts/v2-db-test.sh
# connect with the PGHOST printed in the temp dir (…/sock), port 54329, database np_v2_test
psql -X -f supabase-v2/tests/30_resolve.test.sql
```

## Real Supabase (local stack and the v2 project)

`scripts/v2-db-remote.sh` drives the Supabase CLI from `.supabase-v2/` (a `supabase -> ../supabase-v2` symlink), so the v1 link in `supabase/` is never touched. Local ports are 5442x so the v2 stack runs next to v1.

```bash
scripts/v2-db-remote.sh local-test   # real auth/storage/PostgREST in Docker: migrations + seed + pgTAP
scripts/v2-db-remote.sh link <ref>   # link the netprophet-v2 project
scripts/v2-db-remote.sh push         # dry run, then apply migrations (no seed)
scripts/v2-db-remote.sh check        # read-only counts on the linked project
```

The suite needs `seed.sql`, so it runs on the local stack only; the real project gets migrations, and seeding it is a founder decision. Real Supabase blocks direct `delete from storage.objects` unless `storage.allow_delete_query` is set (the Storage API sets it), which `60_storage` does.

## Layout

```
migrations/   9 ordered, timestamp-named files (the squashed baseline plus the core-parity migration)
seed.sql      dev data: 20 Greek-named players, 2 tournaments, 10 matches, 3 test users
tests/        pgTAP: 00_schema, 10_rls, 20_cast_vote, 30_resolve, 40_streak_freeze, 50_claim_feed_me, 60_storage, 80_parity
tests/support supabase_stub.sql (plain-Postgres stand-ins), helpers.sql (test fixtures), Dockerfile
config.toml   Supabase CLI settings for the real project (api schema only, auth providers); not exercised here
migration-from-v1.md   v1 to v2 data mapping and the cutover script outline
```

| Migration | Contents |
|---|---|
| `…000000_schemas_and_helpers` | schemas `core` and `api`, `pg_trgm`, `core.normalize_search` (Greek + Greeklish), Athens day and month keys |
| `…000100_core_identity_competition` | sports, areas, players, player_sports, profiles, follows, tournaments, tournament_events, matches, match_participants, match_results, match_confirmations, match_links |
| `…000200_core_game_social_commerce` | votes, points_ledger, user_game_state, freezes, streak_events, feed_inbox, quests, badges, unlocks, traits, level_snapshots, leagues, quiz, kudos, reactions, gifts, cosmetics, entitlements, sponsored_cards, notifications, outbox |
| `…000300_functions_triggers` | auth helpers, new-user bootstrap, claim sync, match-side and result-coherence triggers, ledger append-only, freeze cap |
| `…000400_rls_grants_storage` | RLS on every table, grants, 111 policies, owner-only storage policies |
| `…000500_api_views` | 29 views in `api` |
| `…000600_rpc_game` | the RPCs |
| `…000700_reference_data` | tennis (and inactive padel, basketball, football), areas, quests, 16 badges, 13 unlock steps, reaction and kudos pools, free cosmetics |
| `…000800_core_rules_parity` | makes the SQL rules equal `packages/core` (upset under 40%, free freeze counted at cast time, resolution order, void/cancelled, lock instant) and adds `core.resolve_votes`, `core.apply_outcome` and the pure rule helpers; `tests/80_parity.test.sql` runs `packages/core/test-vectors` against them |

44 base tables in `core`, 29 views and 12 RPCs in `api`.

## How clients reach the data

- **Base tables live in `core`**, which PostgREST does not expose (`config.toml` exposes only `api`).
- **Reads** go through `api` views. Own-row views (`my_votes`, `my_points_ledger`, …) are `security_invoker`, so RLS (`user_id = auth.uid()`) applies. Three owner views (`match_splits`, `reaction_counts`, `leaderboard_monthly`) expose aggregates only, never who voted.
- **Writes** happen only through `SECURITY DEFINER` RPCs in `api` with an explicit auth check as the first statement and a pinned `search_path`. `authenticated` has no INSERT/UPDATE/DELETE on game, ledger, entitlement or profile tables (a pgTAP test asserts it).
- **Game numbers are data**: `sports.config -> 'rules'` (points, chain bonus, freeze cap, free-freeze cadence, upset thresholds). The SQL has defaults but no tennis literals.
- Types: `packages/db/src/types.ts` is generated from this database by `packages/db/scripts/gen-types.mjs` (needs only `psql`).

## RPCs (schema `api`)

| RPC | Who | What |
|---|---|---|
| `cast_vote(match_id, side, client_event_id?)` | signed in | before lock only (`starts_at`, `locked_at`, `status`, result present); one vote per user and match; the same vote again is a harmless replay; returns the split |
| `resolve_match(match_id)` | admin or service role | +10 per correct vote (+30 for a correct upset call, +5 chain bonus), ledger rows with idempotency keys, σερί, freezes, result cards; cancelled/void matches close votes as `none`, unconfirmed matches stay pending; safe to run twice |
| `admin_set_result(match_id, winner_side, sets, retired?, walkover?)` | admin, editor, service | validates the result (coherence trigger), confirms the match, queues `resolve_match` in `outbox` |
| `get_feed(limit?)` | signed in | result cards, then open matches (unvoted first, circle first, soonest), a labelled sponsored card after every 4th |
| `get_me()` | signed in | profile, claimed player, game state, freezes, Pro flag (level numbers only for Pro), unlocks |
| `find_matching_players(name, surname)` | signed in | claim lookup, surname first, Greeklish aware (ported from v1) |
| `search_players(q, limit?)` | signed in | token search over `search_norm` |
| `claim_player(player_id)` | signed in | one player per account, one account per player, idempotent |
| `follow_player`, `unfollow_player`, `update_profile`, `mark_inbox_seen` | signed in | whitelisted writes |

## Rule numbers (product-spec section 3) as implemented

- Correct vote +10, correct call of an upset +30 (winning side held under 35% of at least 10 votes), +5 chain bonus on a correct vote that continues a chain. "Οι 6 της ημέρας" +30 is in config but its RPC is not built yet.
- σερί = correct votes in a row; a wrong vote resets it to 0 unless a freeze absorbs it. Best (ΠΡ) is kept. Milestones 3, 5, 7, 10 queue a celebration.
- Freezes: max 2 held (DB trigger). First free freeze at σερί 3, then one free freeze every 15 votes (counted as votes resolve; held back while at the cap). A wrong vote consumes the free freeze first (keeps number and chain), else the paid one (keeps number, chain restarts).
- Periods are Europe/Athens: `core.athens_day()`, `core.month_key()`.

## Adding a migration

PRs add at most one new file after the baseline: `YYYYMMDDHHMMSS_short_name.sql`, plus tests. If you add a table, enable RLS on it in the same file (`alter table … enable row level security`) and add its grants and policies; `00_schema.test.sql` fails if any `core` table has RLS off. Run `V2_DB_WRITE_TYPES=1 scripts/v2-db-test.sh` when views or RPCs change.

## Deliberately not here yet

Ingestion tables (`ingest_*`), `products`/`purchases`, `daily_sets`, `regions` (areas carry a `region` column instead), `blocks`/`reports`, `moderation_queue`, `audit_log`, `player_aliases`, `h2h`/`partnerships`, `push_tokens`, email tables, and the jobs (pg_cron: match status, month close, nightly levels). Quest, badge and unlock progress tables exist but their engine is a later milestone. See the notes in the final section of `migration-from-v1.md` and the PR description for decisions that need the founder.
