-- «Οι 6 της ημέρας»: a personal set of six (twelve with Pro), the players you follow first, never minors, hidden
-- players or anyone twice; the same set all day; an answer is a 'card' vote; the sixth pays +30 once, Pro too;
-- σερί never moves.
begin;
select plan(17);

select tests.create_user('qz-u@test.local') as u \gset
select tests.create_user('qz-v@test.local') as v \gset
select tests.create_user('qz-pro@test.local') as pro \gset
select tests.mk_player('Εγώ', 'Ίδιος') as me \gset
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
update core.profiles set claimed_player_id = :'me'::uuid where user_id = :'u'::uuid;

-- twelve men and six women with levels in two areas; u follows four of the men; a minor and a hidden player too
create temp table pp as
select g, tests.mk_player('Παίκτης' || g, 'Δοκιμής' || g, case when g > 12 then 'f' else 'm' end) as id
  from generate_series(1, 18) g;
grant select on pp to public;
update core.players p set area_id = (select id from core.areas order by sort limit 1 offset (pp.g % 2))
  from pp where p.id = pp.id;
insert into core.player_sports (player_id, sport_id, level_tier, level_direction, form)
select id, 'tennis', 3 + (g % 4) * 0.5, case when g % 3 = 0 then 'up' else 'same' end, '["W","W","L","W"]'::jsonb from pp
on conflict (player_id, sport_id) do update set level_tier = excluded.level_tier, level_direction = excluded.level_direction,
                                              form = excluded.form;
insert into core.follows (user_id, player_id) select :'u'::uuid, id from pp where g <= 4 or g between 13 and 16;
select tests.mk_player('Μικρός', 'Ανήλικος') as kid \gset
update core.players set is_minor = true where id = :'kid'::uuid;
insert into core.follows (user_id, player_id) values (:'u'::uuid, :'kid'::uuid);
select tests.mk_player('Κρυφός', 'Παίκτης') as hid \gset
update core.players set hidden = true where id = :'hid'::uuid;
insert into core.follows (user_id, player_id) values (:'u'::uuid, :'hid'::uuid);
insert into core.player_sports (player_id, sport_id, level_tier) values (:'kid'::uuid, 'tennis', 4), (:'hid'::uuid, 'tennis', 4)
on conflict (player_id, sport_id) do update set level_tier = excluded.level_tier;

select tests.login(:'u'::uuid);
create temp table q1 as select api.get_quiz() as doc;
grant select on q1 to public;
select is(jsonb_array_length((select doc -> 'cards' from q1)), 6, 'six cards');
select is((select string_agg(c ->> 'family', '' order by (c ->> 'position')::int) from q1, jsonb_array_elements(doc -> 'cards') c),
          'scqosc', 'Σενάριο, Διάλεξε έναν, Ποιος είναι;, Άποψη, Σενάριο, Διάλεξε έναν');
select ok((select bool_and(p.id in (select id from pp where g <= 4 or g between 13 and 16))
             from q1, jsonb_array_elements(doc -> 'cards') c, jsonb_array_elements(c -> 'content' -> 'players') x,
                  core.players p
            where (c ->> 'position')::int = 1 and p.id = (x ->> 'id')::uuid),
          'the first card is about players you follow');
select ok(not exists (select 1 from q1, jsonb_array_elements(doc -> 'cards') c, jsonb_array_elements(c -> 'content' -> 'players') x
                       where (x ->> 'id')::uuid in (:'kid'::uuid, :'hid'::uuid, :'me'::uuid)),
          'never a minor, a hidden player or yourself');
select is((select count(*) - count(distinct x ->> 'id') from q1, jsonb_array_elements(doc -> 'cards') c,
                  jsonb_array_elements(c -> 'content' -> 'players') x)::int, 0, 'nobody twice in a set');
select ok((select (c -> 'content' ->> 'right')::int between 0 and 2 and jsonb_array_length(c -> 'content' -> 'clues') >= 2
             from q1, jsonb_array_elements(doc -> 'cards') c where c ->> 'family' = 'q'),
          '«Ποιος είναι;» has clues and one right answer');
select is((select jsonb_agg(c -> 'id') from jsonb_array_elements(api.get_quiz() -> 'cards') c),
          (select jsonb_agg(c -> 'id') from q1, jsonb_array_elements(doc -> 'cards') c), 'the same set all day');

-- answering
select api.answer_card(((select doc -> 'cards' -> 0 ->> 'id' from q1))::uuid, 2);
select is((select option::int from core.votes where user_id = :'u'::uuid and subject_type = 'card'), 2, 'an answer is a card vote');
select throws_ok(format($$select api.answer_card(%L, 1)$$, (select doc -> 'cards' -> 0 ->> 'id' from q1)), '23505', 'already_answered',
                 'one answer per card');
select throws_ok(format($$select api.answer_card(%L, 9)$$, (select doc -> 'cards' -> 1 ->> 'id' from q1)), '22023', 'invalid_option',
                 'only the options on the card');
select api.answer_card((c ->> 'id')::uuid, 1) from q1, jsonb_array_elements(doc -> 'cards') c where (c ->> 'position')::int between 2 and 5;
select is((select (api.answer_card(((select doc -> 'cards' -> 5 ->> 'id' from q1))::uuid, 1) ->> 'awarded')::int), 30,
          'the sixth answer pays +30');
select is((select count(*)::int from core.points_ledger where user_id = :'u'::uuid and reason = 'daily_quiz'), 1, 'once');
select is((select streak from core.user_game_state where user_id = :'u'::uuid), 0, 'σερί never moves on cards');
select is((select done_at is not null from core.user_quest_progress where user_id = :'u'::uuid and quest_key = 'daily_vote_3_cards'),
          true, 'cards count on «Ψήφισε 3 κάρτες»');
select tests.logout();

-- a player who follows nobody still gets a full set, with «Ποιος είναι;» even when nobody has an area (the roster today)
update core.players set area_id = null where id in (select id from pp);
select tests.login(:'v'::uuid);
create temp table q3 as select api.get_quiz() as doc;
select is(jsonb_array_length((select doc -> 'cards' from q3)), 6, 'no follows: still six');
select ok(exists (select 1 from q3, jsonb_array_elements(doc -> 'cards') c where c ->> 'family' = 'q'),
          '«Ποιος είναι;» from the level alone');
select tests.logout();

-- Pro: twelve cards, still +30 at the sixth
insert into core.entitlements (user_id, source, status) values (:'pro'::uuid, 'gift', 'active');
select tests.login(:'pro'::uuid);
create temp table q2 as select api.get_quiz() as doc;
grant select on q2 to public;
select is(jsonb_array_length((select doc -> 'cards' from q2)), 12, 'Pro: twelve');
select api.answer_card((c ->> 'id')::uuid, 1) from q2, jsonb_array_elements(doc -> 'cards') c;
select tests.logout();
select * from finish();
rollback;
