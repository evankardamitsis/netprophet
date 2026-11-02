-- «Ακολούθησε 10 παίκτες»: every follow moves the quest to how many players you follow now, an unfollow and a follow
-- again never count twice, the 10th follow gives Παρέα once with a celebration, and api.get_quests shows it under `once`.
\set ON_ERROR_STOP on
begin;
select plan(10);

select tests.create_user('fq-u@test.local') as u \gset
create temp table fq_p as select tests.mk_player('Παίκτης', 'Νο' || g) as id, g from generate_series(1, 11) g;
grant select on fq_p to public;

select tests.login(:'u'::uuid);
select is((select q ->> 'progress' from jsonb_array_elements(api.get_quests() -> 'once') q where q ->> 'key' = 'follow_10_players'),
          '0', 'it starts at 0, under once');
select is((select q -> 'reward' ->> 'key' from jsonb_array_elements(api.get_quests() -> 'once') q where q ->> 'key' = 'follow_10_players'),
          'frame_friends', 'and says it gives Παρέα');

-- three at once (onboarding) and one from a card
select api.follow_players((select array_agg(id order by g) from fq_p where g <= 3));
select api.follow_player((select id from fq_p where g = 4), 'friend', 'profile');
select is((select progress from core.user_quest_progress where user_id = :'u'::uuid and quest_key = 'follow_10_players'),
          4, 'four follows, 4/10');

-- unfollow and follow the same player again: still 4
select api.unfollow_player((select id from fq_p where g = 4));
select is((select progress from core.user_quest_progress where user_id = :'u'::uuid and quest_key = 'follow_10_players'),
          4, 'an unfollow does not take it back');
select api.follow_player((select id from fq_p where g = 4), 'friend', 'profile');
select is((select progress from core.user_quest_progress where user_id = :'u'::uuid and quest_key = 'follow_10_players'),
          4, 'and the same player again does not count twice');

-- the 10th
select api.follow_player(id, 'friend', 'profile') from fq_p where g between 5 and 10 order by g;
select ok((select done_at is not null and reward_granted_at is not null from core.user_quest_progress
            where user_id = :'u'::uuid and quest_key = 'follow_10_players'), 'the 10th follow finishes it');
select is((select count(*)::int from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
            where uc.user_id = :'u'::uuid and c.key = 'frame_friends'), 1, 'Παρέα is yours');
select is((select count(*)::int from core.feed_inbox where user_id = :'u'::uuid and kind = 'celebration'
             and payload ->> 'quest' = 'follow_10_players'), 1, 'one celebration');
select api.follow_player((select id from fq_p where g = 11), 'friend', 'profile');
select is((select count(*)::int from core.feed_inbox where user_id = :'u'::uuid and kind = 'celebration'
             and payload ->> 'quest' = 'follow_10_players'), 1, 'the 11th gives nothing more');
select is((select q ->> 'done' from jsonb_array_elements(api.get_quests() -> 'once') q where q ->> 'key' = 'follow_10_players'),
          'true', 'api.get_quests says done');
select tests.logout();

select * from finish();
rollback;
