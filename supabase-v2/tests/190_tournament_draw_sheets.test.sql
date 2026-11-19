-- A tournament with more than one draw sheet (founder, 19 Nov 2026: TAF keeps the doubles draws in their own file).
-- The admin saves and reads the list; the due list carries it; two files may use the same tab name and both draws
-- are stored; a read replaces only the sheets it carries; a link taken off the tournament loses its draws.
begin;
select plan(16);

select tests.create_user('ds-adm@test.local', 'admin') as adm \gset

-- the stored draws, read as the test owner (staff cannot read the table itself)
create function pg_temp.tabs(p uuid, p_what text default 'tab')
returns text[] language sql security definer set search_path = core, pg_temp
as $f$ select array_agg(case p_what when 'tab' then tab when 'disc' then tab || '|' || discipline else tab || '|' || sheet end order by tab)
          from core.tournament_draws where tournament_id = p $f$;
grant execute on function pg_temp.tabs(uuid, text) to public;

select tests.login(:'adm'::uuid);
select api.admin_save_tournament(jsonb_build_object(
  'name', 'Two Files Open', 'ongoing', true,
  'draw_urls', jsonb_build_array('https://docs.google.com/spreadsheets/d/singles/edit', ' ',
                                 'https://docs.google.com/spreadsheets/d/doubles/edit?gid=1',
                                 'https://docs.google.com/spreadsheets/d/doubles/edit?gid=2'))) as t \gset

select is((select draw_url from core.tournaments where id = :'t'::uuid), 'https://docs.google.com/spreadsheets/d/singles/edit',
          'the first link is the draw_url');
select is((select extra_draw_urls from core.tournaments where id = :'t'::uuid), array['https://docs.google.com/spreadsheets/d/doubles/edit?gid=1'],
          'the other files follow: blanks dropped, one link per file');
select is((select x -> 'draw_urls' from jsonb_array_elements(api.admin_tournaments()) x where x ->> 'id' = :'t'),
          '["https://docs.google.com/spreadsheets/d/singles/edit", "https://docs.google.com/spreadsheets/d/doubles/edit?gid=1"]'::jsonb,
          'the desk reads the whole list');

-- the same tab name in both files
create temp table d_ as select $j$[
 {"sheet": "https://docs.google.com/spreadsheets/d/singles/edit", "tab": "40+", "title": "MAIN DRAW (2)", "discipline": "MS", "level": "40+",
  "format": "knockout", "size": 2, "entrants": [], "rounds": [], "flags": []},
 {"sheet": "https://docs.google.com/spreadsheets/d/singles/edit", "tab": "OPEN", "title": "MAIN DRAW (2)", "discipline": "MS", "level": "OPEN",
  "format": "knockout", "size": 2, "entrants": [], "rounds": [], "flags": []},
 {"sheet": "https://docs.google.com/spreadsheets/d/doubles/edit?gid=1", "tab": "40+", "title": "MAIN DRAW (2)", "discipline": "MD", "level": "40+",
  "format": "knockout", "size": 2, "entrants": [], "rounds": [], "flags": []},
 {"sheet": "https://docs.google.com/spreadsheets/d/doubles/edit?gid=1", "tab": "MIXED -40", "title": "MAIN DRAW (2)", "discipline": "XD", "level": "-40",
  "format": "knockout", "size": 2, "entrants": [], "rounds": [], "flags": []}
]$j$::jsonb as j;
grant select on d_ to public;

select api.admin_ingest_draws(:'t'::uuid, (select j from d_), true) as dry \gset
select is(pg_temp.tabs(:'t'::uuid), null, 'a dry read stores nothing');
select api.admin_ingest_draws(:'t'::uuid, (select j from d_), false) as run \gset
select is((:'run'::jsonb ->> 'draws')::int, 4, 'all four draws are read');
select is(pg_temp.tabs(:'t'::uuid, 'disc'),
          array['40+|MS', '40+ · MD|MD', 'MIXED -40|XD', 'OPEN|MS'],
          'both «40+» draws are stored: the first file keeps the name, the other gets its discipline');
select is(pg_temp.tabs(:'t'::uuid, 'sheet'), array['40+|singles', '40+ · MD|doubles', 'MIXED -40|doubles', 'OPEN|singles'],
          'each draw knows its file');

-- the next read finds each draw again by its file and tab, in any order
select api.admin_ingest_draws(:'t'::uuid, (select jsonb_build_array(j -> 3, j -> 2, j -> 1, j -> 0) from d_), false) as _r \gset
select is(pg_temp.tabs(:'t'::uuid, 'disc'),
          array['40+|MS', '40+ · MD|MD', 'MIXED -40|XD', 'OPEN|MS'], 'a later read keeps every draw on its tab');

-- only the doubles file read (the singles one failed): the singles draws stay
select api.admin_ingest_draws(:'t'::uuid, (select jsonb_build_array(j -> 2) from d_), false) as _r \gset
select is(pg_temp.tabs(:'t'::uuid),
          array['40+', '40+ · MD', 'OPEN'],
          'a read replaces the tabs of its own file only: «MIXED -40» gone, the singles draws kept');

-- a draw without a sheet is from the first file (older callers)
select api.admin_ingest_draws(:'t'::uuid, (select jsonb_build_array((j -> 0) - 'sheet') from d_), false) as _r \gset
select is(pg_temp.tabs(:'t'::uuid),
          array['40+', '40+ · MD'], 'no sheet means the first file: its «OPEN» is gone, the doubles draw stays');

-- an older admin saving draw_url alone changes the first link and keeps the others
select api.admin_save_tournament(jsonb_build_object('id', :'t', 'name', 'Two Files Open', 'ongoing', true,
                                                    'draw_url', 'https://docs.google.com/spreadsheets/d/singles2/edit')) as _r \gset
select is((select array[draw_url] || extra_draw_urls from core.tournaments where id = :'t'::uuid),
          array['https://docs.google.com/spreadsheets/d/singles2/edit', 'https://docs.google.com/spreadsheets/d/doubles/edit?gid=1'],
          'draw_url alone keeps the other files');

-- taking the doubles file off: its draws go on the next read
select api.admin_save_tournament(jsonb_build_object('id', :'t', 'name', 'Two Files Open', 'ongoing', true,
                                                    'draw_urls', jsonb_build_array('https://docs.google.com/spreadsheets/d/singles2/edit'))) as _r \gset
select is((select extra_draw_urls from core.tournaments where id = :'t'::uuid), '{}'::text[], 'a removed link is gone');
select api.admin_ingest_draws(:'t'::uuid, '[{"tab": "OPEN", "title": "MAIN DRAW (2)", "discipline": "MS", "level": "OPEN",
  "format": "knockout", "size": 2, "entrants": [], "rounds": [], "flags": []}]'::jsonb, false) as _r \gset
select is(pg_temp.tabs(:'t'::uuid), array['OPEN'],
          'the next read drops the removed file and the old first file');

-- an empty list on an ongoing tournament with no schedule is refused; a link that is not a web address too
select throws_ok(format($$select api.admin_save_tournament(jsonb_build_object('id', %L, 'name', 'Two Files Open', 'ongoing', true, 'draw_urls', '[" "]'::jsonb))$$, :'t'),
                 '22023', 'source_required', 'an ongoing tournament needs a link');
select throws_ok(format($$select api.admin_save_tournament(jsonb_build_object('id', %L, 'name', 'Two Files Open', 'ongoing', true, 'draw_urls', '["docs.google.com/x"]'::jsonb))$$, :'t'),
                 '22023', 'draw_url_invalid', 'a draw link must be a web address');

-- the scheduled read gets every link
select api.admin_save_tournament(jsonb_build_object('id', :'t', 'name', 'Two Files Open', 'ongoing', true,
                                                    'draw_urls', jsonb_build_array('https://docs.google.com/spreadsheets/d/a/edit', 'https://docs.google.com/spreadsheets/d/b/edit'))) as _r \gset
select tests.logout();
select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
select is((select x -> 'draw_urls' from jsonb_array_elements(api.ingest_due()) x where x ->> 'id' = :'t'),
          '["https://docs.google.com/spreadsheets/d/a/edit", "https://docs.google.com/spreadsheets/d/b/edit"]'::jsonb,
          'the due list carries every draw link');
reset role;

select * from finish();
rollback;
