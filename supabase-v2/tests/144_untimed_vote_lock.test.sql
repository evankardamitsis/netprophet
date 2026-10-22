-- Matches with no start time take votes until 14:00 Athens on their day (founder, 22 Oct 2026), or the tournament's
-- own time (20270310000000_untimed_vote_lock.sql). The sheet import stores such a match at 00:00 Athens.
-- The clock cannot be set inside a test, so the 13:59:59 / 14:00 boundaries (DST days too) run on the pure rule, and
-- the api.cast_vote and get_feed cases use a lock time far from the test's hour (24:00 is the end of the day).
begin;
select plan(26);

-- ---------------------------------------------------------------------------
-- the rule (the same cases as packages/core votes.json, a few written out here)
-- ---------------------------------------------------------------------------
select is(core.lock_instant('2026-10-22 00:00 Europe/Athens', null), '2026-10-22 11:00:00Z'::timestamptz,
          'no time, summer: 14:00 Athens that day');
select is(core.lock_instant('2026-10-25 00:00 Europe/Athens', null), '2026-10-25 12:00:00Z'::timestamptz,
          'no time on the day the clocks go back: 14:00 winter time (start + 14h would be 13:00)');
select is(core.lock_instant('2027-03-28 00:00 Europe/Athens', null), '2027-03-28 11:00:00Z'::timestamptz,
          'no time on the day the clocks go forward: 14:00 summer time');
select is(core.lock_instant('2026-10-22 18:30 Europe/Athens', null), '2026-10-22 18:30 Europe/Athens'::timestamptz,
          'a start with a time closes at the start');
select is(core.lock_instant('2026-10-22 00:00 Europe/Athens', '2026-10-22 09:00 Europe/Athens'), '2026-10-22 09:00 Europe/Athens'::timestamptz,
          'a staff lock wins');
select is(core.vote_gate('scheduled', '2026-10-22 00:00 Europe/Athens', core.lock_instant('2026-10-22 00:00 Europe/Athens', null),
                         1, '2026-10-22 13:59:59 Europe/Athens'), 'ok', 'open at 13:59:59');
select is(core.vote_gate('scheduled', '2026-10-22 00:00 Europe/Athens', core.lock_instant('2026-10-22 00:00 Europe/Athens', null),
                         1, '2026-10-22 14:00:00 Europe/Athens'), 'locked', 'closed at 14:00');
select is(core.vote_gate('scheduled', '2026-10-25 00:00 Europe/Athens', core.lock_instant('2026-10-25 00:00 Europe/Athens', null),
                         1, '2026-10-25 11:59:59Z'), 'ok', 'DST day: open at 13:59:59 winter time');
select is(core.vote_gate('scheduled', '2026-10-25 00:00 Europe/Athens', core.lock_instant('2026-10-25 00:00 Europe/Athens', null),
                         1, '2026-10-25 12:00:00Z'), 'locked', 'DST day: closed at 14:00 winter time');

-- ---------------------------------------------------------------------------
-- one match: the tournament's setting
-- ---------------------------------------------------------------------------
select (core.athens_day()::timestamp at time zone 'Europe/Athens') as today0 \gset
insert into core.tournaments (sport_id, name, source, untimed_lock_time) values ('tennis', 'Untimed Late Open', 'admin', '11:30')
returning id as t_late \gset
select tests.mk_match_fresh(:'today0'::timestamptz) as m_free \gset
select tests.mk_match_fresh(:'today0'::timestamptz) as m_t \gset
select tests.mk_match_fresh(:'today0'::timestamptz + interval '18 hours') as m_timed \gset
update core.matches set tournament_id = :'t_late'::uuid where id in (:'m_t'::uuid, :'m_timed'::uuid);
select is(core.match_lock_at((select m from core.matches m where id = :'m_free')),
          (core.athens_day() + time '14:00') at time zone 'Europe/Athens', 'outside a tournament: 14:00');
select is(core.match_lock_at((select m from core.matches m where id = :'m_t')),
          (core.athens_day() + time '11:30') at time zone 'Europe/Athens', 'the tournament''s own time');
select is(core.match_lock_at((select m from core.matches m where id = :'m_timed')), :'today0'::timestamptz + interval '18 hours',
          'a start with a time in that tournament: the start');

-- ---------------------------------------------------------------------------
-- api.cast_vote
-- ---------------------------------------------------------------------------
insert into core.tournaments (sport_id, name, source, untimed_lock_time) values ('tennis', 'Untimed All Day Open', 'admin', '24:00')
returning id as t_day \gset
insert into core.tournaments (sport_id, name, source, untimed_lock_time) values ('tennis', 'Untimed Midnight Open', 'admin', '00:00')
returning id as t_mid \gset
-- m_open: today, no time, closes at the day's end; m_result: the same, but its result is in;
-- m_mid: today, no time, the tournament closes at 00:00; m_yday: yesterday, no time, 14:00
select tests.mk_match_fresh(:'today0'::timestamptz) as m_open \gset
select tests.mk_match_fresh(:'today0'::timestamptz) as m_result \gset
select tests.mk_match_fresh(:'today0'::timestamptz) as m_mid \gset
select tests.mk_match_fresh(:'today0'::timestamptz - interval '1 day') as m_yday \gset
update core.matches set tournament_id = :'t_day'::uuid where id in (:'m_open'::uuid, :'m_result'::uuid);
update core.matches set tournament_id = :'t_mid'::uuid where id = :'m_mid'::uuid;
insert into core.match_results (match_id, winner_side, sets) values (:'m_result'::uuid, 1, '[{"w":6,"l":3},{"w":6,"l":4}]');

select tests.create_user('uvl-u@test.local') as u \gset
select tests.login(:'u'::uuid);
select lives_ok(format('select api.cast_vote(%L, 1)', :'m_open'), 'no time, started at 00:00: the vote goes in before the lock');
select throws_ok(format('select api.cast_vote(%L, 1)', :'m_result'), '55000', null,
                 'a result came in before the lock: voting is closed');
select throws_ok(format('select api.cast_vote(%L, 1)', :'m_mid'), '55000', null,
                 'a tournament that closes at 00:00: closed from the start');
select throws_ok(format('select api.cast_vote(%L, 1)', :'m_yday'), '55000', null, 'yesterday''s match with no time: closed');

-- ---------------------------------------------------------------------------
-- get_feed: the open card with its lock, never the one with a result
-- ---------------------------------------------------------------------------
create temp table f on commit drop as select e as c from jsonb_array_elements(api.get_feed(100) -> 'items') e;
select tests.logout();
grant select on f to public;
select is((select c ->> 'closed' from f where c ->> 'match_id' = :'m_open'), 'false', 'Σήμερα: the match with no time is open');
select is((select (c ->> 'lock_at')::timestamptz from f where c ->> 'match_id' = :'m_open'),
          (core.athens_day() + 1)::timestamp at time zone 'Europe/Athens', 'its card says when voting closes');
select ok(not exists (select 1 from f where c ->> 'match_id' = :'m_result'), 'the match with a result is not a vote card');
select ok(not exists (select 1 from f where c ->> 'match_id' = :'m_yday' and not (c ->> 'closed')::boolean),
          'yesterday''s match is not open');

-- ---------------------------------------------------------------------------
-- admin: the setting on the tournament page
-- ---------------------------------------------------------------------------
select tests.create_user('uvl-adm@test.local', 'admin') as adm \gset
select tests.login(:'adm'::uuid);
select api.admin_save_tournament('{"name": "Untimed Admin Open"}') as t_adm \gset
select is((select untimed_lock_time from core.tournaments where id = :'t_adm'), '14:00'::time, 'a new tournament: 14:00');
select api.admin_save_tournament(jsonb_build_object('id', :'t_adm', 'name', 'Untimed Admin Open', 'untimed_lock_time', '11:30')) is not null as x \gset
select is((select untimed_lock_time from core.tournaments where id = :'t_adm'), '11:30'::time, 'staff set 11:30');
select is((select x ->> 'untimed_lock_time' from jsonb_array_elements(api.admin_tournaments()) x where x ->> 'id' = :'t_adm'),
          '11:30', 'the admin list shows it as HH:MM');
select api.admin_save_tournament(jsonb_build_object('id', :'t_adm', 'name', 'Untimed Admin Open 2')) is not null as x \gset
select is((select untimed_lock_time from core.tournaments where id = :'t_adm'), '11:30'::time, 'a save without it keeps it');
select throws_ok(format('select api.admin_save_tournament(%L)',
                        jsonb_build_object('id', :'t_adm', 'name', 'Untimed Admin Open', 'untimed_lock_time', 'noon')),
                 '22023', null, 'a time that is not a time is refused');
select tests.logout();

select ok(not has_function_privilege('authenticated', 'core.match_lock_at(core.matches)', 'execute')
          and not has_function_privilege('anon', 'core.lock_instant(timestamptz, timestamptz, time)', 'execute'),
          'the lock helpers are not callable from the client');

select * from finish();
rollback;
