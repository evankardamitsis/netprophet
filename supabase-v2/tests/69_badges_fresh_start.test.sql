-- Badges start fresh (founder, 13 Oct 2026): only what happens after an account's badges_since counts. Matches,
-- kudos and votes from before (v1 history, a player claimed later) never count; what happens after does.
begin;
select plan(6);

select tests.create_user('bf-u@test.local') as u \gset
select tests.mk_player('Φρε', 'Σκος') as me \gset
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;

select is((core.badge_counters(:'u'::uuid) ->> 'variety')::int, 0, 'a new account starts at zero');

update core.profiles set badges_since = now() + interval '1 hour' where user_id = :'u'::uuid;
select ok(exists (select 1 from information_schema.columns where table_schema = 'core' and table_name = 'profiles'
                    and column_name = 'badges_since'), 'profiles carry badges_since');

insert into core.kudos (from_user_id, to_player_id, match_id, option_id, created_at)
select :'u'::uuid, tests.mk_player('Αντ', 'Α' || g), tests.mk_match_fresh(now() + g * interval '3 days'),
       (select id from core.kudos_options limit 1), now()
  from generate_series(1, 3) g;
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
select :'u'::uuid, 'card', gen_random_uuid(), 1, now(), core.athens_day(now()) from generate_series(1, 5);
select is((core.badge_counters(:'u'::uuid) ->> 'gentleman')::int, 0, 'kudos from before badges_since do not count');
select is((core.badge_counters(:'u'::uuid) ->> 'many_votes')::int, 0, 'votes from before do not count');

-- from badges_since on, they do
update core.profiles set badges_since = now() - interval '1 minute' where user_id = :'u'::uuid;
-- (quest badge bonuses granted along the way count too, so at least)
select ok((core.badge_counters(:'u'::uuid) ->> 'gentleman')::int >= 3, 'kudos after badges_since count');
select ok((core.badge_counters(:'u'::uuid) ->> 'many_votes')::int >= 5, 'votes after count');

select * from finish();
rollback;
