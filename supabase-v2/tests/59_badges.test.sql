-- Badges: the table and the tiers equal packages/core; facts move the counters, a new tier queues one celebration,
-- the third gives Frame Level once, the first fill is quiet, and only an earned card badge can be worn.
\set ON_ERROR_STOP on
\set bd `cat "${VECTORS_DIR:-packages/core/test-vectors}/badge-defs.json"`
\set bv `cat "${VECTORS_DIR:-packages/core/test-vectors}/badges.json"`
begin;

create temp table bv (doc jsonb not null);
insert into bv values (:'bv'::jsonb);
create temp table bd (doc jsonb not null);
insert into bd values (:'bd'::jsonb);
grant select on bv, bd to public;

select plan((select count(*)::int from bv, jsonb_array_elements(doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c) + 13);

-- parity
select is(core.badge_tier(array(select jsonb_array_elements_text(c -> 'input' -> 'thresholds')::int), (c -> 'input' ->> 'counter')::int),
          (c ->> 'expected')::int, 'tierFor: ' || (c ->> 'name'))
  from bv, jsonb_array_elements(doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c;
select is(core.badge_defs_json(), (select doc -> 'badges' from bd), 'the badge table equals packages/core');

-- the real thing
select tests.create_user('bg-u@test.local') as u \gset
select tests.mk_player('Λογ', 'Γράφει') as me \gset
select tests.mk_player('Αντί', 'Παλος') as o \gset
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
select tests.mk_match_fresh() as m1 \gset
select tests.mk_match_fresh() as m2 \gset
select tests.mk_match_fresh() as m3 \gset

-- a quiet fill stores counters and queues nothing
insert into core.kudos (from_user_id, to_player_id, match_id, option_id)
select :'u'::uuid, :'o'::uuid, tests.mk_match_fresh(now() + g * interval '3 days'), (select id from core.kudos_options limit 1)
  from generate_series(2, 4) g;
select is((select count(*)::int from core.feed_inbox where user_id = :'u'::uuid and payload ->> 'type' = 'badge'), 1,
          'three kudos: one celebration');
select is((select payload from core.feed_inbox where user_id = :'u'::uuid and payload ->> 'type' = 'badge'),
          '{"type": "badge", "badge": "gentleman", "tier": 1, "new": true}'::jsonb, 'Ο ευγενικός, Χάλκινο, a new badge');
delete from core.feed_inbox where user_id = :'u'::uuid;
delete from core.user_badges where user_id = :'u'::uuid;
select is(core.badges_refresh(:'u'::uuid, true), 1, 'the first fill finds it');
select is((select count(*)::int from core.feed_inbox where user_id = :'u'::uuid), 0, 'and stays quiet');
select is(core.badges_refresh(:'u'::uuid), 0, 'nothing new, nothing queued');

-- votes and the quest bonus count on «Πολλά τα ψηφαλάκια»
select tests.login(:'u'::uuid);
select api.cast_vote(:'m1'::uuid, 1);
select is((select (b ->> 'counter')::int from jsonb_array_elements(api.get_badges() -> 'badges') b where b ->> 'key' = 'many_votes'),
          1, 'a vote counts');
select api.cast_vote(:'m2'::uuid, 1);
select api.cast_vote(:'m3'::uuid, 1);
select is((select (b ->> 'counter')::int from jsonb_array_elements(api.get_badges() -> 'badges') b where b ->> 'key' = 'many_votes'),
          3 + 5, 'three votes and +5 from «Ψήφισε 3 κάρτες» (the other quest gave a background)');

-- wearing
select throws_ok($$select api.wear_badge('many_votes')$$, '22023', 'not_a_card_badge', 'only the four card badges');
select throws_ok($$select api.wear_badge('in_a_row')$$, '42501', 'not_earned', 'only once earned');
select is(api.wear_badge('gentleman') ->> 'worn', 'gentleman', 'Ο ευγενικός goes on the card');
select tests.logout();

-- the third tier gives Frame Level once
update core.user_game_state set streak_best = 10 where user_id = :'u'::uuid;
select is((select count(*)::int from core.user_cosmetics uc join core.cosmetic_items c on c.id = uc.item_id
            where uc.user_id = :'u'::uuid and c.key = 'frame_level'), 1, 'σερί 10: Στη σειρά Χρυσό and Frame Level');
select is((select payload -> 'tier' from core.feed_inbox where user_id = :'u'::uuid and payload ->> 'badge' = 'in_a_row'),
          '3'::jsonb, 'straight to Χρυσό, one celebration');

select * from finish();
rollback;
