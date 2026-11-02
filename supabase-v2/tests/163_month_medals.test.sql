-- Month medals: the top 3 with points of a closed group win gold, silver and bronze; staff are skipped and the next
-- players move up (medal, crown and Frame alike) while the board and promotion stay as closeGroup says; nobody
-- without points wins; a second close changes nothing; the shelf reads them; the winners' email RPCs are service
-- only, honour the switch and mark each medal once; the backfill rule gives the same result from the final ranks.
\set ON_ERROR_STOP on
begin;
select plan(29);

-- a past month nobody else uses: an admin on top, an editor 3rd, four players (one without points)
create temp table mp as
select * from (values
  ('s', tests.create_user('mm-s@test.local', 'admin'), 500),
  ('a', tests.create_user('mm-a@test.local'), 300),
  ('e', tests.create_user('mm-e@test.local', 'editor'), 250),
  ('b', tests.create_user('mm-b@test.local'), 200),
  ('c', tests.create_user('mm-c@test.local'), 100),
  ('d', tests.create_user('mm-d@test.local'), 0)) v(k, id, pts);
grant select on mp to public;
select core.league_join(id, '2020-01') from mp order by pts desc;
insert into core.points_ledger (user_id, delta, reason, ref_type, ref_id, month_key, idempotency_key)
select id, pts, 'correct', 'match', gen_random_uuid(), '2020-01', 'mm-' || k from mp where pts > 0;
select (select league_id from core.league_members where user_id = (select id from mp where k = 'a')) as lg \gset

select is(core.league_close(:'lg'::uuid), 6, 'the group closes');

-- the board and the moves are closeGroup's, staff included
select is((select array_agg(m.final_rank order by mp.pts desc) from core.league_members m join mp on mp.id = m.user_id),
          array[1, 2, 3, 4, 5, 6], 'staff keep their place on the board');
select is((select outcome from core.league_members where user_id = (select id from mp where k = 's')), 'promoted',
          'promotion is unchanged for staff');
select is((select outcome from core.league_members where user_id = (select id from mp where k = 'c')), 'promoted',
          'the 5th still goes up');

-- the prizes skip staff
select is((select array_agg(mp.k || mm.place order by mm.place) from core.month_medals mm join mp on mp.id = mm.user_id),
          array['a1', 'b2', 'c3'], 'gold, silver and bronze go to the top 3 players, staff skipped');
select is((select array_agg(distinct mm.month_key || ' ' || mm.tier) from core.month_medals mm join mp on mp.id = mm.user_id),
          array['2020-01 bronze'], 'a medal records its month and Κατηγορία');
select is((select array_agg(mp.k order by mp.pts desc) from core.user_cosmetics uc join core.cosmetic_items ci on ci.id = uc.item_id
             join mp on mp.id = uc.user_id where ci.key = 'gear_crown'), array['a'], 'the crown goes to the first player, not to staff');
select is((select array_agg(mp.k order by mp.pts desc) from core.user_cosmetics uc join core.cosmetic_items ci on ci.id = uc.item_id
             join mp on mp.id = uc.user_id where ci.key = 'frame_month_top'), array['a', 'b', 'c'], 'the Frame goes to the 3 players');
select ok(not exists (select 1 from core.month_medals where user_id = (select id from mp where k = 'd')), 'no points, no medal');

-- the moment names the medal
select is((select payload ->> 'medal' from core.feed_inbox where user_id = (select id from mp where k = 'a') and ref = 'league:' || :'lg'), '1',
          'the winner''s moment says gold');
select is((select payload ->> 'medal' from core.feed_inbox where user_id = (select id from mp where k = 'c') and ref = 'league:' || :'lg'), '3',
          'the 5th on the board gets bronze in the moment');
select is((select payload - 'month' from core.feed_inbox where user_id = (select id from mp where k = 's') and ref = 'league:' || :'lg'),
          '{"type": "league", "tier": "bronze", "position": 1, "movement": "promote", "next_tier": "silver", "award": false, "medal": null}'::jsonb,
          'staff get their moment without a prize');

-- again: nothing changes
select is(core.league_close(:'lg'::uuid), 0, 'a second close does nothing');
select is(core.month_medals_award(:'lg'::uuid), 3, 'the award runs again');
select is((select count(*)::int from core.month_medals where league_id = :'lg'::uuid), 3, 'and still three medals');

-- backfill rule: from the stored final ranks, the same three
delete from core.month_medals where league_id = :'lg'::uuid;
select is(core.month_medals_award(:'lg'::uuid), 3, 'the backfill rule awards a closed group');
select is((select array_agg(mp.k || mm.place order by mm.place) from core.month_medals mm join mp on mp.id = mm.user_id),
          array['a1', 'b2', 'c3'], 'with the same places');

-- a group where nobody scored: no medals
select tests.create_user('mm-z1@test.local') as z1 \gset
select tests.create_user('mm-z2@test.local') as z2 \gset
select core.league_join(:'z1'::uuid, '2020-02') as lz \gset
select core.league_join(:'z2'::uuid, '2020-02');
select is(core.league_close(:'lz'::uuid), 2, 'a group without points closes');
select is((select count(*)::int from core.month_medals where league_id = :'lz'::uuid), 0, 'and nobody wins a medal');

-- the shelf: mine, and the one of the account that holds a player
select tests.mk_player('Μ', 'Μεταλλίδης') as pl \gset
update core.players set claimed_by_user_id = (select id from mp where k = 'b') where id = :'pl'::uuid;
select tests.login((select id from mp where k = 'a'));
select is(api.get_medals(), '[{"month": "2020-01", "place": 1, "tier": "bronze"}]'::jsonb, 'my shelf');
select is(api.get_medals(:'pl'::uuid), '[{"month": "2020-01", "place": 2, "tier": "bronze"}]'::jsonb, 'a player''s shelf');
select throws_ok('select api.admin_medal_emails_due()', '42501', null, 'a user cannot read the winners');
select throws_ok($$select api.admin_medal_emails_sent('{}')$$, '42501', null, 'a user cannot mark them');
select tests.logout();

-- the email: c switched it off
update core.profiles set notification_prefs = notification_prefs || '{"medal_email": false}' where user_id = (select id from mp where k = 'c');
select tests.as_service();
select is((select array_agg(x ->> 'email' || ' ' || (x ->> 'place') || ' ' || (x ->> 'month') || ' ' || (x ->> 'tier') order by x ->> 'place')
             from jsonb_array_elements(api.admin_medal_emails_due()) x where x ->> 'email' like 'mm-%'),
          array['mm-a@test.local 1 2020-01 bronze', 'mm-b@test.local 2 2020-01 bronze'], 'the winners to email, without the one who said no');
select (select array_agg((x ->> 'id')::uuid) from jsonb_array_elements(api.admin_medal_emails_due()) x where x ->> 'email' like 'mm-%') as ids \gset
select is(api.admin_medal_emails_sent(:'ids'::uuid[]), 2, 'both marked as emailed');
select is(api.admin_medal_emails_sent(:'ids'::uuid[]), 0, 'marking again changes nothing');
select is((select count(*)::int from jsonb_array_elements(api.admin_medal_emails_due()) x where x ->> 'email' like 'mm-%'), 0,
          'each medal is emailed once');
select tests.logout();

-- a store review account plays but never takes a prize: the player behind it gets gold
create temp table mr as
select * from (values
  ('r', tests.create_user('play-review@monadlabs.gr'), 300),
  ('p', tests.create_user('mm-p@test.local'), 100)) v(k, id, pts);
grant select on mr to public;
select core.league_join(id, '2020-02') from mr order by pts desc;
insert into core.points_ledger (user_id, delta, reason, ref_type, ref_id, month_key, idempotency_key)
select id, pts, 'correct', 'match', gen_random_uuid(), '2020-02', 'mr-' || k from mr;
select (select league_id from core.league_members where user_id = (select id from mr where k = 'p')) as lr \gset
select is(core.league_close(:'lr'::uuid), 2, 'a group with a review account closes');
select is((select array_agg(mr.k || mm.place order by mm.place) from core.month_medals mm join mr on mr.id = mm.user_id),
          array['p1'], 'the review account is skipped, the player gets gold');

select * from finish();
rollback;
