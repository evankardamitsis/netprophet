-- A walkover is neither a win nor a loss: the record, the form, the head to head and «Εγώ» leave it out, and the lists
-- still show it, marked.
begin;
select plan(13);

select tests.create_user('wo-me@test.local') as me \gset
select tests.mk_player('Βασίλης', 'Εγώ') as p1 \gset
select tests.mk_player('Πέτρος', 'Αντίπαλος') as p2 \gset
select tests.mk_player('Σπύρος', 'Τρίτος') as p3 \gset
update core.players set claimed_by_user_id = :'me'::uuid where id = :'p1'::uuid;
update core.profiles set claimed_player_id = :'p1'::uuid where user_id = :'me'::uuid;
insert into core.entitlements (user_id, source, status) values (:'me'::uuid, 'gift', 'active');

create or replace function pg_temp.played(p_a uuid, p_b uuid, p_ago interval, p_w int, p_walkover boolean) returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into core.matches (sport_id, format, status, starts_at, source, approved)
  values ('tennis', 'singles', 'confirmed', now() - p_ago, 'import', true) returning id into v;
  insert into core.match_participants (match_id, player_id, side, position) values (v, p_a, 1, 1), (v, p_b, 2, 1);
  insert into core.match_results (match_id, winner_side, sets, sets_won, sets_lost, walkover)
  values (v, p_w, case when p_walkover then '[]'::jsonb else '[{"w": 6, "l": 4}, {"w": 6, "l": 2}]'::jsonb end,
          case when p_walkover then null else 2 end, case when p_walkover then null else 0 end, p_walkover);
  return v;
end $$;

-- played: p1 beat p3. Not played: p1 «beat» p2 and «lost» to p3, both most recent.
select pg_temp.played(:'p1'::uuid, :'p3'::uuid, interval '3 hours', 1, false) as played \gset
select pg_temp.played(:'p1'::uuid, :'p2'::uuid, interval '2 hours', 1, true) as wo_won \gset
select pg_temp.played(:'p1'::uuid, :'p3'::uuid, interval '1 hour', 2, true) as wo_lost \gset

select tests.login(:'me'::uuid);
select is(api.get_player(:'p1'::uuid) -> 'record_year', '{"w": 1, "l": 0}'::jsonb, 'the yearly record leaves walkovers out');
select is(api.get_player(:'p1'::uuid) -> 'form', '["W"]'::jsonb, 'so does the form');
select is(jsonb_array_length(api.get_player(:'p1'::uuid) -> 'last_matches'), 3, 'the last matches still list them');
select is((select count(*)::int from jsonb_array_elements(api.get_player(:'p1'::uuid) -> 'last_matches') m where (m ->> 'walkover')::boolean), 2, 'marked as walkovers');
select is(api.get_player(:'p2'::uuid) -> 'record_year', '{"w": 0, "l": 0}'::jsonb, 'a player with only a walkover has no record');

select is(api.get_me_page() -> 'record_year' -> 'singles', '{"w": 1, "l": 0}'::jsonb, '«Εγώ» counts the same');
select is((api.get_me_page() ->> 'matches')::int, 1, 'and only the match played');

-- the opponent's card as Pro: p3 lost one played match to me and «beat» me by walkover
select is(api.get_player_pro(:'p3'::uuid) -> 'player' -> 'year', '{"w": 0, "l": 1}'::jsonb, 'the Pro card year too');
select is(api.get_player_pro(:'p3'::uuid) -> 'player' -> 'form10', '["L"]'::jsonb, 'and its form');
select is((api.get_player_pro(:'p3'::uuid) -> 'player' -> 'h2h' ->> 'w')::int, 1, 'the head to head counts my played win');
select is((api.get_player_pro(:'p3'::uuid) -> 'player' -> 'h2h' ->> 'l')::int, 0, 'and not the walkover');
select is(jsonb_array_length(api.get_player_pro(:'p3'::uuid) -> 'player' -> 'h2h' -> 'meetings'), 2, 'the meetings still list it');
select is((api.get_player_pro(:'p2'::uuid) -> 'player' -> 'h2h' ->> 'w')::int, 0, 'a meeting that was only a walkover counts for nobody');

select * from finish();
rollback;
