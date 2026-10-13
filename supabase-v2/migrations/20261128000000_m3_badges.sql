-- M3 part 4: badges. 16 badges, three tiers each (Χάλκινο, Ασημένιο, Χρυσό), counted from what happened: matches,
-- confirmations, kudos, votes, σερί, weeks. core.badges_refresh recomputes a player's counters from the facts (plus
-- the badge bonuses quests gave), stores them in user_badges and queues a celebration on every new tier; the third
-- tier gives Frame Level. Four badges can be worn on the player card. Badges never give points or change a level.
-- Not counted yet (their features do not exist): influencer, generous, season_veteran, month_top.

-- ---------------------------------------------------------------------------
-- Definitions, the same as packages/core (test-vectors/badge-defs.json)
-- ---------------------------------------------------------------------------
alter table core.badge_defs add column on_card boolean not null default false;
update core.badge_defs set on_card = key in ('first_serve', 'gentleman', 'in_a_row', 'variety');
update core.badge_defs set tier3_reward = '{"cosmetic": "frame_level"}' where key = 'month_top';

alter table core.profiles add column worn_badge text references core.badge_defs (key);

-- tier 0..3 for a counter (tierFor)
create or replace function core.badge_tier(p_thresholds int[], p_counter int)
returns int
language sql immutable parallel safe set search_path = ''
as $$
  select count(*)::int from unnest(p_thresholds) t where p_counter >= t
$$;

-- the badge table in the packages/core shape
create or replace function core.badge_defs_json()
returns jsonb
language sql stable set search_path = core, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', key, 'unit', counter, 'thresholds', to_jsonb(thresholds), 'hasCard', on_card)
                            order by sort), '[]'::jsonb)
    from core.badge_defs
$$;

-- ---------------------------------------------------------------------------
-- The counters, from the facts
-- ---------------------------------------------------------------------------
create or replace function core.badge_counters(p_user uuid)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  with me as (select id from core.players where claimed_by_user_id = p_user),
  played as (   -- matches with a result the player was in, and their side
    select m.id, m.format, m.starts_at, mp.side
      from core.matches m
      join core.match_participants mp on mp.match_id = m.id and mp.player_id in (select id from me)
     where m.status <> 'void' and exists (select 1 from core.match_results r where r.match_id = m.id)
  ),
  weeks as (    -- the Mondays of the weeks with a played match
    select distinct (d - (extract(isodow from d)::int - 1)) as wk
      from (select core.athens_day(starts_at) as d from played where starts_at is not null) x
  ),
  runs as (     -- consecutive weeks share wk - 7·rank
    select count(*) as n from (select wk, wk - (7 * row_number() over (order by wk))::int as grp from weeks) w group by grp
  ),
  vote_weeks as (
    select (day_key - (extract(isodow from day_key)::int - 1)) as wk, count(distinct day_key) as days
      from core.votes where user_id = p_user group by 1
  ),
  facts as (
    select 'first_serve' as k, (select count(*) from core.matches
                                 where logged_by = p_user and source = 'user' and status <> 'void')::int as n
    union all
    select 'nice_player', (select count(*) from core.match_confirmations c join core.matches m on m.id = c.match_id
                            where m.logged_by = p_user and m.status <> 'void' and c.state = 'confirmed'
                              and c.player_id not in (select id from me))::int
    union all
    select 'gentleman', (select count(*) from core.kudos where from_user_id = p_user)::int
    union all
    select 'beloved', (select count(distinct from_user_id) from core.kudos where to_player_id in (select id from me))::int
    union all
    select 'club_oracle', (select count(*) from core.votes where user_id = p_user and outcome = 'correct')::int
    union all
    select 'upset', (select count(*) from core.votes where user_id = p_user and outcome = 'correct' and is_upset_call)::int
    union all
    select 'in_a_row', coalesce((select streak_best from core.user_game_state where user_id = p_user), 0)
    union all
    select 'whole_week', (select count(*) from vote_weeks where days = 7)::int
    union all
    select 'doubles_player', (select count(*) from played p where p.format <> 'singles'
                               and exists (select 1 from core.match_confirmations c join core.match_participants mp
                                             on mp.match_id = c.match_id and mp.player_id = c.player_id
                                            where c.match_id = p.id and c.state = 'confirmed' and mp.side = p.side
                                              and c.player_id not in (select id from me)))::int
    union all
    select 'variety', (select count(distinct mp.player_id) from played p
                         join core.match_participants mp on mp.match_id = p.id and mp.side <> p.side)::int
    union all
    select 'steady', coalesce((select max(n) from runs), 0)::int
    union all
    select 'many_votes', (select count(*) from core.votes where user_id = p_user)::int
  ),
  bonus as (    -- what quests gave: «+5 στο badge …»
    select reward ->> 'key' as k, sum((reward ->> 'amount')::int)::int as n
      from core.user_quest_progress where user_id = p_user and reward ->> 'kind' = 'badge' group by 1
  )
  select jsonb_object_agg(d.key, coalesce(f.n, 0) + coalesce(b.n, 0))
    from core.badge_defs d
    left join facts f on f.k = d.key
    left join bonus b on b.k = d.key
$$;

-- store the counters, and on every new tier queue its celebration (p_quiet: store only, for the first fill)
create or replace function core.badges_refresh(p_user uuid, p_quiet boolean default false)
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_counters jsonb;
  r          record;
  v_ups      int := 0;
begin
  if p_user is null or not exists (select 1 from auth.users where id = p_user) then return 0; end if;
  v_counters := core.badge_counters(p_user);
  for r in
    select d.key, d.thresholds, (v_counters ->> d.key)::int as n, coalesce(u.tier, 0) as was
      from core.badge_defs d
      left join core.user_badges u on u.user_id = p_user and u.badge_key = d.key
  loop
    insert into core.user_badges (user_id, badge_key, counter, tier, tier_up_at)
    values (p_user, r.key, r.n, core.badge_tier(r.thresholds, r.n),
            case when core.badge_tier(r.thresholds, r.n) > 0 then now() end)
    on conflict (user_id, badge_key) do update
      set counter = excluded.counter,
          -- a tier is never taken back (a corrected match does not unearn a badge)
          tier = greatest(core.user_badges.tier, excluded.tier),
          tier_up_at = case when excluded.tier > core.user_badges.tier then now() else core.user_badges.tier_up_at end;
    if core.badge_tier(r.thresholds, r.n) > r.was then
      if core.badge_tier(r.thresholds, r.n) = 3 then
        insert into core.user_cosmetics (user_id, item_id, source)
        select p_user, id, 'earned' from core.cosmetic_items where key = 'frame_level'
        on conflict do nothing;
      end if;
      if not p_quiet then
        insert into core.feed_inbox (user_id, kind, ref, payload)
        values (p_user, 'celebration', 'badge:' || r.key || ':' || core.badge_tier(r.thresholds, r.n),
                jsonb_build_object('type', 'badge', 'badge', r.key, 'tier', core.badge_tier(r.thresholds, r.n), 'new', r.was = 0))
        on conflict (user_id, kind, ref) do nothing;
      end if;
      v_ups := v_ups + 1;
    end if;
  end loop;
  return v_ups;
end;
$$;
revoke all on function core.badges_refresh(uuid, boolean) from public;

-- everyone a match touches: who logged it and every claimed player in it
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
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- When to refresh
-- ---------------------------------------------------------------------------
create or replace function core.badges_on_user()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  perform core.badges_refresh(new.user_id);
  return null;
end;
$$;
create trigger badges_on_vote after insert or update of outcome on core.votes
  for each row execute function core.badges_on_user();
create trigger badges_on_streak after update of streak_best on core.user_game_state
  for each row when (new.streak_best is distinct from old.streak_best) execute function core.badges_on_user();
create trigger badges_on_quest_reward after update of reward on core.user_quest_progress
  for each row when (new.reward is not null and old.reward is null) execute function core.badges_on_user();

create or replace function core.badges_on_kudo()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  perform core.badges_refresh(new.from_user_id);
  perform core.badges_refresh((select claimed_by_user_id from core.players where id = new.to_player_id));
  return null;
end;
$$;
create trigger badges_on_kudo after insert on core.kudos for each row execute function core.badges_on_kudo();

create or replace function core.badges_on_match_fact()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  perform core.badges_refresh_match(new.match_id);
  return null;
end;
$$;
create trigger badges_on_result after insert or update on core.match_results
  for each row execute function core.badges_on_match_fact();
create trigger badges_on_confirmation after insert or update of state on core.match_confirmations
  for each row execute function core.badges_on_match_fact();

create or replace function core.badges_on_match()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if new.logged_by is not null then perform core.badges_refresh(new.logged_by); end if;
  return null;
end;
$$;
create trigger badges_on_match after insert or update of status on core.matches
  for each row execute function core.badges_on_match();

-- the week-based badges move with the calendar: a nightly pass
create or replace function core.badges_refresh_all()
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_u uuid; v_n int := 0;
begin
  for v_u in select id from auth.users loop
    v_n := v_n + core.badges_refresh(v_u);
  end loop;
  return v_n;
end;
$$;
revoke all on function core.badges_refresh_all() from public;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-refresh-badges', '40 0 * * *', $c$select core.badges_refresh_all()$c$);
  end if;
end;
$$;

-- the first fill: what everyone has already earned, without a celebration for each
do $$
declare v_u uuid;
begin
  for v_u in select id from auth.users loop
    perform core.badges_refresh(v_u, true);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- API
-- ---------------------------------------------------------------------------
-- every badge with my counter and tier, and the one I wear on my card
create or replace function api.get_badges()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return jsonb_build_object(
    'badges', (select coalesce(jsonb_agg(jsonb_build_object('key', d.key, 'counter', coalesce(u.counter, 0),
                                                            'tier', coalesce(u.tier, 0), 'thresholds', to_jsonb(d.thresholds),
                                                            'on_card', d.on_card) order by d.sort), '[]'::jsonb)
                 from core.badge_defs d
                 left join core.user_badges u on u.user_id = v_uid and u.badge_key = d.key),
    'worn', (select worn_badge from core.profiles where user_id = v_uid));
end;
$$;
revoke all on function api.get_badges() from public, anon;
grant execute on function api.get_badges() to authenticated, service_role;

-- «Βάλ’ το στην κάρτα»: one of the four card badges, once earned; null takes it off
create or replace function api.wear_badge(p_key text)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_key is not null then
    if not exists (select 1 from core.badge_defs where key = p_key and on_card) then
      raise exception 'not_a_card_badge' using errcode = '22023';
    end if;
    if not exists (select 1 from core.user_badges where user_id = v_uid and badge_key = p_key and tier >= 1) then
      raise exception 'not_earned' using errcode = '42501';
    end if;
  end if;
  update core.profiles set worn_badge = p_key where user_id = v_uid;
  return jsonb_build_object('worn', p_key);
end;
$$;
revoke all on function api.wear_badge(text) from public, anon;
grant execute on function api.wear_badge(text) to authenticated, service_role;
