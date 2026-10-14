-- The game level (founder, 14 Oct 2026): a user's level comes from the points they collect, not from a player's
-- results (players' levels stay hidden). Triangular on a step of 100: level 2 at 100, 3 at 300, 4 at 600, 5 at 1000,
-- no cap. packages/core/src/rules/gameLevel.ts is the rule; core.game_level runs the same vectors
-- (tests/86_game_level.test.sql reads packages/core/test-vectors/game-level.json).
--
--   1. core.sport_rules gains game_level_step (100), overridable in sports.config -> rules like the rest.
--   2. core.game_level(points, step): {level, into, span, next}.
--   3. Crossing into a new level queues one celebration {type: 'level', level: N} in feed_inbox (ref 'level:N', so
--      once per level). No backfill: users who already have points see their level on Εγώ and celebrate from the
--      next step on, instead of getting a pile of moments at once.
--   4. get_me: game.level {level, into, span, next}, and results_at (the newest result of the user's sport in the last
--      two weeks), which lights the dot on «Αποτελέσματα» until the tab is opened.

-- ---------------------------------------------------------------------------
-- 1. rules
-- ---------------------------------------------------------------------------
create or replace function core.sport_rules(p_sport text)
returns jsonb language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
           'correct', 10, 'upset', 30, 'chain', 5, 'daily_quiz', 30, 'freeze_max', 2,
           'free_freeze_every_votes', 15, 'first_free_freeze_at_streak', 3,
           'upset_share_max', 0.40, 'upset_min_votes', 10,
           'streak_milestones', jsonb_build_array(3, 5, 7, 10),
           'game_level_step', 100
         ) || coalesce((select config -> 'rules' from core.sports where id = p_sport), '{}'::jsonb)
$$;

-- ---------------------------------------------------------------------------
-- 2. the curve (core gameLevel)
-- ---------------------------------------------------------------------------
create or replace function core.game_level(p_points int, p_step int default 100)
returns jsonb language plpgsql immutable set search_path = core, pg_temp
as $$
declare
  v_p     bigint := greatest(coalesce(p_points, 0), 0);
  v_step  bigint := greatest(coalesce(p_step, 100), 1);
  v_l     bigint;
  v_start bigint;
  v_end   bigint;
begin
  v_l := greatest(1, floor((1 + sqrt(1 + 8.0 * v_p / v_step)) / 2)::bigint);
  while v_step * (v_l + 1) * v_l / 2 <= v_p loop v_l := v_l + 1; end loop;
  while v_l > 1 and v_step * v_l * (v_l - 1) / 2 > v_p loop v_l := v_l - 1; end loop;
  v_start := v_step * v_l * (v_l - 1) / 2;
  v_end := v_step * (v_l + 1) * v_l / 2;
  return jsonb_build_object('level', v_l, 'into', v_p - v_start, 'span', v_end - v_start, 'next', v_end - v_p);
end;
$$;

create or replace function core.user_game_level_step(p_user uuid)
returns int language sql stable security definer set search_path = core, pg_temp
as $$
  select coalesce((core.sport_rules(coalesce((select primary_sport from core.profiles where user_id = p_user), 'tennis'))
                   ->> 'game_level_step')::int, 100)
$$;
revoke all on function core.user_game_level_step(uuid) from public;

-- ---------------------------------------------------------------------------
-- 3. «Ανέβηκες level!»: one celebration per level reached
-- ---------------------------------------------------------------------------
create or replace function core.game_level_up()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_step int;
  v_old  int;
  v_new  int;
begin
  if new.total_points <= old.total_points then return null; end if;
  v_step := core.user_game_level_step(new.user_id);
  v_old := (core.game_level(old.total_points, v_step) ->> 'level')::int;
  v_new := (core.game_level(new.total_points, v_step) ->> 'level')::int;
  if v_new > v_old then
    insert into core.feed_inbox (user_id, kind, ref, payload)
    values (new.user_id, 'celebration', 'level:' || v_new, jsonb_build_object('type', 'level', 'level', v_new))
    on conflict (user_id, kind, ref) do nothing;
  end if;
  return null;
end;
$$;
revoke all on function core.game_level_up() from public;
create trigger user_game_state_level_up after update of total_points on core.user_game_state
  for each row execute function core.game_level_up();

-- ---------------------------------------------------------------------------
-- 4. get_me: the game level and the newest result
-- ---------------------------------------------------------------------------
create index if not exists matches_resolved_idx on core.matches (sport_id, resolved_at) where resolved_at is not null;

create or replace function api.get_me()
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_pro  boolean;
  v_rules jsonb;
  v_sport text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select primary_sport into v_sport from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  perform core.ensure_game_state(v_uid);
  v_rules := core.sport_rules(v_sport);
  v_pro := exists (select 1 from core.entitlements
                    where user_id = v_uid and key = 'pro' and status = 'active'
                      and starts_at <= now() and (ends_at is null or ends_at > now()));

  return jsonb_build_object(
    'user_id', v_uid,
    'profile', (select jsonb_build_object(
                  'first_name', pr.first_name, 'surname', pr.surname, 'display_name', pr.display_name,
                  'gender', pr.gender, 'area_id', pr.area_id, 'area_ids', pr.area_ids,
                  'primary_sport', pr.primary_sport, 'hand', pr.hand, 'locale', pr.locale, 'tz', pr.tz,
                  'hidden', pr.hidden, 'role', pr.role, 'onboarding_state', pr.onboarding_state,
                  'claim_status', pr.claim_status)
                from core.profiles pr where pr.user_id = v_uid),
    'player', (select jsonb_build_object(
                  'id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'photo_path', p.photo_path,
                  'level_tier', ps.level_tier, 'level_direction', ps.level_direction, 'level_status', ps.level_status,
                  'level_value', case when v_pro then ps.level_value end,    -- numbers are Pro-only
                  'record', ps.record, 'form', ps.form)
                from core.profiles pr
                join core.players p on p.id = pr.claimed_player_id
                left join core.player_sports ps on ps.player_id = p.id and ps.sport_id = pr.primary_sport
               where pr.user_id = v_uid),
    'game', (select jsonb_build_object(
                'total_points', gs.total_points,
                'month_points', coalesce((select sum(delta) from core.points_ledger l
                                           where l.user_id = v_uid and l.month_key = core.month_key()), 0),
                'streak', gs.streak, 'streak_best', gs.streak_best, 'chain', gs.chain,
                'votes_cast', gs.votes_cast, 'votes_correct', gs.votes_correct,
                'votes_to_next_free_freeze', greatest((v_rules ->> 'free_freeze_every_votes')::int - gs.votes_since_free_freeze, 0),
                'freezes', jsonb_build_object(
                  'free', (select count(*) from core.freezes f where f.user_id = v_uid and f.used_at is null and f.kind = 'free'),
                  'paid', (select count(*) from core.freezes f where f.user_id = v_uid and f.used_at is null and f.kind = 'paid'),
                  'max', (v_rules ->> 'freeze_max')::int),
                'level', core.game_level(gs.total_points, coalesce((v_rules ->> 'game_level_step')::int, 100)))
              from core.user_game_state gs where gs.user_id = v_uid),
    'pro', v_pro,
    'unlocks', coalesce((select jsonb_agg(unlock_key order by unlocked_at) from core.unlock_progress where user_id = v_uid), '[]'::jsonb),
    'inbox_unseen', (select count(*) from core.feed_inbox where user_id = v_uid and seen_at is null),
    'circle_count', (select count(*) from core.follows where user_id = v_uid),
    'results_at', (select max(m.resolved_at) from core.matches m
                    where m.sport_id = v_sport and m.resolved_at is not null and m.approved and m.status <> 'void'
                      and m.resolved_at > now() - interval '14 days' and m.resolved_at <= now())
  );
end;
$$;
