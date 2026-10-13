-- M4 rain: a match the sheet stops listing is postponed (not cancelled) after two runs, keeps its votes, shows in
-- the feed of people who voted on it, moves to its new day when it comes back; ΑΝΑΒΟΛΗ in the sheet postpones at once.
begin;
select plan(10);

select tests.create_user('rain-u@test.local') as u \gset
select tests.mk_player('Α', 'Βροχερός') as a \gset
select tests.mk_player('Β', 'Βροχερός') as b \gset
select tests.mk_player('Γ', 'Ομπρέλας') as c \gset
select tests.mk_player('Δ', 'Ομπρέλας') as d \gset
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Βροχή Open', 'import') returning id as t \gset

create or replace function pg_temp.row_(p_fp text, p_day date, p1 uuid, p2 uuid, p_off boolean default false) returns jsonb language sql as $$
  select jsonb_build_object('fingerprint', p_fp, 'date', p_day, 'time', '20:00', 'discipline', 'MS', 'level', 'OPEN',
                            'side1', jsonb_build_array(jsonb_build_object('player_id', p1)),
                            'side2', jsonb_build_array(jsonb_build_object('player_id', p2)), 'result', null, 'postponed', p_off)
$$;

select core.ingest_run(:'t'::uuid, jsonb_build_array(pg_temp.row_('ab-1', current_date + 1, :'a', :'b'), pg_temp.row_('cd-1', current_date + 1, :'c', :'d')), 'cron', null);
select id as m_ab from core.matches where source_ref = 'ab-1' \gset
select id as m_cd from core.matches where source_ref = 'cd-1' \gset
insert into core.votes (user_id, subject_type, subject_id, option, day_key) values (:'u'::uuid, 'match', :'m_ab'::uuid, 1, core.athens_day(now()));

-- it rains: A v B disappears from the sheet; Γ v Δ is marked ΑΝΑΒΟΛΗ
select core.ingest_run(:'t'::uuid, jsonb_build_array(pg_temp.row_('cd-1', current_date + 1, :'c', :'d', true)), 'cron', null);
select is((select postponed_at is not null from core.matches where id = :'m_cd'::uuid), true, 'ΑΝΑΒΟΛΗ in the sheet: postponed at once');
select is((select postponed_at from core.matches where id = :'m_ab'::uuid), null, 'missing once: not yet');
select core.ingest_run(:'t'::uuid, jsonb_build_array(pg_temp.row_('cd-1', current_date + 1, :'c', :'d', true)), 'cron', null) as r3 \gset
select is((select postponed_at is not null from core.matches where id = :'m_ab'::uuid), true, 'missing twice: postponed');
select is((select status from core.matches where id = :'m_ab'::uuid), 'scheduled', 'not cancelled');
select ok(not core.match_is_open((select m from core.matches m where id = :'m_cd'::uuid)), 'a postponed match takes no votes');

select tests.login(:'u'::uuid);
select api.get_feed() as feed \gset
select tests.logout();
select ok(jsonb_path_exists(:'feed'::jsonb, '$.items[*] ? (@.kind == "postponed")'), 'the voter sees «Αναβλήθηκε» in the feed');

-- it comes back on another day: moved there, votes kept
select core.ingest_run(:'t'::uuid, jsonb_build_array(pg_temp.row_('ab-2', current_date + 4, :'a', :'b'), pg_temp.row_('cd-1', current_date + 1, :'c', :'d', true)), 'cron', null) as r4 \gset
select is((:'r4'::jsonb ->> 'moved')::int, 1, 'back on a new day: moved');
select is((select postponed_at from core.matches where id = :'m_ab'::uuid), null, 'no longer postponed');
select is((select count(*)::int from core.votes where subject_id = :'m_ab'::uuid), 1, 'the vote is still there');
select ok((core.tournament_match_json((select m from core.matches m where id = :'m_ab'::uuid)) -> 'moved_from') is not null,
          'the schedule knows the old day');

select * from finish();
rollback;
