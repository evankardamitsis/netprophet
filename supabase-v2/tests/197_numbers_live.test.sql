-- The live Numbers summaries: only admins read the totals row, the refresh fills the day rows and the path, a quiet
-- refresh writes nothing, and the desk reads the summaries.
begin;
select plan(12);

select tests.create_user('nl-a@test.local') as a \gset
select tests.create_user('nl-b@test.local') as b \gset
select tests.create_user('nl-ed@test.local', 'editor') as ed \gset
select tests.create_user('nl-adm@test.local', 'admin') as adm \gset
-- a joined 8 days ago through the flow, voted that day and came back two days later; b came over from v1
update core.profiles set created_at = now() - interval '8 days',
       onboarding_state = '{"via": "flow", "done": true}'::jsonb where user_id = :'a'::uuid;
update core.profiles set onboarding_state = '{"via": "before-onboarding", "done": true}'::jsonb where user_id = :'b'::uuid;
insert into core.votes (user_id, subject_type, subject_id, option, day_key)
values (:'a'::uuid, 'card', gen_random_uuid(), 1, core.athens_day() - 8),
       (:'a'::uuid, 'card', gen_random_uuid(), 1, core.athens_day() - 6),
       (:'b'::uuid, 'card', gen_random_uuid(), 1, core.athens_day());

select ok(core.numbers_refresh() ? 'funnel', 'the refresh builds the totals');
select is((select votes from core.numbers_daily where day = core.athens_day()), 1, 'today''s day row counts the vote');
select is((select voters from core.numbers_daily where day = core.athens_day() - 1), 0, 'yesterday is filled too');
select ok((select (data -> 'funnel' ->> 'accounts')::int from core.numbers_now) >= 1, 'the path counts accounts from the flow');
select ok((select (data -> 'funnel' ->> 'returned_7d')::int from core.numbers_now) >= 1, 'and who came back within 7 days');
select (data -> 'funnel' ->> 'accounts')::int as path_n, ctid::text as first_ctid from core.numbers_now \gset
select core.numbers_refresh();
select is((select ctid::text from core.numbers_now), :'first_ctid', 'a refresh with nothing new writes nothing');

update core.profiles set onboarding_state = '{"via": "flow", "done": true}'::jsonb where user_id = :'b'::uuid;
select core.numbers_refresh();
select is((select (data -> 'funnel' ->> 'accounts')::int from core.numbers_now), :path_n + 1,
          'v1 accounts stay out of the path until they come through the flow');

select tests.login(:'a'::uuid);
select is((select count(*)::int from core.numbers_now), 0, 'a user cannot read the totals row');
select tests.login(:'ed'::uuid);
select is((select count(*)::int from core.numbers_now), 0, 'nor an editor');
select tests.login(:'adm'::uuid);
select is((select count(*)::int from core.numbers_now), 1, 'an admin can, so Realtime can tell the open page');
select ok(api.admin_numbers() -> 'funnel' ? 'voted', 'the desk shows the path');
select is((api.admin_numbers(14) -> 'days' -> 0 ->> 'votes')::int, 1, 'and the day rows');

select * from finish();
rollback;
