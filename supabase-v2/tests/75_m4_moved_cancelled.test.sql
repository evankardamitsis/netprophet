-- M4 part 3c: a moved match keeps its votes under the new day; a match the sheet stops listing is postponed after
-- two healthy runs (cancelled only after three weeks, see 76); a match a player logged gets the sheet as its official source instead of a twin; a different
-- organiser score on a settled player match goes to staff.
begin;
select plan(12);

select tests.mk_player('Α', 'Μετακινούμενος') as a \gset
select tests.mk_player('Β', 'Μετακινούμενος') as b \gset
select tests.mk_player('Γ', 'Ακυρωμένος') as c \gset
select tests.mk_player('Δ', 'Ακυρωμένος') as d \gset
select tests.mk_player('Ε', 'Παίκτης') as e \gset
select tests.mk_player('Ζ', 'Παίκτης') as f \gset
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Τ3', 'import') returning id as t \gset

create or replace function pg_temp.row_(p_fp text, p_day date, p1 uuid, p2 uuid, p_res jsonb default null) returns jsonb language sql as $$
  select jsonb_build_object('fingerprint', p_fp, 'date', p_day, 'time', '20:00', 'discipline', 'MS', 'level', 'OPEN',
                            'side1', jsonb_build_array(jsonb_build_object('player_id', p1)),
                            'side2', jsonb_build_array(jsonb_build_object('player_id', p2)), 'result', p_res)
$$;

-- day 1: A v B and Γ v Δ
select core.ingest_run(:'t'::uuid, jsonb_build_array(pg_temp.row_('ab-1', current_date + 2, :'a', :'b'),
                                                    pg_temp.row_('cd-1', current_date + 2, :'c', :'d')), 'cron', null);
select id as m_ab from core.matches where source_ref = 'ab-1' \gset
insert into core.votes (user_id, subject_type, subject_id, option, day_key)
select tests.create_user('vote-mc@test.local'), 'match', :'m_ab'::uuid, 1, core.athens_day(now());

-- run 2: A v B moved to another day; Γ v Δ gone
select core.ingest_run(:'t'::uuid, jsonb_build_array(pg_temp.row_('ab-2', current_date + 4, :'a', :'b')), 'cron', null) as r2 \gset
select is((:'r2'::jsonb ->> 'moved')::int, 1, 'the match moved');
select is((select count(*)::int from core.matches where tournament_id = :'t'::uuid and core.match_people_key(id) = core.match_people_key(:'m_ab'::uuid)), 1,
          'still one match, not two');
select is((select source_ref from core.matches where id = :'m_ab'::uuid), 'ab-2', 'it takes the new fingerprint');
select is((select core.athens_day(starts_at) from core.matches where id = :'m_ab'::uuid), current_date + 4, 'and the new day');
select is((select count(*)::int from core.votes where subject_id = :'m_ab'::uuid), 1, 'votes carry over');
select is((:'r2'::jsonb ->> 'missing')::int, 1, 'Γ v Δ missing once');
select is((select status from core.matches where source_ref = 'cd-1'), 'scheduled', 'once is not enough');

-- run 3: still gone → postponed
select core.ingest_run(:'t'::uuid, jsonb_build_array(pg_temp.row_('ab-2', current_date + 4, :'a', :'b')), 'cron', null) as r3 \gset
select is((select postponed_at is not null and status = 'scheduled' from core.matches where source_ref = 'cd-1'), true,
          'missing twice in a row: postponed, not cancelled (rain, founder 13 Oct)');

-- a match Ε logged with Ζ; the sheet lists it the next day with the score
insert into core.matches (sport_id, format, status, starts_at, source, logged_by)
values ('tennis', 'singles', 'scheduled', now() + interval '6 days', 'user', tests.create_user('logger-mc@test.local')) returning id as mu \gset
insert into core.match_participants (match_id, side, player_id) values (:'mu'::uuid, 1, :'e'::uuid), (:'mu'::uuid, 2, :'f'::uuid);
select core.ingest_run(:'t'::uuid, jsonb_build_array(pg_temp.row_('ab-2', current_date + 4, :'a', :'b'),
         pg_temp.row_('ef-1', core.athens_day(now() + interval '6 days'), :'f', :'e')), 'cron', null) as r4 \gset
select is((:'r4'::jsonb ->> 'attached')::int, 1, 'the player''s match gets the sheet as its source');
select is((select count(*)::int from core.matches where core.match_people_key(id) = core.match_people_key(:'mu'::uuid)), 1, 'no twin');
select is((select tournament_id from core.matches where id = :'mu'::uuid), :'t'::uuid, 'it joins the tournament');
select core.ingest_run(:'t'::uuid, jsonb_build_array(pg_temp.row_('ab-2', current_date + 4, :'a', :'b'),
         pg_temp.row_('ef-1', core.athens_day(now() + interval '6 days'), :'f', :'e')), 'cron', null) as r5 \gset
select is((:'r5'::jsonb ->> 'created')::int, 0, 'the next run finds it by its fingerprint');

select * from finish();
rollback;
