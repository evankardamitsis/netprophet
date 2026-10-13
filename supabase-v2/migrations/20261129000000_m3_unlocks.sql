-- M3 part 5: the unlock ladder. 13 steps from packages/core (UNLOCK_STEPS): each opens when its conditions hold
-- or when votes cast reach its backup; unlocks are sticky. core.unlocks_refresh evaluates a player's ladder from the
-- facts at the same moments badges refresh, stores new steps in unlock_progress and queues the prototype's «Νέο»
-- moment for the ones with something to show. Accounts that exist when this runs get the whole ladder, quietly.
-- The feed_inbox kind 'unlock' stays unused: unlock moments are celebrations (payload.type 'unlock').

-- ---------------------------------------------------------------------------
-- Definitions, the same as packages/core (test-vectors/unlock-defs.json)
-- ---------------------------------------------------------------------------
alter table core.unlock_defs add column features text[] not null default '{}';
alter table core.unlock_defs add column celebrate boolean not null default true;

delete from core.unlock_progress;   -- nothing was ever unlocked against the placeholder keys
delete from core.unlock_defs;
insert into core.unlock_defs (key, step, primary_rule, backup_votes, features, celebrate, title_el, title_en) values
('day1',            1, '[]',
   0, '{vote_cards,results,streak,points,daily_quiz,log_match_quiet}', false, 'Ψήφισε', 'Vote'),
('level_bar',       2, '[{"counter": "correctVotes", "min": 3}, {"counter": "activeDays", "min": 2}]',
   5, '{level_bar}', true, 'Το level σου', 'Your level'),
('first_freeze',    3, '[{"counter": "bestStreak", "min": 3}]',
   8, '{streak_moment,free_freeze}', false, 'Πρώτο πάγωμα', 'First freeze'),
('daily_quests',    4, '[{"counter": "votesCast", "min": 10}, {"counter": "activeDays", "min": 2}]',
   12, '{daily_quests}', true, 'Αποστολές', 'Quests'),
('bridge_line',     5, '[{"counter": "votesResolved", "min": 1}, {"counter": "activeDays", "min": 2}]',
   15, '{bridge_line}', false, 'Έπαιξες κι εσύ σήμερα;', 'Did you play today?'),
('ladder_friends',  6, '[{"counter": "votesCast", "min": 20}, {"counter": "activeDays", "min": 3}]',
   25, '{ladder_friends,invite_friend_quest}', true, 'Κατάταξη', 'Ladder'),
('kudos_reactions', 7, '[{"counter": "matchesConfirmed", "min": 1}]',
   20, '{kudos,reactions}', true, 'Μπράβο και αντιδράσεις', 'Kudos and reactions'),
-- the avatar and gifts screens do not exist yet: their steps open quietly
('avatar_profile',  8, '[{"counter": "fullQuestDays", "min": 3}]',
   35, '{avatar_3d,backgrounds,frames}', false, 'Εγώ', 'Me'),
('badges_shelf',    9, '[{"counter": "correctVotes", "min": 10}]',
   28, '{badges_shelf}', true, 'Badges', 'Badges'),
('pro_first_view', 10, '[{"counter": "bestStreak", "min": 5}]',
   30, '{pro_sheet,win_effect}', true, 'Pro', 'Pro'),
('weekly_quests',  11, '[{"counter": "activeDays", "min": 6}]',
   40, '{weekly_quests}', false, 'Αποστολές της εβδομάδας', 'Weekly quests'),
('gifts',          12, '[{"counter": "kudosGiven", "min": 3}]',
   50, '{gifts}', false, 'Κεράσματα', 'Gifts'),
('stats_area',     13, '[{"counter": "votesCast", "min": 45}]',
   45, '{stats,ladder_area}', true, 'Στατιστικά και Αττική', 'Stats and Attica');

-- the ladder in the packages/core shape
create or replace function core.unlock_defs_json()
returns jsonb
language sql stable set search_path = core, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', key, 'step', step, 'primary', primary_rule,
                                               'backupVotes', backup_votes, 'features', to_jsonb(features)) order by step), '[]'::jsonb)
    from core.unlock_defs
$$;

-- ---------------------------------------------------------------------------
-- The rule (parity with evaluateUnlocks)
-- ---------------------------------------------------------------------------
-- counters: UnlockCounters, previous: [keys], existing: unlock everything → {unlocked, newlyUnlocked}, ladder order
create or replace function core.unlock_evaluate(p_counters jsonb, p_previous jsonb, p_existing boolean default false)
returns jsonb
language sql stable set search_path = core, pg_temp
as $$
  with steps as (
    select d.key, d.step,
           p_previous ? d.key as had,
           coalesce(p_existing, false)
             or coalesce((p_counters ->> 'votesCast')::int, 0) >= d.backup_votes
             or not exists (select 1 from jsonb_array_elements(d.primary_rule) c
                             where coalesce((p_counters ->> (c ->> 'counter'))::int, 0) < (c ->> 'min')::int) as met
      from core.unlock_defs d
  )
  select jsonb_build_object(
           'unlocked',      coalesce(jsonb_agg(key order by step) filter (where had or met), '[]'::jsonb),
           'newlyUnlocked', coalesce(jsonb_agg(key order by step) filter (where met and not had), '[]'::jsonb))
    from steps
$$;

-- ---------------------------------------------------------------------------
-- The counters, from the facts (UnlockCounters spelling)
-- ---------------------------------------------------------------------------
-- an active day (packages/core activity.ts): 3 votes that Athens day, or a match logged that day
create or replace function core.unlock_counters(p_user uuid)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  with me as (select id from core.players where claimed_by_user_id = p_user),
  days as (
    select day_key as d from core.votes where user_id = p_user group by day_key having count(*) >= 3
    union
    select core.athens_day(created_at) from core.matches where logged_by = p_user and source = 'user' and status <> 'void'
  ),
  quest_days as (
    select period_key from core.user_quest_progress
     where user_id = p_user and done_at is not null
       and quest_key in (select key from core.quest_defs where period = 'daily' and active)
     group by period_key
    having count(*) = (select count(*) from core.quest_defs where period = 'daily' and active)
  )
  select jsonb_build_object(
    'votesCast',        (select count(*) from core.votes where user_id = p_user),
    'votesResolved',    (select count(*) from core.votes where user_id = p_user and resolved_at is not null),
    'correctVotes',     (select count(*) from core.votes where user_id = p_user and outcome = 'correct'),
    'activeDays',       (select count(*) from days),
    'kudosGiven',       (select count(*) from core.kudos where from_user_id = p_user),
    'matchesLogged',    (select count(*) from core.matches where logged_by = p_user and source = 'user' and status <> 'void'),
    'matchesConfirmed', (select count(distinct m.id) from core.matches m
                          where m.status = 'confirmed'
                            and (m.logged_by = p_user
                                 or exists (select 1 from core.match_participants mp
                                             where mp.match_id = m.id and mp.player_id in (select id from me)))),
    'bestStreak',       coalesce((select streak_best from core.user_game_state where user_id = p_user), 0),
    'fullQuestDays',    (select count(*) from quest_days))
$$;

-- ---------------------------------------------------------------------------
-- Refresh: store new steps, queue their moments
-- ---------------------------------------------------------------------------
create or replace function core.unlocks_refresh(p_user uuid, p_quiet boolean default false, p_existing boolean default false)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_counters jsonb;
  v_res      jsonb;
  v_key      text;
begin
  if p_user is null or not exists (select 1 from auth.users where id = p_user) then return null; end if;
  v_counters := core.unlock_counters(p_user);
  v_res := core.unlock_evaluate(
    v_counters,
    coalesce((select jsonb_agg(unlock_key) from core.unlock_progress where user_id = p_user), '[]'::jsonb),
    p_existing);
  for v_key in select jsonb_array_elements_text(v_res -> 'newlyUnlocked') loop
    insert into core.unlock_progress (user_id, unlock_key) values (p_user, v_key) on conflict do nothing;
    -- a σερί 5 already had its moment, so Pro opening with it stays quiet (prototype)
    if not p_quiet and (select celebrate from core.unlock_defs where key = v_key)
       and not (v_key = 'pro_first_view' and (v_counters ->> 'bestStreak')::int >= 5) then
      insert into core.feed_inbox (user_id, kind, ref, payload)
      values (p_user, 'celebration', 'unlock:' || v_key, jsonb_build_object('type', 'unlock', 'key', v_key))
      on conflict (user_id, kind, ref) do nothing;
    end if;
  end loop;
  return v_res;
end;
$$;
revoke all on function core.unlocks_refresh(uuid, boolean, boolean) from public;

-- the same moments as badges (20261128000000_m3_badges.sql), plus a finished daily quest
create or replace function core.badges_on_user()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  perform core.badges_refresh(new.user_id);
  perform core.unlocks_refresh(new.user_id);
  return null;
end;
$$;

create or replace function core.badges_on_kudo()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  perform core.badges_refresh(new.from_user_id);
  perform core.unlocks_refresh(new.from_user_id);
  perform core.badges_refresh((select claimed_by_user_id from core.players where id = new.to_player_id));
  return null;
end;
$$;

create or replace function core.badges_refresh_match(p_match uuid)
returns void
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_u uuid;
begin
  for v_u in
    select logged_by from core.matches where id = p_match and logged_by is not null
    union
    select p.claimed_by_user_id from core.match_participants mp join core.players p on p.id = mp.player_id
     where mp.match_id = p_match and p.claimed_by_user_id is not null
  loop
    perform core.badges_refresh(v_u);
    perform core.unlocks_refresh(v_u);
  end loop;
end;
$$;

create or replace function core.badges_on_match()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if new.logged_by is not null then
    perform core.badges_refresh(new.logged_by);
    perform core.unlocks_refresh(new.logged_by);
  end if;
  -- a confirmed match opens kudos for everyone in it
  if tg_op = 'UPDATE' and new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    perform core.badges_refresh_match(new.id);
  end if;
  return null;
end;
$$;

-- the nightly pass also catches up the ladder
create or replace function core.badges_refresh_all()
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_u uuid; v_n int := 0;
begin
  for v_u in select id from auth.users loop
    v_n := v_n + core.badges_refresh(v_u);
    perform core.unlocks_refresh(v_u);
  end loop;
  return v_n;
end;
$$;

-- everyone here before the ladder existed has all of it, without 13 moments
do $$
declare v_u uuid;
begin
  for v_u in select id from auth.users loop
    perform core.unlocks_refresh(v_u, true, true);
  end loop;
end;
$$;

-- a new account starts on step 1
create or replace function core.unlocks_on_profile()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  perform core.unlocks_refresh(new.user_id, true);
  return null;
end;
$$;
create trigger unlocks_on_profile after insert on core.profiles for each row execute function core.unlocks_on_profile();
