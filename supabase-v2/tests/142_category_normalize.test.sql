-- One written form per category («60» and «60+» were one age group on one schedule). The vectors are the file
-- packages/ingest runs too (packages/core/test-vectors/category.json); the triggers, the lookup of an event by its
-- written form and the backfill of stored rows are checked here.
\set vec `cat "${VECTORS_DIR:-packages/core/test-vectors}/category.json"`

begin;
select plan(20);

create temp table vec as select x ->> 'in' as inp, x ->> 'out' as outp from jsonb_array_elements(:'vec'::jsonb) x;

select ok((select count(*) from vec) >= 50, 'the vectors were read');
select is((select count(*)::int from vec where core.normalize_category(inp) is distinct from outp), 0,
          'every vector reads the way packages/ingest reads it');
select is((select string_agg('[' || inp || '] gave [' || core.normalize_category(inp) || ']', '; ') from vec where core.normalize_category(inp) is distinct from outp),
          null, 'and none of them differs');
select is((select count(*)::int from vec where core.normalize_category(outp) is distinct from outp), 0, 'a normalised category stays as it is');
select is(core.normalize_category(null), null, 'null stays null');

-- a tournament with a few ways of writing its categories
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Κατηγορίες Open', 'import') returning id as t \gset
insert into core.tournament_events (tournament_id, name, format, gender) values (:'t'::uuid, '60', 'singles', 'm') returning id as e60 \gset
select is((select name from core.tournament_events where id = :'e60'::uuid), '60+', 'an event saved as «60» is «60+»');
update core.tournament_events set name = U&'\039CEDIUM' where id = :'e60'::uuid;
select is((select name from core.tournament_events where id = :'e60'::uuid), 'MEDIUM', 'also on update, and a Greek Μ in a Latin word is Latin');
update core.tournament_events set name = '60+' where id = :'e60'::uuid;

insert into core.tournament_draws (tournament_id, tab, title, discipline, level, format, size, draw)
values (:'t'::uuid, 'M 65 ', 'Κλήρωση', 'MS', '65 ', 'knockout', 8, '{}'::jsonb);
select is((select level from core.tournament_draws where tournament_id = :'t'::uuid), '65+', 'a draw''s level is written the same way');
select is((select tab from core.tournament_draws where tournament_id = :'t'::uuid), 'M 65 ', 'and its tab, the key of ?draw=, is the sheet''s own');

-- the event of a written category
select is(core.snap_event(:'t'::uuid, '60', 'singles'), :'e60'::uuid, '«60» finds the «60+» event');
select is(core.snap_event(:'t'::uuid, '60 +', 'singles'), :'e60'::uuid, '«60 +» too');
select is(core.snap_event(:'t'::uuid, '60+', 'singles'), :'e60'::uuid, 'and «60+» itself');

-- a sheet row written «60» goes to the same event, no second one
select tests.mk_player('Γιάννης', 'Δελληγιαννάκης') as d1 \gset
select tests.mk_player('Κώστας', 'Κορύλος') as d2 \gset
select core.ingest_apply(:'t'::uuid, jsonb_build_array(
  jsonb_build_object('fingerprint', 'cn1', 'date', current_date + 3, 'time', '18:00', 'discipline', 'MS', 'level', '60', 'tab', 'Τ', 'row', 1,
    'flags', '[]'::jsonb, 'side1', jsonb_build_array(jsonb_build_object('player_id', :'d1'::uuid, 'raw', '')),
    'side2', jsonb_build_array(jsonb_build_object('player_id', :'d2'::uuid, 'raw', '')), 'result', null)), null, null);
select is((select count(*)::int from core.tournament_events where tournament_id = :'t'::uuid and format = 'singles'), 1,
          'a row written «60» does not make a second event next to «60+»');
select is((select e.name from core.matches m join core.tournament_events e on e.id = m.event_id where m.source_ref = 'cn1'), '60+', 'its match is in «60+»');

-- the backfill: rows stored the old way (triggers off, as the old code left them)
alter table core.tournament_events disable trigger tournament_events_category;
alter table core.tournament_draws disable trigger tournament_draws_category;
alter table core.matches disable trigger matches_category;
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Παλιά Open', 'import') returning id as t2 \gset
insert into core.tournament_events (tournament_id, name, format, gender) values (:'t2'::uuid, '60', 'singles', 'm') returning id as o1 \gset
insert into core.tournament_events (tournament_id, name, format, gender) values (:'t2'::uuid, '60+', 'singles', 'm') returning id as o2 \gset
insert into core.tournament_events (tournament_id, name, format, gender) values (:'t2'::uuid, '65 ', 'singles', 'm') returning id as o3 \gset
insert into core.tournament_events (tournament_id, name, format, gender) values (:'t2'::uuid, '60', 'singles', 'f') returning id as o4 \gset
insert into core.matches (sport_id, tournament_id, event_id, source, source_ref, provenance, starts_at)
values ('tennis', :'t2'::uuid, :'o1'::uuid, 'import', 'old1', '{"level": "60"}', now() + interval '3 days'),
       ('tennis', :'t2'::uuid, :'o2'::uuid, 'import', 'old2', '{"level": "60+"}', now() + interval '3 days'),
       ('tennis', :'t2'::uuid, :'o3'::uuid, 'import', 'old3', '{"level": "65 "}', now() + interval '3 days');
alter table core.tournament_events enable trigger tournament_events_category;
alter table core.tournament_draws enable trigger tournament_draws_category;
alter table core.matches enable trigger matches_category;

select is(core.category_backfill(true), '{"events_merged": 1, "events_renamed": 2, "draws": 0, "matches": 2}'::jsonb, 'a dry run counts what it would change');
select is((select count(*)::int from core.tournament_events where tournament_id = :'t2'::uuid), 4, 'and changes nothing');
select core.category_backfill();
select is((select jsonb_agg(name order by name) from core.tournament_events where tournament_id = :'t2'::uuid), '["60+", "60+", "65+"]'::jsonb,
          'the backfill merges «60» into «60+» (men''s and women''s stay apart) and writes «65+»');
select is((select count(distinct m.event_id)::int from core.matches m where m.source_ref in ('old1', 'old2')), 1, 'the matches of the two moved to the one event');
select is((select jsonb_agg(provenance ->> 'level' order by source_ref) from core.matches where tournament_id = :'t2'::uuid), '["60+", "60+", "65+"]'::jsonb, 'the level in a match''s provenance too');
select is(core.category_backfill(), '{"events_merged": 0, "events_renamed": 0, "draws": 0, "matches": 0}'::jsonb, 'run again, it has nothing left to change');

select * from finish();
rollback;
