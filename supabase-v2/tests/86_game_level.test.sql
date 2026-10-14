-- The game level: core.game_level gives what packages/core gameLevel gives (game-level.json, read from disk), crossing
-- a step queues one «Ανέβηκες level!» per level, and get_me shows the level and the newest result.
\set ON_ERROR_STOP on
\set gl `cat "${VECTORS_DIR:-packages/core/test-vectors}/game-level.json"`

begin;
select plan(15);

create temp table vec (doc jsonb not null);
insert into vec values (:'gl'::jsonb);

-- every gameLevel case, as one comparison (a failing case is named in the diff)
select is(
  (select jsonb_agg(jsonb_build_object('name', c ->> 'name',
                                        'got', core.game_level((c -> 'input' ->> 'points')::int,
                                                               coalesce((c -> 'input' ->> 'step')::int, 100))))
     from vec, jsonb_array_elements(doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c
    where g ->> 'fn' = 'gameLevel'),
  (select jsonb_agg(jsonb_build_object('name', c ->> 'name', 'got', c -> 'expected'))
     from vec, jsonb_array_elements(doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c
    where g ->> 'fn' = 'gameLevel'),
  'core.game_level matches every gameLevel vector');
select ok((select count(*) from vec, jsonb_array_elements(doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c
            where g ->> 'fn' = 'gameLevel') >= 10, 'the vectors were read');
select is((core.sport_rules('tennis') ->> 'game_level_step')::int, 100, 'the step is a rule, 100 by default');

-- crossing steps
select tests.create_user('gl-u@test.local') as u \gset
select core.ensure_game_state(:'u'::uuid);
create temp view lv as select ref, payload from core.feed_inbox where user_id = :'u'::uuid and kind = 'celebration' and payload ->> 'type' = 'level';
grant select on lv to public;

select core.award_points(:'u'::uuid, 90, 'admin_adjust', 'admin', gen_random_uuid(), 'gl1');
select is((select count(*)::int from lv), 0, 'under the first step: nothing to celebrate');
select core.award_points(:'u'::uuid, 10, 'admin_adjust', 'admin', gen_random_uuid(), 'gl2');
select is((select payload from lv where ref = 'level:2'), '{"type": "level", "level": 2}'::jsonb, 'at 100: level 2 is celebrated');
select core.award_points(:'u'::uuid, 150, 'admin_adjust', 'admin', gen_random_uuid(), 'gl3');
select is((select count(*)::int from lv), 1, 'still under 300: one celebration');
select core.award_points(:'u'::uuid, 50, 'admin_adjust', 'admin', gen_random_uuid(), 'gl4');
select is((select count(*)::int from lv), 2, 'at 300: level 3 too');
select core.award_points(:'u'::uuid, 50, 'admin_adjust', 'admin', gen_random_uuid(), 'gl4');
select is((select count(*)::int from lv), 2, 'the same award twice changes nothing');
select core.award_points(:'u'::uuid, 700, 'admin_adjust', 'admin', gen_random_uuid(), 'gl5');
select is((select array_agg(ref order by ref) from lv), array['level:2', 'level:3', 'level:5'],
          'a jump over several steps celebrates the level reached, once');
-- points taken back and earned again never celebrate a level twice
select core.award_points(:'u'::uuid, -100, 'admin_adjust', 'admin', gen_random_uuid(), 'gl6');
select core.award_points(:'u'::uuid, 100, 'admin_adjust', 'admin', gen_random_uuid(), 'gl7');
select is((select count(*)::int from lv), 3, 'a level is celebrated once');
select is((select count(*)::int from core.feed_inbox where user_id = :'u'::uuid and kind = 'celebration'
             and payload ->> 'type' = 'level' and payload ? 'reward'), 0, 'the σερί reward step leaves it alone');

-- get_me
select tests.login(:'u'::uuid);
select is(api.get_me() -> 'game' -> 'level', core.game_level(1000), 'get_me: the level, into, span and next');
select is((api.get_me() -> 'game' -> 'level' ->> 'level')::int, 5, 'get_me: 1000 points is level 5');

select tests.as_service();
select tests.mk_player('Νέο', 'Ένα') as a \gset
select tests.mk_player('Νέο', 'Δύο') as b \gset
select tests.mk_match(:'a'::uuid, :'b'::uuid, now() - interval '2 hours') as m \gset
select tests.finish_match(:'m'::uuid, 1) is not null as x \gset
select resolved_at as r_at from core.matches where id = :'m'::uuid \gset
select tests.login(:'u'::uuid);
select ok((api.get_me() ->> 'results_at')::timestamptz >= :'r_at'::timestamptz, 'get_me: results_at is the newest result');
select tests.as_service();
update core.matches set resolved_at = now() - interval '20 days' where resolved_at > now() - interval '14 days';
select tests.login(:'u'::uuid);
select is(api.get_me() -> 'results_at', 'null'::jsonb, 'get_me: nothing in two weeks, no results_at');

select * from finish();
rollback;
