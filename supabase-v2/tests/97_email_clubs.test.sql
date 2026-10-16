-- The morning email lists clubs that have matches but no surface yet, with how many matches and where they play;
-- a club with its surface set leaves the list.
begin;
select plan(3);

select tests.mk_player('Κλαμπ', 'Ένα') as a \gset
select tests.mk_player('Κλαμπ', 'Δύο') as b \gset
insert into core.tournaments (sport_id, name, source, starts_on) values ('tennis', 'Clubs League', 'import', current_date) returning id as t \gset
select core.club_for('New Court Club') as c \gset
select tests.mk_match(:'a'::uuid, :'b'::uuid, now() + interval '1 day') as m \gset
update core.matches set club_id = :'c'::uuid, tournament_id = :'t'::uuid where id = :'m'::uuid;

select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
select api.admin_morning_digest() as d \gset
reset role;
select is((select x ->> 'matches' from jsonb_array_elements(:'d'::jsonb -> 'clubs_no_surface') x where x ->> 'club' = 'New Court Club'),
          '1', 'a new club with a match and no surface is listed');
select is((select x -> 'tournaments' ->> 0 from jsonb_array_elements(:'d'::jsonb -> 'clubs_no_surface') x where x ->> 'club' = 'New Court Club'),
          'Clubs League', 'with the tournament it plays in');

update core.clubs set surface = 'clay' where id = :'c'::uuid;
set local role service_role;
select api.admin_morning_digest() as d2 \gset
reset role;
select ok(not exists (select 1 from jsonb_array_elements(:'d2'::jsonb -> 'clubs_no_surface') x where x ->> 'club' = 'New Court Club'),
          'set its surface and it leaves the list');

select * from finish();
rollback;
