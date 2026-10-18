-- Αποστολές: core.quest_apply and core.quest_window_key match the TS rule on the shared vectors, the quest table
-- equals packages/core, and votes, kudos and logged matches move the quests, reward them once and queue a celebration.
\set ON_ERROR_STOP on
\set qv `cat "${VECTORS_DIR:-packages/core/test-vectors}/quests.json"`
\set qt `cat "${VECTORS_DIR:-packages/core/test-vectors}/quests-time.json"`
\set qd `cat "${VECTORS_DIR:-packages/core/test-vectors}/quest-defs.json"`
begin;

create temp table qv (doc jsonb not null);
insert into qv values (:'qv'::jsonb), (:'qt'::jsonb);
create temp table qd (doc jsonb not null);
insert into qd values (:'qd'::jsonb);
grant select on qv, qd to public;

select plan((select count(*)::int from qv, jsonb_array_elements(doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c
              where g ->> 'fn' in ('applyQuestEvent', 'windowKey')) + 16);

-- parity
select is(core.quest_apply(c -> 'input' -> 'defs', c -> 'input' -> 'stored', c -> 'input' -> 'event'), c -> 'expected',
          'applyQuestEvent: ' || (c ->> 'name'))
  from qv, jsonb_array_elements(doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c
 where g ->> 'fn' = 'applyQuestEvent';
select is(core.quest_window_key(c -> 'input' ->> 'window', (c -> 'input' ->> 'at')::timestamptz), c ->> 'expected',
          'windowKey: ' || (c ->> 'name'))
  from qv, jsonb_array_elements(doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c
 where g ->> 'fn' = 'windowKey';
select is(core.quest_defs_json(true), (select doc -> 'quests' from qd), 'the quest table equals packages/core');
select is((select array_agg(key order by sort) from core.quest_defs where not active), array['invite_friend'],
          'the friend quest waits for invites');

-- the real thing
select tests.create_user('qs-u@test.local') as u \gset
select tests.mk_player('Λογ', 'Γράφει') as me \gset
select tests.mk_player('Αντί', 'Παλος') as o \gset
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
select tests.mk_match_fresh() as m1 \gset
select tests.mk_match_fresh() as m2 \gset
select tests.mk_match_fresh() as m3 \gset

select tests.login(:'u'::uuid);
select api.cast_vote(:'m1'::uuid, 1);
select is((select q -> 'progress' from jsonb_array_elements(api.get_quests() -> 'daily') q where q ->> 'key' = 'daily_vote_3_cards'),
          '1'::jsonb, 'one vote counts on «Ψήφισε 3 κάρτες»');
select is((select q -> 'reward' from jsonb_array_elements(api.get_quests() -> 'daily') q where q ->> 'key' = 'daily_vote_2_matches'),
          '{"kind": "cosmetic", "key": "bg_night", "category": "background"}'::jsonb, 'the sheet shows what it would give');
select api.cast_vote(:'m2'::uuid, 2);
select api.cast_vote(:'m3'::uuid, 1);
select is((select jsonb_agg(q -> 'done' order by q ->> 'key') from jsonb_array_elements(api.get_quests() -> 'daily') q),
          '[false, true, true]'::jsonb, 'three votes finish both vote quests, not the kudos one');
select is((select q -> 'progress' from jsonb_array_elements(api.get_quests() -> 'weekly') q where q ->> 'key' = 'weekly_vote_5_days'),
          '1'::jsonb, 'three votes on one day are one day of the week');
select tests.logout();

select ok(exists (select 1 from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
                   where uc.user_id = :'u'::uuid and c.key = 'bg_night' and uc.source = 'earned'),
          'two matches give Φόντο Βραδινό ματς');
select is((select reward from core.user_quest_progress where user_id = :'u'::uuid and quest_key = 'daily_vote_3_cards'),
          '{"kind": "badge", "key": "many_votes", "amount": 5}'::jsonb, 'three cards give +5 on Πολλά τα ψηφαλάκια');
select is((select array_agg(payload ->> 'quest' order by payload ->> 'quest') from core.feed_inbox
            where user_id = :'u'::uuid and kind = 'celebration' and payload ->> 'type' = 'quest'),
          array['daily_vote_2_matches', 'daily_vote_3_cards'], 'one celebration per finished quest');
select ok((select payload -> 'reward' ? 'kind' and not payload ? 'streak' from core.feed_inbox
            where user_id = :'u'::uuid and payload ->> 'quest' = 'daily_vote_2_matches'), 'the σερί reward trigger leaves it alone');
select is(core.quest_grant(:'u'::uuid, 'daily_vote_2_matches', core.athens_day()::text), null, 'a reward is given once');

-- the next days: the second background, then the badge bonus
select core.quest_event(:'u'::uuid, 'vote_match', now() + interval '1 day');
select core.quest_event(:'u'::uuid, 'vote_match', now() + interval '1 day');
select is((select reward ->> 'key' from core.user_quest_progress
            where user_id = :'u'::uuid and quest_key = 'daily_vote_2_matches' and period_key = (core.athens_day() + 1)::text),
          'bg_clay', 'then Φόντο Χωμάτινο γήπεδο');
select core.quest_event(:'u'::uuid, 'vote_match', now() + interval '2 days');
select core.quest_event(:'u'::uuid, 'vote_match', now() + interval '2 days');
select is((select reward from core.user_quest_progress
            where user_id = :'u'::uuid and quest_key = 'daily_vote_2_matches' and period_key = (core.athens_day() + 2)::text),
          '{"kind": "badge", "key": "many_votes", "amount": 3}'::jsonb, 'with both owned, +3 on the badge');

-- a kudos given and a match logged
insert into core.kudos (from_user_id, to_player_id, match_id, option_id)
values (:'u'::uuid, :'o'::uuid, :'m1'::uuid, (select id from core.kudos_options limit 1));
select ok((select done_at is not null from core.user_quest_progress
            where user_id = :'u'::uuid and quest_key = 'daily_kudos_1' and period_key = core.athens_day()::text),
          'a kudos finishes «Δώσε ένα μπράβο»');
select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}',
                            core.athens_day() + 3, :'o')::jsonb) ->> 'match_id' as lq \gset
select tests.logout();
-- it counts once staff approve it
select tests.approve_match(:'lq'::uuid) is not null as x \gset
select tests.login(:'u'::uuid);
select is((select q -> 'progress' from jsonb_array_elements(api.get_quests() -> 'weekly') q where q ->> 'key' = 'weekly_log_2_matches'),
          '1'::jsonb, 'a logged match counts on «Πέρνα 2 αγώνες σου»');
select tests.logout();
select throws_ok($$select api.get_quests()$$, '28000', 'not_authenticated', 'signed in only');

select * from finish();
rollback;
