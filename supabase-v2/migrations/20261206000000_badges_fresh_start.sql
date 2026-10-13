-- Badges start fresh (founder, 13 Oct 2026): existing players begin with no badges, and badges only count what
-- happens in the app from the moment an account starts on v2. Each profile gets badges_since (the time of this
-- migration for everyone already here, the sign-up time for new accounts); the counters only read facts created
-- since then (matches, confirmations, kudos, votes, quest bonuses). Old v1 matches therefore never count, and a
-- player claimed later brings no badge history. Then everything badges gave is cleared and the counters are
-- refilled quietly. σερί and the unlock ladder are untouched.

alter table core.profiles add column badges_since timestamptz not null default now();

create or replace function core.badge_counters(p_user uuid)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  with me as (select id from core.players where claimed_by_user_id = p_user),
  since as (select coalesce((select badges_since from core.profiles where user_id = p_user), '-infinity'::timestamptz) as t),
  played as (   -- matches with a result the player was in, and their side
    select m.id, m.format, m.starts_at, mp.side
      from core.matches m
      join core.match_participants mp on mp.match_id = m.id and mp.player_id in (select id from me)
     where m.status <> 'void' and exists (select 1 from core.match_results r where r.match_id = m.id)
       and m.created_at >= (select t from since)
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
      from core.votes where user_id = p_user and created_at >= (select t from since) group by 1
  ),
  facts as (
    select 'first_serve' as k, (select count(*) from core.matches
                                 where logged_by = p_user and source = 'user' and status <> 'void'
                                   and created_at >= (select t from since))::int as n
    union all
    select 'nice_player', (select count(*) from core.match_confirmations c join core.matches m on m.id = c.match_id
                            where m.logged_by = p_user and m.status <> 'void' and c.state = 'confirmed'
                              and m.created_at >= (select t from since)
                              and c.player_id not in (select id from me))::int
    union all
    select 'gentleman', (select count(*) from core.kudos where from_user_id = p_user and created_at >= (select t from since))::int
    union all
    select 'beloved', (select count(distinct from_user_id) from core.kudos where to_player_id in (select id from me)
                         and created_at >= (select t from since))::int
    union all
    select 'club_oracle', (select count(*) from core.votes where user_id = p_user and outcome = 'correct' and created_at >= (select t from since))::int
    union all
    select 'upset', (select count(*) from core.votes where user_id = p_user and outcome = 'correct' and is_upset_call
                    and created_at >= (select t from since))::int
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
    select 'many_votes', (select count(*) from core.votes where user_id = p_user and created_at >= (select t from since))::int
    union all
    select 'month_top', (select count(*) from core.league_members lm
                          where lm.user_id = p_user and lm.final_rank <= 3 and lm.final_points > 0)::int
  ),
  bonus as (    -- what quests gave: «+5 στο badge …»
    select reward ->> 'key' as k, sum((reward ->> 'amount')::int)::int as n
      from core.user_quest_progress where user_id = p_user and reward ->> 'kind' = 'badge'
       and coalesce(reward_granted_at, done_at) >= (select t from since) group by 1
  )
  select jsonb_object_agg(d.key, coalesce(f.n, 0) + coalesce(b.n, 0))
    from core.badge_defs d
    left join facts f on f.k = d.key
    left join bonus b on b.k = d.key
$$;


-- clear what badges gave, then refill the counters from now (quiet: nothing to celebrate)
delete from core.user_cosmetics uc using core.cosmetic_items c
 where c.id = uc.item_id and uc.source = 'earned' and c.key in ('frame_level', 'kit_night');
delete from core.user_equipped e
 where not exists (select 1 from core.user_cosmetics uc where uc.user_id = e.user_id and uc.item_id = e.item_id)
   and exists (select 1 from core.cosmetic_items c where c.id = e.item_id and c.key in ('frame_level', 'kit_night'));
delete from core.feed_inbox where kind = 'celebration' and payload ->> 'type' = 'badge';
update core.profiles set worn_badge = null where worn_badge is not null;
delete from core.user_badges;
do $$
declare v_u uuid;
begin
  for v_u in select id from auth.users loop
    perform core.badges_refresh(v_u, true);
  end loop;
end;
$$;
