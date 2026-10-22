-- A week back, and a finished tournament is only its draws (20270313000000_week_window_finished): get_tournament
-- returns the days from 7 days ago on; staff mark a tournament finished and it returns no days, keeps its draws, drops
-- out of the feed, and is listed as done. The old matches stay where results and players read them.
begin;
select plan(16);

select tests.create_user('ww-fan@test.local') as fan \gset
select tests.create_user('ww-staff@test.local', 'admin') as staff \gset
select tests.mk_player('Άρης', 'Ανατολής') as a \gset
select tests.mk_player('Βασίλης', 'Βορράς') as b \gset

insert into core.tournaments (sport_id, name, source, starts_on, ends_on)
values ('tennis', 'Week Open', 'import', current_date - 14, current_date + 10) returning id as t \gset
-- 10 and 8 days back are out, 7 days back (Athens) is the first day in
select tests.mk_match(:'a'::uuid, :'b'::uuid, now() - interval '10 days') as m10 \gset
select tests.mk_match(:'a'::uuid, :'b'::uuid, now() - interval '8 days') as m8 \gset
select tests.mk_match(:'a'::uuid, :'b'::uuid, (core.athens_day(now()) - 7)::timestamp at time zone 'Europe/Athens' + interval '12 hours') as m7 \gset
select tests.mk_match(:'a'::uuid, :'b'::uuid, now() - interval '2 days') as m2 \gset
select tests.mk_match(:'a'::uuid, :'b'::uuid, now() + interval '3 days') as mnext \gset
update core.matches set tournament_id = :'t'::uuid where id in (:'m10'::uuid, :'m8'::uuid, :'m7'::uuid, :'m2'::uuid, :'mnext'::uuid);
insert into core.tournament_draws (tournament_id, tab, discipline, level, format, size, draw)
values (:'t'::uuid, 'Μ 40+', 'MS', '40+', 'knockout', 2, jsonb_build_object(
  'entrants', jsonb_build_array(
    jsonb_build_object('pos', 1, 'raw', 'ΑΝΑΤΟΛΗΣ ΑΡΗΣ', 'players', jsonb_build_array(jsonb_build_object('raw', 'ΑΝΑΤΟΛΗΣ ΑΡΗΣ', 'player_id', :'a'::uuid))),
    jsonb_build_object('pos', 2, 'raw', 'ΒΟΡΡΑΣ ΒΑΣΙΛΗΣ', 'players', jsonb_build_array(jsonb_build_object('raw', 'ΒΟΡΡΑΣ ΒΑΣΙΛΗΣ', 'player_id', :'b'::uuid)))),
  'rounds', '[]'::jsonb));

-- ── the week back ──
select tests.login(:'fan'::uuid);
select api.get_tournament(:'t'::uuid) as one \gset
select tests.logout();
select is(:'one'::jsonb ->> 'state', 'ongoing', 'on now');
select is((select count(*)::int from jsonb_array_elements(:'one'::jsonb -> 'days') d, jsonb_array_elements(d -> 'matches')), 3,
          'the schedule: 7 days back, 2 days back and the next one; not 8 or 10 days back');
select is((select min(d ->> 'date') from jsonb_array_elements(:'one'::jsonb -> 'days') d), (core.athens_day(now()) - 7)::text,
          'the first day is today minus 7 (Athens)');
select is(jsonb_array_length(:'one'::jsonb -> 'draws'), 1, 'the draw is there');
select is((select count(*)::int from core.matches where tournament_id = :'t'::uuid), 5, 'older matches stay in the database');

-- ── the feed carries the coming match while the tournament is on ──
select tests.login(:'fan'::uuid);
select is((select count(*)::int from jsonb_array_elements(api.get_feed(50) -> 'items') i where i ->> 'match_id' = :'mnext'), 1,
          'on: the coming match is in the feed');
select tests.logout();

-- ── staff mark it finished ──
select tests.login(:'fan'::uuid);
select throws_ok(format($$select api.admin_save_tournament(jsonb_build_object('id', %L, 'name', 'Week Open', 'finished', true))$$, :'t'), '42501', null,
                 'only staff mark a tournament finished');
select tests.logout();
select tests.login(:'staff'::uuid);
select is((select (i ->> 'finished')::boolean from jsonb_array_elements(api.admin_tournaments()) i where i ->> 'id' = :'t'), false,
          'the admin list says not finished');
select lives_ok(format($$select api.admin_save_tournament(jsonb_build_object('id', %L, 'name', 'Week Open', 'finished', true))$$, :'t'),
                'staff mark it finished');
select is((select (i ->> 'finished')::boolean from jsonb_array_elements(api.admin_tournaments()) i where i ->> 'id' = :'t'), true,
          'the admin list says finished');
select tests.logout();

select tests.login(:'fan'::uuid);
select api.get_tournament(:'t'::uuid) as done \gset
select is((select i ->> 'state' from jsonb_array_elements(api.get_tournaments() -> 'items') i where i ->> 'id' = :'t'), 'done',
          'the list has it as done, still listed');
select is(:'done'::jsonb ->> 'state', 'done', 'get_tournament: done');
select is(:'done'::jsonb -> 'days', '[]'::jsonb, 'done: no schedule days');
select is(jsonb_array_length(:'done'::jsonb -> 'draws'), 1, 'done: the draws are still there');
select is((select count(*)::int from jsonb_array_elements(api.get_feed(50) -> 'items') i where i ->> 'match_id' = :'mnext'), 0,
          'done: its matches are not in the feed');
select tests.logout();

-- reopened: the week comes back
select tests.login(:'staff'::uuid);
select api.admin_save_tournament(jsonb_build_object('id', :'t', 'name', 'Week Open', 'finished', false)) as _x \gset
select tests.logout();
select tests.login(:'fan'::uuid);
select is((select count(*)::int from jsonb_array_elements(api.get_tournament(:'t'::uuid) -> 'days') d, jsonb_array_elements(d -> 'matches')), 3,
          'reopened: the week is back');
select tests.logout();

select * from finish();
rollback;
