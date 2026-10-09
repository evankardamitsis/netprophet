# v1 to v2 data migration

Scope (founder decision, 9 Oct 2026): only the **roster (players), users/profiles with claims, tournaments, matches and results** move. **All coins, bets, parlays, transactions, power-ups, rewards and balances are dropped for everyone.** v2 is a new Supabase project; v1 stays read-only for 12 months after cutover.

Nothing in this file has been run. v1 column names below come from `backup/migrations-20251021-135848/` and `supabase/migrations/`; before the first rehearsal take `pg_dump --schema-only` of v1 prod into `supabase/legacy/v1_schema.sql` and check every name against it (the v1 chain cannot be replayed, so the dump is the reference).

## 1. Table by table

Legend: **keep** = copied, **map** = transformed, **derive** = recomputed in v2, **drop** = not migrated (archived with the v1 dump).

### auth.users and identities
| v1 | v2 | Rule |
|---|---|---|
| `auth.users` (id, email, created_at, raw_user_meta_data) | `auth.users` | **keep** with the same UUIDs so every foreign key stays valid. Insert through the Admin API or a direct insert with `email_confirmed_at` set. Do **not** carry `encrypted_password`: v2 login is email OTP, Google and Apple. Users type their email, get a code, done. |
| `auth.identities` | `auth.identities` | **keep** the `google` identities (same OAuth client, so the same `sub` matches). `email` identities are recreated by GoTrue on first OTP login. Apple is new. |
| sessions, refresh tokens, MFA | none | **drop**. Different JWT secret, everyone signs in once. Say so in the T-7 comms. |

The `on_auth_user_created` trigger creates a `profiles` and `user_game_state` row for every inserted user. The ETL therefore inserts users first and **upserts** profiles afterwards (`on conflict (user_id) do update`).

### profiles -> core.profiles
| v1 `public.profiles` | v2 `core.profiles` | Rule |
|---|---|---|
| id | user_id | keep (= auth uid) |
| first_name, last_name | first_name, surname | keep |
| (first + last), else email local part | display_name | map |
| language_preference / preferred_language (`en`,`el`) | locale | map; null becomes `el` |
| is_admin | role | map: true becomes `admin`, else `user`. Editors are set by hand after cutover |
| claimed_player_id | claimed_player_id | keep. Load profiles **before** players, or set claims last (see 3 below) |
| profile_claim_status (`pending`,`claimed`,`creation_requested`,`completed`) | claim_status | map: `pending` to `none`; `claimed` to `claimed`; `creation_requested` to `creation_requested`; `completed` to `claimed` when claimed_player_id is set, else `skipped` |
| profile_claim_completed_at | claim_completed_at | keep |
| terms_accepted, terms_accepted_at | onboarding_state `{"terms": {"accepted": true, "at": …}}` | map. Ask for acceptance again in v2 onboarding anyway |
| created_at | created_at | keep |
| balance, daily_login_streak, leaderboard_points, base_leaderboard_points, last_leaderboard_update, welcome_bonus_claimed, safe_bet_tokens, has_tournament_pass, tournament_pass_used, current/best winning streak, total_picks, total_correct_picks, accuracy_percentage, win_rate | none | **drop** (coins, bets, v1 game stats) |
| profile_creation_requested (+ by, at) | none | **drop** from the table; export pending creation requests to a CSV for the admin to handle by hand (`moderation_queue` is not in the baseline yet) |
| anything else | none | **drop** |

New v2 defaults: `primary_sport='tennis'`, `tz='Europe/Athens'`, `hidden=false`. Area, hand and gender are collected again in onboarding unless the claimed player already has them.

### players -> core.players + core.player_sports
| v1 `public.players` | v2 | Rule |
|---|---|---|
| id | players.id | keep (matches and claims reference it) |
| first_name, last_name | first_name, surname | keep. `first_name_norm`, `surname_norm`, `search_norm` are generated columns, nothing to copy |
| (generated) | name_forms | **derive**: a TS step calls `packages/copy` Greek helpers (accusative, genitive, vocative) and an admin spot-checks 50 names |
| slug | slug | keep (unique); generate for nulls |
| gender | gender | map: `male`/`m`/`M` to `m`, `female`/`f`/`F` to `f`, anything else to null (report the count) |
| age | birth_year, is_minor | map: `birth_year = year(created_at) - age` when 5 <= age <= 90; `is_minor = age < 18` (this flag keeps minors out of dynamic quiz cards, so be conservative: unknown age and a junior tournament entry also sets it) |
| photo_url | photo_path | map: copy the object to bucket `athlete-photos` at `<player_id>/<file>` and store that path |
| claimed_by_user_id | claimed_by_user_id | keep; the `player_claim_sync` trigger fills `profiles.claimed_player_id` |
| is_hidden, is_active | hidden | **do not copy**. In v1, `is_hidden=true, is_active=false` meant "unclaimed placeholder" and was required for claiming; in v2 `hidden` means "this person asked to be hidden". Set `hidden=false` for everyone, then the admin reviews the roster |
| is_demo_player | none | **drop** demo players that no migrated match references; migrate and mark `status='pending'` the few that do, for review |
| hand (`left`,`right`) | player_sports.hand | map to `L`/`R` |
| ntrp_rating | player_sports.initial_level | map; `level_status='pending'`, `level_tier` null until the first `recompute_levels` run |
| wins, losses, doubles_wins, doubles_losses, last5, doubles_last5, streaks, surface stats, win rates | player_sports.record, form | **derive** from migrated matches and results (not copied, so they cannot disagree with them) |
| aggressiveness, stamina, consistency, surface_preference, fatigue_level, injury_status, seasonal_form, notes, last_match_date | none | **drop** |
| (none) | area_id | null; the admin assigns areas, or they come from tournament venues later |
| (none) | source, status | `admin`, `active` |

### tournaments, categories
| v1 | v2 | Rule |
|---|---|---|
| tournaments.id | tournaments.id | keep; `external_ref = id::text`, `source='admin'`, `sport_id='tennis'` |
| name | name | keep |
| start_date, end_date | starts_on, ends_on | keep |
| location | venue | keep (area assigned by hand) |
| status `upcoming`/`active`/`finished`/`cancelled` | draw_state, active | map: `upcoming` to `open`; `active` to `drawn`; `finished` to `done`; `cancelled` to `done` with `active=false` |
| tournament_categories (name, gender `male`/`female`/`mixed`, skill_level_min/max) | tournament_events (name, gender `m`/`f`/`mixed`, level_min/max) | map; `format` from the tournament's `tournament_type`; non-numeric skill levels become null |
| description, surface, prize_pool, entry_fee, buy_in, max/current_participants, format (`knockout`…), age_min/max | none | **drop** (money and v1 economy) or keep in the archive |
| tournament_participants, tournament_teams, team_members, tournament_purchases | none | **not in this baseline**: there is no `tournament_entries` table yet. Archived in v1; add entries and pairs in a later migration if the Pro schedule needs them |

### matches, results
| v1 | v2 | Rule |
|---|---|---|
| matches.id | matches.id | keep; `source='admin'`, `source_ref='v1:'||id`, `provenance={"v1_id": …}` |
| match_type (`singles`,`doubles`,`mixed`) | format | keep |
| player_a_id / player_b_id (singles) | match_participants side 1 / side 2, position 1 | map |
| player_a1_id, player_a2_id / player_b1_id, player_b2_id (doubles) | side 1 positions 1 and 2 / side 2 positions 1 and 2 | map |
| rows with only `player_a`/`player_b` text names (the oldest ones) | participants | map by `normalize_search(name)` against `players.search_norm`; unmatched rows go to the reject report |
| start_time / played_at | starts_at | keep |
| tournament_id, category_id | tournament_id, event_id | keep |
| round (enum `Round of 64` … `Finals`) | round | keep the English value; `packages/copy` renders Greek |
| court_number, location | venue | map |
| status `upcoming` | `scheduled` | |
| status `live` | `scheduled` (voting closes by `starts_at`) | |
| status `finished` | `confirmed` if a result row exists, else `played` | |
| status `cancelled`, `skipped` | `void` | |
| locked / lock_time | locked_at | map when set |
| (finished with result) | counts_for_levels | `true` |
| odds_a/b, prob_a/b, points_fav/dog, points_value, processed, is_parlay*, web_synced, web_sync_status, remove_after, execute_after | none | **drop** (odds, coins, v1 sync) |
| match_results.winner_id (or `match_winner_team` for doubles) | match_results.winner_side | map: 1 if the winner is on side 1 |
| match_results.set1_score … set5_score (`a-b`), setN_winner_*, setN_tiebreak_score, super_tiebreak_score | match_results.sets | map to winner-first: a set `a-b` becomes `{"w": a, "l": b}` when side A won the match, `{"w": b, "l": a}` when side B won (check in the dump that `a` is player A's games). Tiebreak `x-y` becomes `tb: [x, y]`; the super tie-break becomes `{"w":10,"l":8,"stb":true}` as the last set |
| match_results.created_by / created_at | entered_by / entered_at | keep; `result_version=1` |
| match_results.total_games, aces, double_faults, break_points | none | **drop** |

Rows that violate the v2 integrity triggers (mixed-gender singles, incomplete sides, incoherent scores) are **not forced in**: each match is inserted in its own savepoint and failures land in `etl.rejects(table, v1_id, reason, row)`, which the admin works through. Expect a handful.

### derived, dropped, archived
| v1 | v2 |
|---|---|
| head_to_head, doubles_head_to_head, partnerships | **derive** from results (no table in the baseline) |
| bets, parlays, transactions, coin_packs, daily_rewards, power_ups, user_power_ups, power_up_usage_log, tournament_purchases, dynamic_content | **drop**; `pg_dump` to the `legacy` schema of the v1 project (read-only 12 months) plus an encrypted offline archive |
| notifications, notification_retry_queue, admin_notifications, admin_in_app_notifications | **drop**, start fresh |
| email_templates, email_template_versions, email_template_variables | **keep** later, content rewritten for v2 (not in this baseline) |
| email_logs, mailerlite_logs | archive to `legacy` |
| storage `athlete-photos` (open write policy) | copy objects bucket to bucket under `<player_id>/`; the v2 bucket is owner-only |

### Optional steps, off by default (need a founder decision)
- **Founding frame**: `user_cosmetics(source='migration')` for `frame_founding` (seeded in `…000700_reference_data.sql`) for every migrated user. Flag `--grant-founding-frame`. Implementation plan 8.2 recommends it.
- **Pro time for people who paid real money for coin packs** (implementation plan 8.2): `entitlements(source='migration', status='active', ends_at=…)`. Flag `--grant-pro-for-purchasers`, input: a CSV from Stripe, because coin purchases are not migrated. This is a legal and accounting question first; coins themselves are dropped for everyone as decided.

## 2. Cutover script outline (stub, do not run)

Approach: restore only the needed v1 tables into a **staging schema** `v1` of the target database (never into `core`), then do the transformation in SQL, which is fast, idempotent and testable on a restored copy. A thin TS orchestrator does the parts SQL cannot (photos, Greek name forms, report).

```
tools/migrate/v1-to-v2.ts        orchestrator (outline below)
tools/migrate/sql/00_stage.sql   create schema v1, etl; reject table
tools/migrate/sql/10_users.sql … 60_verify.sql
```

```bash
# T-0 07:15, after v1 is read-only (outline)
pg_dump "$V1_DB_URL" --data-only --no-owner \
  -t public.profiles -t public.players -t public.tournaments -t public.tournament_categories \
  -t public.matches -t public.match_results -t auth.users -t auth.identities \
  | psql "$V2_DB_URL" -v ON_ERROR_STOP=1 -c 'create schema if not exists v1' # restore into schema v1 (rewrite search_path in the dump)
psql "$V2_DB_URL" -v ON_ERROR_STOP=1 -f tools/migrate/sql/00_stage.sql … 60_verify.sql
node tools/migrate/v1-to-v2.ts --photos --name-forms --report
```

```sql
-- 00_stage.sql
create schema if not exists etl;
create table if not exists etl.rejects (tbl text, v1_id uuid, reason text, row jsonb, at timestamptz default now());

-- 10_users.sql  (idempotent: ON CONFLICT everywhere)
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, created_at)
select id, email, coalesce(email_confirmed_at, now()), raw_user_meta_data, created_at from v1.users
on conflict (id) do nothing;                       -- trigger creates profiles + game state

insert into core.profiles as p (user_id, first_name, surname, display_name, locale, role, claim_status, claim_completed_at, created_at)
select id, first_name, last_name,
       coalesce(nullif(trim(coalesce(first_name,'')||' '||coalesce(last_name,'')), ''), split_part(email,'@',1)),
       case when coalesce(language_preference, 'el') = 'en' then 'en' else 'el' end,
       case when is_admin then 'admin' else 'user' end,
       case profile_claim_status when 'creation_requested' then 'creation_requested'
            when 'claimed' then 'claimed' when 'completed' then case when claimed_player_id is not null then 'claimed' else 'skipped' end
            else 'none' end,
       profile_claim_completed_at, created_at
from v1.profiles
on conflict (user_id) do update set first_name = excluded.first_name, surname = excluded.surname,
  display_name = excluded.display_name, locale = excluded.locale, role = excluded.role,
  claim_status = excluded.claim_status, claim_completed_at = excluded.claim_completed_at;

-- 20_players.sql
insert into core.players (id, first_name, surname, slug, gender, birth_year, is_minor, hidden, source, status, created_at)
select id, first_name, last_name, slug,
       case lower(gender) when 'male' then 'm' when 'm' then 'm' when 'female' then 'f' when 'f' then 'f' end,
       case when age between 5 and 90 then extract(year from created_at)::int - age end,
       coalesce(age < 18, false), false, 'admin', 'active', created_at
from v1.players p
where not coalesce(is_demo_player, false) or exists (select 1 from v1.matches m where p.id in (m.player_a_id, m.player_b_id, m.player_a1_id, m.player_a2_id, m.player_b1_id, m.player_b2_id))
on conflict (id) do nothing;

insert into core.player_sports (player_id, sport_id, hand, initial_level)
select id, 'tennis', case lower(hand) when 'left' then 'L' when 'right' then 'R' end, ntrp_rating from v1.players
where id in (select id from core.players) on conflict do nothing;

-- claims last, so the sync trigger finds the profile
update core.players c set claimed_by_user_id = p.claimed_by_user_id
from v1.players p where p.id = c.id and p.claimed_by_user_id is not null and c.claimed_by_user_id is null;

-- 30_tournaments.sql, 40_matches.sql: same pattern. Matches go in one DO block, one savepoint per match:
--   begin insert matches + match_participants + match_results; set constraints all immediate;
--   exception when others then insert into etl.rejects(...) end;

-- 60_verify.sql: counts and checksums, all must hold or the script exits non-zero
--   players:   (select count(*) from core.players)             = (select count(*) from v1.players) - demo_skipped
--   claims:    (select count(*) from core.profiles where claimed_player_id is not null) = v1 claimed count
--   matches:   core.matches (source_ref like 'v1:%') + etl.rejects(matches) = v1.matches
--   results:   core.match_results rows = v1 finished matches with a result - rejects
--   coins:     no table in core mentions balance or coins (guard against a stray column)
--   ledger:    select count(*) from core.points_ledger = 0   (nothing is carried over)
```

```ts
// tools/migrate/v1-to-v2.ts (outline)
// 1. connect with the service role to v2; read-only connection to v1
// 2. --photos:      for each player with photo_url: download from v1 storage, upload to v2 athlete-photos/<id>/<file>, update photo_path
// 3. --name-forms:  for each player: name_forms = greekForms(first_name, surname, gender)   // packages/copy greek.ts
// 4. then, in order: recompute_levels(), refresh player_sports.record/form from results, rebuild h2h caches   // M3 jobs
// 5. --report:      write JSON/CSV: counts per table, etl.rejects, players without gender, pending claim requests,
//                   demo players kept, users without email
// Idempotent: every step is ON CONFLICT DO NOTHING / DO UPDATE; re-running is safe.
```

Timing and checks follow `docs/v2/implementation-plan.md` section 8.3 (rehearsal 1 at T-14, rehearsal 2 at T-3, final run at T-0 07:15, expected under 30 minutes at current size).

## 3. Things to settle before the first rehearsal

1. **Hidden players.** v1 used `is_hidden=true` for unclaimed placeholders; the claim flow depends on it. This ETL sets everyone to visible. Confirm that unclaimed roster players should appear on cards (the spec says yes, with a one-tap «Κρύψε με»).
2. **Pending claim requests** (`profile_creation_requested`): no `moderation_queue` yet, so they are exported to CSV.
3. **Tournament entries and teams** are archived, not migrated, until a `tournament_entries` table exists.
4. **Purchasers' compensation** (Pro time or refunds) is a founder and legal decision; coins are dropped for everyone as decided.
5. **v1 data quality** (gender nulls, text-only match rows, incoherent scores) is only known after the first restore; the reject report sizes the cleanup.
