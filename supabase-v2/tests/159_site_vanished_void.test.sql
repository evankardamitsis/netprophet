-- A match that vanishes from an organiser's site is voided after two healthy reads without it; on a sheet it is still
-- only postponed (the rain rule).
begin;
select plan(7);

select tests.create_user('van-u@test.local') as u \gset
select tests.mk_player('Α', 'Χαμένος') as a \gset
select tests.mk_player('Β', 'Χαμένος') as b \gset
select tests.mk_player('Γ', 'Μένων') as c \gset
select tests.mk_player('Δ', 'Μένων') as d \gset
insert into core.tournaments (sport_id, name, source, source_kind, source_url)
values ('tennis', 'Site League', 'import', 'site', 'https://www.athenstennis.gr/el/schedule') returning id as ts \gset
insert into core.tournaments (sport_id, name, source, source_kind, source_url)
values ('tennis', 'Sheet Open', 'import', 'sheet', 'https://docs.google.com/spreadsheets/d/van') returning id as tsh \gset

create or replace function pg_temp.row_(p_fp text, p1 uuid, p2 uuid) returns jsonb language sql as $$
  select jsonb_build_object('fingerprint', p_fp, 'date', current_date + 1, 'time', '20:00', 'discipline', 'MS', 'level', 'OPEN',
                            'side1', jsonb_build_array(jsonb_build_object('player_id', p1)),
                            'side2', jsonb_build_array(jsonb_build_object('player_id', p2)), 'result', null)
$$;

-- the site: A v B and Γ v Δ, then A v B is taken off
select core.ingest_run(:'ts'::uuid, jsonb_build_array(pg_temp.row_('s-ab', :'a', :'b'), pg_temp.row_('s-cd', :'c', :'d')), 'cron', null);
select id as m_ab from core.matches where source_ref = 's-ab' \gset
insert into core.votes (user_id, subject_type, subject_id, option, day_key) values (:'u'::uuid, 'match', :'m_ab'::uuid, 1, core.athens_day(now()));
select core.ingest_run(:'ts'::uuid, jsonb_build_array(pg_temp.row_('s-cd', :'c', :'d')), 'cron', null);
select is((select status from core.matches where id = :'m_ab'::uuid), 'scheduled', 'site: missing once is not enough');
select core.ingest_run(:'ts'::uuid, jsonb_build_array(pg_temp.row_('s-cd', :'c', :'d')), 'cron', null) as r \gset
select is((select status from core.matches where id = :'m_ab'::uuid), 'void', 'site: missing twice, voided');
select ok((select (provenance ->> 'vanished_from_site')::boolean from core.matches where id = :'m_ab'::uuid), 'marked as gone from the site');
select ok(exists (select 1 from core.outbox where idempotency_key = 'resolve:' || :'m_ab' || ':void'), 'its votes are settled as void');
select is(((:'r'::jsonb ->> 'cancelled')::int, (:'r'::jsonb ->> 'postponed')::int), (1, 0), 'counted as cancelled, not postponed');

-- the sheet: the same drop only postpones
select core.ingest_run(:'tsh'::uuid, jsonb_build_array(pg_temp.row_('h-ab', :'a', :'b'), pg_temp.row_('h-cd', :'c', :'d')), 'cron', null);
select core.ingest_run(:'tsh'::uuid, jsonb_build_array(pg_temp.row_('h-cd', :'c', :'d')), 'cron', null);
select core.ingest_run(:'tsh'::uuid, jsonb_build_array(pg_temp.row_('h-cd', :'c', :'d')), 'cron', null);
select is((select status from core.matches where source_ref = 'h-ab'), 'scheduled', 'sheet: not voided');
select ok((select postponed_at is not null from core.matches where source_ref = 'h-ab'), 'sheet: postponed, as before');

select * from finish();
rollback;
