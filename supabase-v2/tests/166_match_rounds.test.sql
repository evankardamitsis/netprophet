-- The round of a match: a read writes the keys the app knows, an empty or unknown one leaves the match as it is (a round
-- staff set stays), a dry run writes nothing, and only staff set it by hand.
begin;
select plan(8);

select tests.mk_player('Γύρος', 'Ένα') as p1 \gset
select tests.mk_player('Γύρος', 'Δύο') as p2 \gset
insert into core.tournaments (sport_id, name, source, source_kind, source_url, announced_at)
values ('tennis', 'Rounds Open', 'import', 'site', 'https://example.test/rounds', now()) returning id as t \gset

create or replace function pg_temp.row_(p_fp text, p_round text, p1 uuid, p2 uuid) returns jsonb language sql as $$
  select jsonb_build_object('fingerprint', p_fp, 'date', current_date + 1, 'time', '20:00', 'discipline', 'MS', 'level', 'OPEN', 'round', p_round,
                            'side1', jsonb_build_array(jsonb_build_object('player_id', p1)),
                            'side2', jsonb_build_array(jsonb_build_object('player_id', p2)), 'result', null)
$$;
create or replace function pg_temp.round_(p_t uuid, p_fp text) returns text language sql as $$
  select round from core.matches where tournament_id = p_t and source_ref = p_fp
$$;

select core.ingest_run(:'t'::uuid, jsonb_build_array(pg_temp.row_('r-1', 'final', :'p1', :'p2'), pg_temp.row_('r-2', null, :'p2', :'p1')), 'dry', null);
select is(pg_temp.round_(:'t'::uuid, 'r-1'), null, 'a dry run writes nothing');

select core.ingest_run(:'t'::uuid, jsonb_build_array(pg_temp.row_('r-1', 'final', :'p1', :'p2'), pg_temp.row_('r-2', null, :'p2', :'p1')), 'cron', null);
select is(pg_temp.round_(:'t'::uuid, 'r-1'), 'final', 'a read writes the round the source said');
select is(pg_temp.round_(:'t'::uuid, 'r-2'), null, 'a row with no round stays unknown');

update core.matches set round = 'semi' where tournament_id = :'t'::uuid and source_ref = 'r-2';
select core.ingest_run(:'t'::uuid, jsonb_build_array(pg_temp.row_('r-1', 'Round 1', :'p1', :'p2'), pg_temp.row_('r-2', null, :'p2', :'p1')), 'cron', null);
select is(pg_temp.round_(:'t'::uuid, 'r-1'), 'final', 'a word that is not a key never lands');
select is(pg_temp.round_(:'t'::uuid, 'r-2'), 'semi', 'a round set by hand survives a read that does not say one');

select core.ingest_run(:'t'::uuid, jsonb_build_array(pg_temp.row_('r-1', 'semi', :'p1', :'p2'), pg_temp.row_('r-2', null, :'p2', :'p1')), 'cron', null);
select is(pg_temp.round_(:'t'::uuid, 'r-1'), 'semi', 'and the source can correct itself');

select id as m from core.matches where tournament_id = :'t'::uuid and source_ref = 'r-1' \gset
select tests.create_user('rd-a@test.local') as a \gset
select tests.create_user('rd-ed@test.local', 'editor') as ed \gset
select tests.login(:'a'::uuid);
select throws_ok(format($$select api.admin_set_match_round(%L, 'final')$$, :'m'), '42501', null, 'a player cannot set a round');
select tests.login(:'ed'::uuid);
select ok(api.admin_set_match_round(:'m'::uuid, 'final'), 'an editor can');

select * from finish();
rollback;
