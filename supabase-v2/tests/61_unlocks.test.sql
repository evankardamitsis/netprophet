-- Unlock ladder: core.unlock_evaluate matches evaluateUnlocks on the shared vectors and the table equals
-- packages/core; a new account starts on step 1, votes open the next steps with one moment each, unlocks stick.
\set ON_ERROR_STOP on
\set uv `cat "${VECTORS_DIR:-packages/core/test-vectors}/unlocks.json"`
\set ud `cat "${VECTORS_DIR:-packages/core/test-vectors}/unlock-defs.json"`
begin;

create temp table uv (doc jsonb not null);
insert into uv values (:'uv'::jsonb);
create temp table ud (doc jsonb not null);
insert into ud values (:'ud'::jsonb);
grant select on uv, ud to public;

select plan((select count(*)::int from uv, jsonb_array_elements(doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c) + 10);

-- parity
select is(core.unlock_evaluate(c -> 'input' -> 'counters', coalesce(c -> 'input' -> 'previouslyUnlocked', '[]'::jsonb),
                               coalesce((c -> 'input' ->> 'existingPlayer')::boolean, false)),
          c -> 'expected', 'evaluateUnlocks: ' || (c ->> 'name'))
  from uv, jsonb_array_elements(doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c;
select is(core.unlock_defs_json(), (select doc -> 'steps' from ud), 'the ladder equals packages/core');

-- the real thing
select tests.create_user('ul-u@test.local') as u \gset
select is((select array_agg(unlock_key) from core.unlock_progress where user_id = :'u'::uuid), array['day1'],
          'a new account starts on step 1');
create temp table ms as select tests.mk_match_fresh(now() + g * interval '3 days') as id, g from generate_series(1, 5) g;
grant select on ms to public;

select tests.login(:'u'::uuid);
select api.cast_vote(id, 1) from ms where g <= 4;
select is((select count(*)::int from core.unlock_progress where user_id = :'u'::uuid), 1, 'four votes open nothing yet');
select api.cast_vote(id, 1) from ms where g = 5;
select is((select array_agg(unlock_key order by unlock_key) from core.unlock_progress where user_id = :'u'::uuid),
          array['day1', 'level_bar'], 'the fifth vote opens the level (backup)');
select is((select payload from core.feed_inbox where user_id = :'u'::uuid and payload ->> 'type' = 'unlock'),
          '{"type": "unlock", "key": "level_bar"}'::jsonb, 'with its moment');
select is(api.get_me() -> 'unlocks', '["day1", "level_bar"]'::jsonb, 'get_me hands the steps to the app');
select tests.logout();

-- quiet steps, the existing-player fill, stickiness
select is((core.unlocks_refresh(:'u'::uuid, false, true) -> 'newlyUnlocked') ? 'first_freeze', true, 'an existing player gets the rest');
select ok(not exists (select 1 from core.feed_inbox where user_id = :'u'::uuid and payload ->> 'key' in ('first_freeze', 'bridge_line', 'weekly_quests', 'avatar_profile', 'gifts')),
          'steps with nothing to show stay quiet');
select is((select count(*)::int from core.unlock_progress where user_id = :'u'::uuid), 13, 'all 13');
delete from core.votes where user_id = :'u'::uuid;
select is(jsonb_array_length(core.unlocks_refresh(:'u'::uuid) -> 'unlocked'), 13, 'unlocks stick when counters go down');

select * from finish();
rollback;
