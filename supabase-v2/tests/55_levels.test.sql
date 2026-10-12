-- Levels: core.level_compute matches the TS rule on the shared vectors; core.recompute_levels writes levels and
-- one snapshot a day from counting matches only.
\set ON_ERROR_STOP on
\set lv `cat "${VECTORS_DIR:-packages/core/test-vectors}/levels.json"`
begin;

create temp table lv (doc jsonb not null);
insert into lv values (:'lv'::jsonb);
grant select on lv to public;

select plan((select count(*)::int from lv, jsonb_array_elements(doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c) + 8);

-- parity: every vector case (values within 0.0001, the rest exactly)
select ok(
         (select bool_and(e ->> 'id' = a ->> 'id'
                          and abs((e ->> 'value')::numeric - (a ->> 'value')::numeric) <= 0.0001
                          and (e -> 'tier') is not distinct from (a -> 'tier')
                          and e ->> 'status' = a ->> 'status'
                          and (e ->> 'matches')::int = (a ->> 'matches')::int
                          and (e ->> 'votes')::int = (a ->> 'votes')::int
                          and (e ->> 'upsetIndex')::numeric is not distinct from (a ->> 'upsetIndex')::numeric)
            and jsonb_array_length(c -> 'expected') = jsonb_array_length(core.level_compute(c -> 'input'))
            from jsonb_array_elements(c -> 'expected') with ordinality ee(e, i)
            join jsonb_array_elements(core.level_compute(c -> 'input')) with ordinality aa(a, j) on i = j),
         'recomputeLevels: ' || (c ->> 'name'))
  from lv, jsonb_array_elements(doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c
 where g ->> 'fn' = 'recomputeLevels';
select is(core.level_direction((c -> 'input' ->> 'now')::float8, (c -> 'input' ->> 'weekAgo')::float8), c ->> 'expected',
          'levelDirection: ' || (c ->> 'name'))
  from lv, jsonb_array_elements(doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c
 where g ->> 'fn' = 'levelDirection';

-- the real thing
select tests.create_user('lv-adm@test.local', 'admin') as adm \gset
select tests.create_user('lv-u@test.local') as u \gset
select tests.mk_player('Λογ', 'Γράφει') as me \gset
select tests.mk_player('Αντί', 'Παλος') as o \gset
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
insert into core.player_sports (player_id, sport_id, initial_level) values (:'o'::uuid, 'tennis', 4.0)
on conflict (player_id, sport_id) do update set initial_level = 4.0;

-- a confirmed match against the 4.0 player counts once the opponent confirms; a disputed one never does
select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}], "result": {"won": true, "sets": "2-0"}}',
                            core.athens_day(), :'o')::jsonb) ->> 'match_id' as m1 \gset
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}], "result": {"won": true, "sets": "2-0"}}',
                            core.athens_day() - 3, :'o')::jsonb) ->> 'match_id' as m2 \gset
select tests.logout();
update core.matches set counts_for_levels = true where id = :'m1'::uuid;
update core.matches set status = 'disputed', counts_for_levels = false where id = :'m2'::uuid;

select tests.login(:'u'::uuid);
select throws_ok($$select api.admin_recompute_levels()$$, '42501', null, 'only staff run it');
select tests.login(:'adm'::uuid);
select ok((api.admin_recompute_levels() ->> 'players')::int >= 2, 'staff can run it now');
select api.admin_recompute_levels() is not null as x \gset
select tests.logout();

select is((select level_status || ':' || coalesce(level_tier::text, '-') from core.player_sports where player_id = :'o'::uuid and sport_id = 'tennis'),
          'active:3.5', 'an NTRP player is active; one loss takes 4.0 just under 4, shown as 3,5');
select ok((select level_value < 4.0 from core.player_sports where player_id = :'o'::uuid and sport_id = 'tennis'),
          'and drops a little after losing the one counting match');
select is((select level_status from core.player_sports where player_id = :'me'::uuid and sport_id = 'tennis'), 'pending',
          'a new player with one match is still pending');
select is((select (inputs ->> 'matches')::int from core.level_snapshots where player_id = :'o'::uuid), 1,
          'the disputed match does not count');
select is((select count(*)::int from core.level_snapshots where player_id = :'o'::uuid), 1, 'two runs in a day keep one snapshot');
select is((select level_direction from core.player_sports where player_id = :'o'::uuid and sport_id = 'tennis'), 'same',
          'no week-old snapshot: the direction is =');

select * from finish();
rollback;
