-- Leagues: core.league_close_group matches closeGroup on the shared vectors; players join groups of 20 on their
-- first vote of the month; the month close ranks, moves and rewards once; next month starts in the new tier.
\set ON_ERROR_STOP on
\set lb `cat "${VECTORS_DIR:-packages/core/test-vectors}/leaderboard.json"`
begin;

create temp table lb (doc jsonb not null);
insert into lb values (:'lb'::jsonb);
grant select on lb to public;

select plan((select count(*)::int from lb, jsonb_array_elements(doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c) + 12);

-- parity
select is(core.league_close_group(c -> 'input'), c -> 'expected', 'closeGroup: ' || (c ->> 'name'))
  from lb, jsonb_array_elements(doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c;

-- last month: 21 players in Χάλκινη
create temp table pl as
select g, tests.create_user('lg-' || g || '@test.local') as id from generate_series(1, 21) g;
grant select on pl to public;
select core.league_join(id, core.month_key(now() - interval '40 days')) from pl order by g;
select is((select l.group_no from core.league_members m join core.leagues l on l.id = m.league_id
            where m.user_id = (select id from pl where g = 21)), 2, 'the 21st player opens a second group');

-- points: 1 has 200, 2 and 3 both 180 (3 got there first), then down by 10; 20 and 21 have none
insert into core.points_ledger (user_id, delta, reason, ref_type, ref_id, month_key, idempotency_key, created_at)
select id, case when g in (2, 3) then 180 else 210 - g * 10 end, 'correct', 'match', gen_random_uuid(),
       core.month_key(now() - interval '40 days'), 'lg-' || g,
       now() - interval '40 days' - case when g = 3 then interval '1 hour' else interval '0' end
  from pl where g <= 19;
select is(core.league_tick(), 21, 'the close runs over both groups');
select is((select final_rank from core.league_members where user_id = (select id from pl where g = 3)), 2,
          'a tie goes to who got there first');
select is((select outcome from core.league_members where user_id = (select id from pl where g = 1)), 'promoted', 'top 5 go up');
select is((select array_agg(outcome order by g) from core.league_members m join pl on pl.id = m.user_id where g in (6, 16, 20)),
          array['stayed', 'stayed', 'stayed'], 'nobody falls below Χάλκινη');
select is((select count(*)::int from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
            where c.key = 'frame_month_top' and uc.user_id in (select id from pl)), 3, 'the top 3 get the frame');
select is((select payload from core.feed_inbox where user_id = (select id from pl where g = 1) and payload ->> 'type' = 'league')
            - 'month',
          '{"type": "league", "tier": "bronze", "position": 1, "movement": "promote", "next_tier": "silver", "award": true}'::jsonb,
          'the winner gets the moment');
select ok(not exists (select 1 from core.feed_inbox where user_id in (select id from pl where g in (20, 21)) and payload ->> 'type' = 'league'),
          'no points, no moment');
select is((select counter from core.user_badges where user_id = (select id from pl where g = 1) and badge_key = 'month_top'), 1,
          'Κορυφαίος του μήνα counts');
select is(core.league_tick(), 0, 'a second run changes nothing');

-- this month: the winner's first vote lands in Ασημένια
select tests.mk_match_fresh() as m \gset
select tests.login((select id from pl where g = 1));
select api.cast_vote(:'m'::uuid, 1);
select is(api.get_ladder('league', 20) -> 'league' ->> 'tier', 'silver', 'up a tier this month');
select is((api.get_ladder('friends', 20) ->> 'has_league')::boolean, true, 'every scope says there is a league');
select tests.logout();

select * from finish();
rollback;
