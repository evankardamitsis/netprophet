-- Pushes in English (20270501000000_i18n_pushes): every text has its English, a Greek profile gets exactly today's
-- Greek, an English profile gets English, a text without English falls back to Greek, the values fill in both
-- languages (with the English stand-ins), the builders pick per person, and the admin saves the English too.
begin;
select plan(34);

select tests.create_user('i18n-el@test.local') as el \gset
select tests.create_user('i18n-en@test.local') as en \gset
update core.profiles set locale = 'en' where user_id = :'en'::uuid;

-- ── every text has its English, with the same rules as the Greek ──
select is((select count(*)::int from core.notification_texts where title_en is null or body_en is null), 0, 'every text has an English title and body');
select is((select count(*)::int from core.notification_texts t
            where exists (select 1 from unnest(core.ntext_names(t.title_en) || core.ntext_names(t.body_en)) n where n <> all (t.placeholders))),
          0, 'the English uses only each text''s placeholders');
select is((select count(*)::int from core.notification_texts where strpos(title_en || body_en, chr(8212)) > 0), 0, 'no em dash in English');
select is((select count(*)::int from core.notification_texts
            where (title_en || ' ' || body_en) ~* '\m(bet|bets|odds|wager|stake|winnings|league)\M'), 0, 'no betting words, Ladder never League');

-- ── the recipient's language ──
select is(core.user_locale(:'el'::uuid), 'el', 'a Greek profile is el');
select is(core.user_locale(:'en'::uuid), 'en', 'an English profile is en');
select is(core.user_locale(gen_random_uuid()), 'el', 'no profile is el');

-- ── Greek stays byte for byte the same: every key, every placeholder filled ──
create temp table probe as
  select t.key, coalesce((select jsonb_object_agg(p, 'x' || p) from unnest(t.placeholders) p), '{}'::jsonb) as vars
    from core.notification_texts t;
select is((select count(*)::int from probe p, core.ntext(p.key, p.vars) a, core.ntext_in(p.key, p.vars, 'el') b
            where a.title is distinct from b.title or a.body is distinct from b.body), 0, 'el: every text as core.ntext');
select is((select count(*)::int from probe p, core.ntext(p.key, p.vars) a, core.ntext_for(:'el'::uuid, p.key, p.vars) b
            where a.title is distinct from b.title or a.body is distinct from b.body), 0, 'a Greek profile: every text as core.ntext');
select is((select count(*)::int from probe p, core.ntext(p.key, p.vars || '{"when_en": "EN", "opponent_en": "EN", "name_en": "EN"}') a,
                  core.ntext(p.key, p.vars) b
            where a.title is distinct from b.title or a.body is distinct from b.body), 0, 'the _en values never reach Greek');

-- ── Greek gets Greek, English gets English ──
select is((select title || '|' || body from core.ntext_for(:'el'::uuid, 'results_many', '{"n": 3}')),
          'Βγήκαν 3 αποτελέσματα|Πόσα το ’πες; Μπες να δεις.', 'Greek profile: Greek');
select is((select title || '|' || body from core.ntext_for(:'en'::uuid, 'results_many', '{"n": 3}')),
          '3 results are in|How many did you call? Come and see.', 'English profile: English');
select is((select title || '|' || body from core.ntext_for(:'en'::uuid, 'streak_saved', '{"n": 9, "left": 2}')),
          'Insurance saved your streak|You didn''t play yesterday, your streak stays at 9. You have 2 Insurance left.', 'English: the streak');

-- ── values fill in both, the English stand-ins in English only ──
select is((select title || '|' || body from core.ntext_in('schedule_new',
             '{"when": "Σάβ 16/10, 10:00", "when_en": "Sat 16 Oct, 10:00", "tournament": "Glyfada Open", "opponent": "Παππάς"}', 'en')),
          'Your schedule|Sat 16 Oct, 10:00 · Glyfada Open · vs Παππάς', 'English: when_en stands in for when, names as written');
select is((select body from core.ntext_in('schedule_new',
             '{"when": "Σάβ 16/10, 10:00", "when_en": "Sat 16 Oct, 10:00", "tournament": "Glyfada Open", "opponent": "Παππάς"}', 'el')),
          'Σάβ 16/10, 10:00 · Glyfada Open · με Παππάς', 'Greek: the same values, when as before');
select is((select body from core.ntext_in('reminder_soon', '{"time": "10:00", "tournament": null, "opponent": "Παππάς"}', 'en')),
          '10:00 · vs Παππάς', 'English: a piece with no value drops with its « · »');
select is((select title || '|' || body from core.ntext_in('stage_open',
             '{"stage": "Τελικός", "stage_en": "Final", "tournament": "T", "category": "M OPEN", "a": "Π. Βλάχος", "b": "τον Ν. Παππά", "b_en": "Ν. Παππάς"}', 'en')),
          'Final at T|M OPEN · Π. Βλάχος vs Ν. Παππάς. Who takes it?', 'English: the round and the plain name');
select is((select body from core.ntext_in('entry_deadline', '{"tournament": "T", "day": "Πέμ", "date": "22/10"}', 'en')),
          'T: entries close Πέμ 22/10. Are you in?', 'English: no stand-in given, the value itself');
select is(core.english_when('2027-10-16 10:00+03'), 'Sat 16 Oct, 10:00', 'a time in English, Athens time');

-- ── no English text: Greek ──
update core.notification_texts set title_en = null, body_en = null where key = 'results_one';
select is((select title || '|' || body from core.ntext_for(:'en'::uuid, 'results_one', '{}')),
          'Βγήκε αποτέλεσμα|Το ’πες; Μπες να δεις.', 'no English: the Greek text');
update core.notification_texts set title_en = 'A result is in', body_en = null where key = 'results_one';
select is((select title from core.ntext_for(:'en'::uuid, 'results_one', '{}')), 'Βγήκε αποτέλεσμα', 'half an English text: the Greek text, never mixed');
update core.notification_texts set body_en = 'Did you call it? Come and see.' where key = 'results_one';

-- ── the builders pick per person ──
-- a match reminder (Pro), the evening before
insert into core.entitlements (user_id, source, status) values (:'el'::uuid, 'gift', 'active'), (:'en'::uuid, 'gift', 'active');
select tests.mk_player('Ελλην', 'Ελληνικός') as p_el \gset
select tests.mk_player('Αγγλ', 'Αγγλικός') as p_en \gset
select tests.mk_player('Νοτ', 'Αντίπαλος') as p_op \gset
update core.players set claimed_by_user_id = :'el'::uuid where id = :'p_el'::uuid;
update core.players set claimed_by_user_id = :'en'::uuid where id = :'p_en'::uuid;
select ((core.athens_day(now()) + 1) + time '10:00') at time zone 'Europe/Athens' as starts \gset
select tests.mk_match(:'p_el'::uuid, :'p_op'::uuid, :'starts'::timestamptz) as m1 \gset
select tests.mk_match(:'p_en'::uuid, :'p_op'::uuid, :'starts'::timestamptz) as m2 \gset
select core.match_reminders((core.athens_day(now()) + time '20:05') at time zone 'Europe/Athens');
select is((select payload ->> 'title' || '|' || (payload ->> 'body') from core.notifications where user_id = :'el'::uuid and type = 'reminder'),
          'Αύριο παίζεις|' || core.greek_when(:'starts'::timestamptz) || ' · με Αντίπαλος', 'reminder: Greek as before');
select is((select payload ->> 'title' || '|' || (payload ->> 'body') from core.notifications where user_id = :'en'::uuid and type = 'reminder'),
          'You play tomorrow|' || core.english_when(:'starts'::timestamptz) || ' · vs Αντίπαλος', 'reminder: English, the time in English');

-- the results push, built when it is sent
insert into core.push_tokens (token, user_id, platform) values
  ('ExponentPushToken[i18n-el]', :'el'::uuid, 'ios'), ('ExponentPushToken[i18n-en]', :'en'::uuid, 'ios');
update core.outbox set done_at = now() where kind = 'push' and done_at is null;
insert into core.outbox (kind, payload, idempotency_key)
select 'push', jsonb_build_object('user_id', u, 'dedupe_key', 'result:' || u || ':' || g), 'push:result:' || u || ':' || g
  from (select v.u, gen_random_uuid() as g from (values (:'el'::uuid), (:'en'::uuid)) v(u) cross join generate_series(1, 2)) x;
create temp table sent as select e from jsonb_array_elements(core.take_push_batch(500)) e;
select is((select e ->> 'title' from sent where e ->> 'to' = 'ExponentPushToken[i18n-el]'), 'Βγήκαν 2 αποτελέσματα', 'results push: Greek');
select is((select e ->> 'title' || '|' || (e ->> 'body') from sent where e ->> 'to' = 'ExponentPushToken[i18n-en]'),
          '2 results are in|How many did you call? Come and see.', 'results push: English');

-- a push to everyone with a device: each in their language
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Κύπελλο Γλυφάδας', 'import') returning id as t \gset
select ok(core.new_tournament_alert(:'t'::uuid) >= 2, 'the new tournament push is queued');
select is((select payload -> 'message' ->> 'title' from core.outbox where idempotency_key = 'push:new_tournament:' || :'el' || ':' || :'t'),
          'Νέο τουρνουά: Κύπελλο Γλυφάδας', 'new tournament: Greek');
select is((select payload -> 'message' ->> 'title' || '|' || (payload -> 'message' ->> 'body')
             from core.outbox where idempotency_key = 'push:new_tournament:' || :'en' || ':' || :'t'),
          'New tournament: Κύπελλο Γλυφάδας|The schedule is out. Jump in and vote on the first matches.', 'new tournament: English, the name as written');

-- ── the admin saves the English next to the Greek ──
select tests.create_user('i18n-ed@test.local', 'editor') as ed \gset
update core.notification_texts set approved_at = now() where key = 'results_many';
select tests.login(:'ed'::uuid);
select is((select d ->> 'title_en' || '|' || (d ->> 'body_en') || '|' || coalesce(d ->> 'approved_at', 'none')
             from api.admin_update_notification_text('results_many', 'Βγήκαν {n} αποτελέσματα', 'Πόσα το ’πες; Μπες να δεις.',
                                                     '{n} new results', 'How many did you call?') d),
          '{n} new results|How many did you call?|none', 'an English edit saves and clears the approval');
select is((select d ->> 'title_en' from api.admin_update_notification_text('results_many', 'Βγήκαν {n}!', 'Πόσα το ’πες;') d),
          '{n} new results', 'a Greek-only call keeps the English');
select throws_ok($$select api.admin_update_notification_text('results_many', 'Βγήκαν {n}', 'x', 'Only a title', '')$$,
                 '22023', 'en_incomplete', 'English is both or neither');
select throws_ok($$select api.admin_update_notification_text('results_many', 'Βγήκαν {n}', 'x', '{count} results', 'x')$$,
                 '22023', 'unknown_placeholder: count', 'English: only this text''s placeholders');
select throws_ok(format('select api.admin_update_notification_text(%L, %L, %L, %L, %L)', 'results_many', 'x', 'x', repeat('a', 61), 'x'),
                 '22023', 'title_en_too_long', 'English: the title has a limit');
select is((select coalesce(d ->> 'title_en', 'none') || '|' || coalesce(d ->> 'body_en', 'none')
             from api.admin_update_notification_text('results_many', 'Βγήκαν {n}', 'x', '', '') d),
          'none|none', 'empty English clears it (the push goes out in Greek)');
select tests.logout();

select * from finish();
rollback;
