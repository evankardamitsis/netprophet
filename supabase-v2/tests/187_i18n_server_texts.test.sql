-- English for the server's words (20270502000000_i18n_server_texts): a Greek profile reads Greek as before, an English
-- profile reads English, and a row with no English falls back to the Greek. Covers the quiz (bank, rule cards, dynamic
-- cards, reveal), kudos lines, earn rules, reaction labels, the sponsored label, the area of an upcoming tournament and the
-- opponent on a Pro result screen. The bank itself: every active template has English, with the same options, no Greek
-- letters and only tokens English can say ({pN}, {pN.first}).
begin;
select plan(58);

select tests.create_user('i18n-el@test.local') as el \gset
select tests.create_user('i18n-en@test.local') as en \gset
update core.profiles set locale = 'en' where user_id = :'en'::uuid;

-- who reads English
select is(core.user_locale(:'el'::uuid), 'el', 'a Greek profile is el');
select is(core.user_locale(:'en'::uuid), 'en', 'an English profile is en');
select is(core.user_locale(null), 'el', 'no account is el');
select is(core.user_locale(gen_random_uuid()), 'el', 'an unknown account is el');

-- ---------------------------------------------------------------------------
-- the bank
-- ---------------------------------------------------------------------------
select is((select count(*)::int from core.quiz_templates where active and text_en is null), 0, 'every active template has English');
select is((select count(*)::int from core.quiz_templates
            where active and trigger in ('static', 'rule') and family <> 'q'
              and (text_en ->> 'q' is null or jsonb_array_length(text_en -> 'options') <> jsonb_array_length(option_templates))), 0,
          'every question has English words and the same number of options');
select is((select count(*)::int from core.quiz_templates where active and trigger = 'rule' and text_en ->> 'reveal' is null), 0,
          'every rule card says why in English');
select is((select count(*)::int from core.quiz_templates where active and text_en::text ~ '[Α-Ωα-ωά-ώΆ-Ώ]'), 0, 'no Greek letters in the English bank');
select is((select count(*)::int from core.quiz_templates q, regexp_matches(q.text_en::text, '\{p(\d)(\.[a-z_]+)?\}', 'g') m
            where q.active and (m[1]::int > coalesce((q.slot_template ->> 'players')::int, 0) or coalesce(m[2], '.first') <> '.first')), 0,
          'English tokens name a player on the card and need no grammar');
select is((select count(*)::int from core.quiz_templates
            where active and text_en::text ~* '\m(bet|bets|odds|wager|stake|winnings|league)\M|—'), 0, 'no betting words, League or em dash');

-- ---------------------------------------------------------------------------
-- the daily set
-- ---------------------------------------------------------------------------
create temp table pp as
select g, tests.mk_player('Γλώσ' || g, 'Παίκτης' || g, 'm') as id from generate_series(1, 8) g;
grant select on pp to public;
insert into core.follows (user_id, player_id) select u, id from pp, (values (:'el'::uuid), (:'en'::uuid)) x(u);
update core.player_sports set hand = 'L' where player_id in (select id from pp where g <= 4);
select tests.mk_match((select id from pp where g = 1), (select id from pp where g = 2), now() - interval '2 days') as m1 \gset
select tests.mk_match((select id from pp where g = 3), (select id from pp where g = 4), now() - interval '3 days') as m2 \gset
select tests.as_service();
select api.admin_set_result(:'m1'::uuid, 1, '[{"w":6,"l":3},{"w":6,"l":4}]'::jsonb);
select api.admin_set_result(:'m2'::uuid, 1, '[{"w":4,"l":6},{"w":6,"l":3},{"w":6,"l":2}]'::jsonb);
select tests.logout();
select tests.finish_match(tests.mk_match((select id from pp where g = 5), (select id from pp where g = 6), now() - interval '20 hours'), 1);
select tests.finish_match(tests.mk_match((select id from pp where g = 7), (select id from pp where g = 8), now() - interval '21 hours'), 2);
select tests.finish_match(tests.mk_match((select id from pp where g = 1), (select id from pp where g = 2), now() - interval '40 days'), 2);
select core.quiz_day_key(now()) as d \gset

select tests.login(:'el'::uuid);
create temp table qel as select api.get_quiz() as doc;
grant select on qel to public;
select tests.login(:'en'::uuid);
create temp table qen as select api.get_quiz() as doc;
grant select on qen to public;
select tests.logout();

select is((select jsonb_agg(c -> 'content' order by (c ->> 'position')::int) from qel, jsonb_array_elements(doc -> 'cards') c),
          (select jsonb_agg(c.content - 'right' - 'reveal' order by c.position) from core.quiz_set_cards c join core.quiz_sets s on s.id = c.set_id
            where s.user_id = :'el'::uuid and s.quiz_day = :'d'),
          'a Greek profile gets the Greek cards as they are kept');
select is((select count(*)::int from core.quiz_set_cards c join core.quiz_sets s on s.id = c.set_id
            where s.user_id = :'en'::uuid and s.quiz_day = :'d' and c.content_en is null), 0, 'every card of the set has English');
select ok((select bool_and(c -> 'content' ->> 'q' = x.content_en ->> 'q' and c -> 'content' ->> 'tag' = x.content_en ->> 'tag')
             from qen, jsonb_array_elements(doc -> 'cards') c join core.quiz_set_cards x on x.id = (c ->> 'id')::uuid),
          'an English profile gets the English question and tag');
select is((select count(*)::int from qen, jsonb_array_elements(doc -> 'cards') c
            where concat_ws(' ', c -> 'content' ->> 'tag', c -> 'content' ->> 'q', c -> 'content' ->> 'options', c -> 'content' ->> 'clues')
                  ~ '[Α-Ωα-ωά-ώΆ-Ώ]'), 0, 'no Greek letters on the English cards');
select ok((select bool_and(c -> 'content' -> 'players' = x.content -> 'players'
                           and jsonb_array_length(c -> 'content' -> 'options') = jsonb_array_length(x.content -> 'options'))
             from qen, jsonb_array_elements(doc -> 'cards') c join core.quiz_set_cards x on x.id = (c ->> 'id')::uuid),
          'the same players and options count in both languages');
select ok((select bool_and(not (c -> 'content' ? 'right') and not (c -> 'content' ? 'reveal'))
             from qen, jsonb_array_elements(doc -> 'cards') c), 'the English card keeps the answer on the server too');
select ok((select bool_and(not (c ? 'content_en')) from qen, jsonb_array_elements(doc -> 'cards') c), 'no extra keys');

-- answering a rule card: the reveal in the reader's language
select c.id as en_rule, x.text_en ->> 'reveal' as en_reveal
  from core.quiz_set_cards c join core.quiz_sets s on s.id = c.set_id join core.quiz_templates x on x.id = c.template_id
 where s.user_id = :'en'::uuid and s.quiz_day = :'d' and x.trigger = 'rule' limit 1 \gset
select c.id as el_rule, c.content ->> 'reveal' as el_reveal
  from core.quiz_set_cards c join core.quiz_sets s on s.id = c.set_id join core.quiz_templates x on x.id = c.template_id
 where s.user_id = :'el'::uuid and s.quiz_day = :'d' and x.trigger = 'rule' limit 1 \gset
select tests.login(:'en'::uuid);
select is(api.answer_card(:'en_rule'::uuid, 1) ->> 'reveal', :'en_reveal', 'an English answer reveals in English');
select tests.login(:'el'::uuid);
select is(api.answer_card(:'el_rule'::uuid, 1) ->> 'reveal', :'el_reveal', 'a Greek answer reveals in Greek');
select ok(:'el_reveal' ~ '[Α-Ωα-ω]', 'and that is the Greek line');

-- a card with no English: the Greek one
select tests.logout();
update core.quiz_set_cards set content_en = null where id = :'en_rule'::uuid;
select content ->> 'q' as en_rule_el from core.quiz_set_cards where id = :'en_rule'::uuid \gset
select tests.login(:'en'::uuid);
select is((select c -> 'content' ->> 'q' from jsonb_array_elements(api.get_quiz() -> 'cards') c where c ->> 'id' = :'en_rule'),
          :'en_rule_el', 'no English on the card: Greek');
select tests.logout();

-- the generators write both languages
select core.quiz_real(:'en'::uuid, 'tennis', 'score', :'d', 'seed', '{}', '{}') as sc \gset
select is(:'sc'::jsonb -> 'content_en' ->> 'q', '{p1} beat {p2}. What was the score?', 'score: the question');
select ok(:'sc'::jsonb -> 'content_en' ->> 'reveal' ~ '^\{p1\} won \d', 'score: the reveal');
select is(:'sc'::jsonb -> 'content' ->> 'q', '{p1.o} κέρδισε {p2.ton}. Με τι σκορ;', 'score: the Greek is as it was');
select core.quiz_real(:'en'::uuid, 'tennis', 'comeback', :'d', 'seed', array[(select id from pp where g = 1)], '{}') as cb \gset
select is(:'cb'::jsonb -> 'content_en' -> 'options', '[{"label": "Turned it round"}, {"label": "Over in two"}]'::jsonb, 'comeback: the options');
select core.quiz_real(:'en'::uuid, 'tennis', 'h2h', :'d', 'seed', '{}', '{}') as hh \gset
select is(:'hh'::jsonb -> 'content_en' ->> 'reveal', 'All square at 1-1.', 'head to head: level, in English');
select is(:'hh'::jsonb -> 'content_en' -> 'options' -> 2 ->> 'label', 'All square', 'head to head: the third option');
select core.quiz_dynamic(:'en'::uuid, 'tennis', 'post_third', :'d', 'seed', '{}', '{}') as pt \gset
select is(:'pt'::jsonb -> 'content_en' ->> 'tag', 'Third set?', 'after the result: the tag');
select ok(:'pt'::jsonb -> 'content_en' ->> 'q' ~ '^\{p1\} played \{p2\} (today|on [A-Z][a-z]+day)\. Did it go to a third set\?$', 'after the result: the question');
select ok(:'pt'::jsonb -> 'content_en' ->> 'reveal' ~ '^(Upset! )?\{p[12]\} won ', 'after the result: the reveal');
select is(core.quiz_when_en(now(), core.athens_day(now())), 'today', 'today');
select is(core.quiz_when_en(((core.athens_day(now()) + 1)::timestamp + interval '12 hours') at time zone 'Europe/Athens', core.athens_day(now())), 'tomorrow', 'tomorrow');
select core.quiz_who(:'en'::uuid, 'tennis', 'm', 'seed', '{}') as who \gset
select ok(:'who'::jsonb ->> 'q_en' ~ '^(Two|Three|Four) clues, one player\. Who is he\?$', '«Ποιος είναι;»: the question');
select is(jsonb_array_length(:'who'::jsonb -> 'clues_en'), jsonb_array_length(:'who'::jsonb -> 'clues'), '«Ποιος είναι;»: as many clues');
select is((select count(*)::int from jsonb_array_elements_text(:'who'::jsonb -> 'clues_en') x where x ~ '[Α-Ωα-ω]'), 0, '«Ποιος είναι;»: English clues');

-- ---------------------------------------------------------------------------
-- kudos lines
-- ---------------------------------------------------------------------------
select tests.login(:'el'::uuid);
select ok((select bool_and(k -> 'forms' = o.forms) from jsonb_array_elements(api.kudos_options(:'m1'::uuid)) k
             join core.kudos_options o on o.key = k ->> 'key'), 'kudos: Greek lines for a Greek profile');
select tests.login(:'en'::uuid);
select ok((select bool_and(k -> 'forms' = o.forms_en) from jsonb_array_elements(api.kudos_options(:'m1'::uuid)) k
             join core.kudos_options o on o.key = k ->> 'key'), 'kudos: English lines for an English profile');
select tests.logout();
-- «Τι λένε για σένα»: someone said a good word to each of them
update core.players set claimed_by_user_id = :'en'::uuid where id = (select id from pp where g = 1);
update core.profiles set claimed_player_id = (select id from pp where g = 1) where user_id = :'en'::uuid;
update core.players set claimed_by_user_id = :'el'::uuid where id = (select id from pp where g = 2);
update core.profiles set claimed_player_id = (select id from pp where g = 2) where user_id = :'el'::uuid;
insert into core.kudos (from_user_id, to_player_id, match_id, option_id)
values (:'el'::uuid, (select id from pp where g = 1), :'m1'::uuid, (select id from core.kudos_options where key = 'quick_feet')),
       (:'en'::uuid, (select id from pp where g = 2), :'m1'::uuid, (select id from core.kudos_options where key = 'quick_feet'));
select tests.login(:'en'::uuid);
select is(api.get_my_kudos() -> 0 -> 'forms' ->> 'm', 'Quick feet', 'my kudos: English');
select tests.login(:'el'::uuid);
select is(api.get_my_kudos() -> 0 -> 'forms' ->> 'm', 'Γρήγορα πόδια', 'my kudos: Greek');
select tests.logout();
update core.kudos_options set forms_en = null;
select tests.login(:'en'::uuid);
select is(api.get_my_kudos() -> 0 -> 'forms' ->> 'm', 'Γρήγορα πόδια', 'my kudos: no English, the Greek');
select ok((select bool_and(k -> 'forms' = o.forms) from jsonb_array_elements(api.kudos_options(:'m1'::uuid)) k
             join core.kudos_options o on o.key = k ->> 'key'), 'kudos: no English, the Greek');
select tests.logout();

-- ---------------------------------------------------------------------------
-- earn rules
-- ---------------------------------------------------------------------------
select tests.login(:'el'::uuid);
select is((select i ->> 'earn_rule' from jsonb_array_elements(api.get_look() -> 'items') i where i ->> 'key' = 'frame_friends'),
          'Το κερδίζεις όταν ακολουθήσεις 10 παίκτες', 'earn rule: Greek');
select tests.login(:'en'::uuid);
select is((select i ->> 'earn_rule' from jsonb_array_elements(api.get_look() -> 'items') i where i ->> 'key' = 'frame_friends'),
          'Earn it when you follow 10 players', 'earn rule: English');
select tests.logout();
update core.cosmetic_items set earn_rule_text_en = null where key = 'frame_friends';
select tests.login(:'en'::uuid);
select is((select i ->> 'earn_rule' from jsonb_array_elements(api.get_look() -> 'items') i where i ->> 'key' = 'frame_friends'),
          'Το κερδίζεις όταν ακολουθήσεις 10 παίκτες', 'earn rule: no English, the Greek');
select tests.logout();

-- ---------------------------------------------------------------------------
-- reaction labels (core.reactions_json feeds get_results and react)
-- ---------------------------------------------------------------------------
select is((select string_agg(o ->> 'label', ' / ') from jsonb_array_elements(core.reactions_json(:'m1'::uuid, :'el'::uuid) -> 'options') o),
          'Πάμε / Περίπατος', 'reactions: Greek');
select is((select string_agg(o ->> 'label', ' / ') from jsonb_array_elements(core.reactions_json(:'m1'::uuid, :'en'::uuid) -> 'options') o),
          'Let''s go / Walk in the park', 'reactions: English');
select tests.login(:'en'::uuid);
select is((select string_agg(o ->> 'label', ' / ') from jsonb_array_elements(api.react(:'m1'::uuid, 'lets_go') -> 'options') o),
          'Let''s go / Walk in the park', 'reactions: English through api.react');
select tests.logout();
update core.reaction_pool set label_en = '' where key = 'stroll';
select is((select string_agg(o ->> 'label', ' / ') from jsonb_array_elements(core.reactions_json(:'m1'::uuid, :'en'::uuid) -> 'options') o),
          'Let''s go / Περίπατος', 'reactions: no English, the Greek');

-- ---------------------------------------------------------------------------
-- the sponsored label: four result cards bring one sponsored card
-- ---------------------------------------------------------------------------
insert into core.feed_inbox (user_id, kind, ref, payload, created_at)
select u, 'result', 'i18n-r' || g, '{}'::jsonb, now() - g * interval '1 minute'
  from (values (:'el'::uuid), (:'en'::uuid)) x(u), generate_series(1, 4) g;
insert into core.sponsored_cards (sponsor, title, placement, status) values ('Χορηγός', 'Καφές', 'feed', 'active');
select tests.login(:'el'::uuid);
select is((select i ->> 'label' from jsonb_array_elements(api.get_feed() -> 'items') i where i ->> 'kind' = 'sponsored' limit 1),
          'Χορηγούμενο', 'sponsored: Greek');
select tests.login(:'en'::uuid);
select is((select i ->> 'label' from jsonb_array_elements(api.get_feed() -> 'items') i where i ->> 'kind' = 'sponsored' limit 1),
          'Sponsored', 'sponsored: English');
select tests.logout();

-- ---------------------------------------------------------------------------
-- the area of an upcoming tournament, the opponent on a Pro result
-- ---------------------------------------------------------------------------
select id as area, name_el, name_en from core.areas order by sort limit 1 \gset
insert into core.tournaments (sport_id, name, source, starts_on, area_id) values ('tennis', 'Γλώσσα Open', 'import', current_date + 20, :'area')
returning id as t \gset
select is((select doc ->> 'area' from core.upcoming_for(:'en'::uuid) where id = :'t'::uuid), :'name_en', 'upcoming: the area in English');
select is((select doc ->> 'area' from core.upcoming_for(:'el'::uuid) where id = :'t'::uuid), :'name_el', 'upcoming: the area in Greek');

select is(core.my_result_payload(:'m1'::uuid, (select id from pp where g = 1), 1::smallint) ->> 'opponent', 'Γ. Παίκτης2',
          'my result: the opponent as written in English');
select is(core.my_result_payload(:'m1'::uuid, (select id from pp where g = 2), 2::smallint) ->> 'opponent',
          core.opponents_acc(:'m1'::uuid, 2::smallint), 'my result: the opponent in the Greek accusative');

-- ---------------------------------------------------------------------------
-- the writers of the Greek words keep the English in step
-- ---------------------------------------------------------------------------
select tests.create_user('i18n-admin@test.local', 'admin') as adm \gset
select tests.login(:'adm'::uuid);
select api.admin_daily_streak(true);
select tests.logout();
select is((select earn_rule_text_en from core.cosmetic_items where key = 'frame_seven'), 'Earn it with 7 days in a row', 'daily σερί on: Seven in English');
select tests.login(:'adm'::uuid);
select api.admin_daily_streak(false);
select tests.logout();
select is((select earn_rule_text_en from core.cosmetic_items where key = 'frame_ten'), 'Earn it with 10 correct votes in a row', 'daily σερί off: Ten in English');

select id as tpl, slot_template ->> 'tag' as tpl_tag, slot_template ->> 'q' as tpl_q, option_templates::text as tpl_opts
  from core.quiz_templates where active and trigger = 'static' and family = 'o' order by slot_template ->> 'q' limit 1 \gset
select tests.login(:'adm'::uuid);
select api.admin_save_quiz_template(:'tpl'::uuid, jsonb_build_object('family', 'o', 'tag', :'tpl_tag', 'q', :'tpl_q', 'options', :'tpl_opts'::jsonb, 'active', true));
select tests.logout();
select ok((select text_en is not null from core.quiz_templates where id = :'tpl'::uuid), 'a save with the same Greek keeps the English');
select tests.login(:'adm'::uuid);
select api.admin_save_quiz_template(:'tpl'::uuid, jsonb_build_object('family', 'o', 'tag', :'tpl_tag', 'q', :'tpl_q' || ' ;)', 'options', :'tpl_opts'::jsonb));
select tests.logout();
select ok((select text_en is null from core.quiz_templates where id = :'tpl'::uuid), 'new Greek words drop the English, which falls back to the Greek');

select * from finish();
rollback;
