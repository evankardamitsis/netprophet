-- NetProphet v2 baseline 6/8: the `api` schema, views part.
-- Views are security_invoker (RLS of the caller applies) unless noted. Only aggregates that must
-- not leak who voted are owner views (security_invoker = false) and say so.

create or replace function core.match_sides_json(p_match uuid)
returns jsonb language sql stable set search_path = core, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('side', s.side, 'players', s.players) order by s.side), '[]'::jsonb)
  from (
    select mp.side,
           jsonb_agg(jsonb_build_object(
             'id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'photo_path', p.photo_path,
             'area_id', p.area_id, 'level_tier', ps.level_tier, 'level_direction', ps.level_direction
           ) order by mp.position) as players
      from core.match_participants mp
      join core.players p on p.id = mp.player_id
      left join core.player_sports ps
             on ps.player_id = p.id and ps.sport_id = (select sport_id from core.matches where id = p_match)
     where mp.match_id = p_match
     group by mp.side
  ) s
$$;
grant execute on function core.match_sides_json(uuid) to authenticated, service_role;

-- reference
create view api.sports with (security_invoker = true) as
  select id, name_el, name_en, config, sort from core.sports;
create view api.areas with (security_invoker = true) as
  select id, region, name_el, name_en, sort from core.areas;
create view api.quest_defs with (security_invoker = true) as
  select key, period, target, counter, reward, title_el, title_en, sort from core.quest_defs;
create view api.badge_defs with (security_invoker = true) as
  select key, name_el, name_en, counter, thresholds, tier3_reward, sort from core.badge_defs;
create view api.cosmetic_items with (security_invoker = true) as
  select id, category, key, name_el, name_en, kind, price_eur, earn_rule_text, assets, sport_id from core.cosmetic_items;
create view api.sponsored_cards with (security_invoker = true) as
  select id, sponsor, title, subtitle, cta_url, placement, area_ids from core.sponsored_cards;

-- roster and competition
create view api.players with (security_invoker = true) as
  select id, first_name, surname, name_forms, slug, gender, birth_year, is_minor, area_id, photo_path,
         (claimed_by_user_id is not null) as is_claimed, status
    from core.players;
create view api.player_sports with (security_invoker = true) as
  select player_id, sport_id, hand, level_tier, level_direction, level_status, record, form
    from core.player_sports;
create view api.tournaments with (security_invoker = true) as
  select id, sport_id, name, area_id, venue, level_min, level_max, entry_deadline, starts_on, ends_on,
         draw_state, draw_published_at, active
    from core.tournaments;
create view api.tournament_events with (security_invoker = true) as
  select id, tournament_id, name, format, gender, level_min, level_max from core.tournament_events;
create view api.matches with (security_invoker = true) as
  select m.id, m.sport_id, m.format, m.status, m.starts_at, m.venue, m.area_id, m.tournament_id, m.round,
         m.source, m.counts_for_levels, m.created_at, core.match_sides_json(m.id) as sides
    from core.matches m;
create view api.match_results with (security_invoker = true) as
  select match_id, winner_side, sets, score_summary, retired, walkover, entered_at from core.match_results;

-- the signed-in user's own rows (RLS: user_id = auth.uid())
create view api.my_profile with (security_invoker = true) as
  select user_id, first_name, surname, display_name, gender, area_id, area_ids, primary_sport, hand,
         tournament_experience, locale, tz, hidden, onboarding_state, notification_prefs, role,
         claimed_player_id, claim_status, created_at
    from core.profiles;
create view api.my_votes with (security_invoker = true) as
  select id, subject_type, subject_id, option, created_at, resolved_at, outcome, is_upset_call, points, day_key
    from core.votes;
create view api.my_points_ledger with (security_invoker = true) as
  select id, delta, reason, ref_type, ref_id, month_key, created_at from core.points_ledger;
create view api.my_game_state with (security_invoker = true) as
  select user_id, total_points, streak, streak_best, chain, votes_cast, votes_correct,
         votes_since_free_freeze, active_days, last_active_day
    from core.user_game_state;
create view api.my_freezes with (security_invoker = true) as
  select id, kind, source, acquired_at, used_at from core.freezes;
create view api.my_follows with (security_invoker = true) as
  select player_id, relation, source, created_at from core.follows;
create view api.my_inbox with (security_invoker = true) as
  select id, kind, ref, payload, created_at, seen_at from core.feed_inbox;
create view api.my_quest_progress with (security_invoker = true) as
  select quest_key, period_key, progress, done_at, reward_granted_at from core.user_quest_progress;
create view api.my_badges with (security_invoker = true) as
  select badge_key, counter, tier, tier_up_at from core.user_badges;
create view api.my_unlocks with (security_invoker = true) as
  select unlock_key, unlocked_at, seen_at from core.unlock_progress;
create view api.my_cosmetics with (security_invoker = true) as
  select item_id, source, at from core.user_cosmetics;
create view api.my_equipped with (security_invoker = true) as
  select category, item_id from core.user_equipped;
create view api.my_entitlements with (security_invoker = true) as
  select id, key, source, status, starts_at, ends_at from core.entitlements;
create view api.my_notifications with (security_invoker = true) as
  select id, type, payload, channel, scheduled_at, sent_at, read_at, created_at from core.notifications;

-- OWNER VIEWS (security_invoker = false): aggregates only, never a voter identity.
-- Vote split of matches that already have a result (before that, splits come from cast_vote / get_feed after voting).
create view api.match_splits with (security_invoker = false) as
  select v.subject_id as match_id,
         count(*)::int as total,
         count(*) filter (where v.option = 1)::int as side1,
         count(*) filter (where v.option = 2)::int as side2
    from core.votes v
    join core.matches m on m.id = v.subject_id and m.approved and m.status <> 'void'
    join core.match_results r on r.match_id = m.id
   where v.subject_type = 'match'
   group by v.subject_id;

create view api.reaction_counts with (security_invoker = false) as
  select r.match_id, r.reaction_key, count(*)::int as n
    from core.reactions r
    join core.matches m on m.id = r.match_id and m.approved and m.status <> 'void'
   group by r.match_id, r.reaction_key;

-- monthly ladder base: points per user per month from the ledger (hidden profiles excluded)
create view api.leaderboard_monthly with (security_invoker = false) as
  select l.month_key, l.user_id, p.display_name, sum(l.delta)::int as points,
         rank() over (partition by l.month_key order by sum(l.delta) desc) as rank
    from core.points_ledger l
    join core.profiles p on p.user_id = l.user_id and not p.hidden and p.deleted_at is null
   group by l.month_key, l.user_id, p.display_name;

-- view privileges: signed-in users only (reference views also for anon)
revoke all on all tables in schema api from public, anon, authenticated;
grant select on all tables in schema api to authenticated, service_role;
grant select on api.sports, api.areas to anon;
