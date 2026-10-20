-- Identity checks (20270227000000_identity_checks.sql): the name shape, «Δεν είμαι εγώ;» / «Είμαι εγώ» reports,
-- claimed players in «Ποιος είσαι;», the account hints staff see, and the first official result on a player a user
-- made.
begin;
select plan(63);

select tests.create_user('id-adm@test.local', 'editor') as adm \gset
select tests.create_user('id-a@test.local', 'user', 'Alkis Plakias') as a \gset
select tests.create_user('id-b@test.local', 'user', 'Κάποιος Άλλος') as b \gset
select tests.create_user('id-c@test.local') as c \gset
select tests.create_user('id-n@test.local') as n \gset
update auth.users set raw_app_meta_data = '{"provider": "google", "providers": ["google"]}' where id = :'b'::uuid;
update auth.users set raw_app_meta_data = '{"provider": "email", "providers": ["email", "apple"]}' where id = :'a'::uuid;
select tests.mk_player('Αλκιβιάδης', 'Πλακιάς') as pl \gset
select tests.mk_player('Αλκιβιάδης', 'Πλακιώτης') as free \gset

-- ── 1. the shape and the tidy ──
select is(core.name_tidy('  ΑΛΚΙΒΙΑΔΗΣ  '), 'Αλκιβιαδης', 'ALL CAPS Greek is title-cased, final sigma included');
select is(core.name_tidy('αλκιβιάδης'), 'Αλκιβιάδης', 'all lower case keeps its accents');
select is(core.name_tidy('ΠΑΠΑΔΟΠΟΥΛΟΣ - ΓΚΙΚΑΣ'), 'Παπαδοπουλος-Γκικας', 'each word part, spaces round a hyphen go');
select is(core.name_tidy('o''brien'), 'O''Brien', 'Latin after an apostrophe');
select is(core.name_tidy('McDonald'), 'McDonald', 'mixed case stays as typed');
select is(core.name_tidy('Άννα   Μαρία'), 'Άννα Μαρία', 'spaces collapse');
select ok(core.name_shape_ok('Αλκιβιάδης'), 'a Greek name');
select ok(core.name_shape_ok('Ζωή-Ελένη'), 'with a hyphen');
select ok(core.name_shape_ok('Chloë'), 'Latin with a diaeresis');
select ok(core.name_shape_ok('Li'), 'two letters');
select ok(not core.name_shape_ok('Α'), 'one letter is not a name');
select ok(not core.name_shape_ok('Α.'), 'an initial is not a name');
select ok(not core.name_shape_ok('Nikos99'), 'no digits');
select ok(not core.name_shape_ok('-Νίκος'), 'no hyphen at the start');
select ok(not core.name_shape_ok('Νίκος  Π'), 'no double space');
select ok(not core.name_shape_ok('😀😀'), 'no emoji');

select tests.login(:'c'::uuid);
select throws_ok($$select api.update_profile('{"first_name": "Α", "surname": "Πλακιάς"}')$$, '22023', 'name_shape: first_name', 'update_profile refuses a one-letter first name');
select throws_ok($$select api.update_profile('{"first_name": "Αλκής", "surname": "x1"}')$$, '22023', 'name_shape: surname', 'and a surname with a digit');
select lives_ok($$select api.update_profile('{"first_name": "ΑΛΚΗΣ", "surname": "πλακιας"}')$$, 'a real name saves');
select tests.logout();
select results_eq(format($$select first_name, surname from core.profiles where user_id = %L$$, :'c'),
                  $$values ('Αλκης'::text, 'Πλακιας'::text)$$, 'tidied on the way in');

-- a legacy profile with a bad name: «είμαι καινούριος» refuses it, other profile changes still save
update core.profiles set first_name = 'Χ', surname = 'Ψ' where user_id = :'n'::uuid;
select tests.login(:'n'::uuid);
select throws_ok($$select api.set_claim_status('creation_requested')$$, '22023', 'name_shape', 'no new player from a one-letter name');
select tests.logout();
update core.profiles set claim_status = 'creation_requested' where user_id = :'n'::uuid;
select tests.login(:'n'::uuid);
select lives_ok($$select api.update_profile('{"gender": "m"}')$$, 'the profile still saves');
select tests.logout();
select is((select count(*)::int from core.claim_requests where user_id = :'n'::uuid), 0, 'and no request was made');

-- ── 2. claimed players in «Ποιος είσαι;» ──
update core.players set claimed_by_user_id = :'b'::uuid where id = :'pl'::uuid;
select tests.login(:'a'::uuid);
select is((select claimed from api.find_matching_players('Αλκιβιάδης', 'Πλακιάς') where id = :'pl'::uuid), true,
          'a player another account holds is listed, marked claimed');
select is((select claimed from api.find_matching_players('Αλκιβιάδης', 'Πλακιώτης') where id = :'free'::uuid), false,
          'a free one is not marked');
select tests.logout();
select tests.login(:'b'::uuid);
select is((select claimed from api.find_matching_players('Αλκιβιάδης', 'Πλακιάς') where id = :'pl'::uuid), false,
          'the holder sees their own player unmarked');
select tests.logout();
update core.players set hidden = true where id = :'free'::uuid;
select tests.login(:'a'::uuid);
select is((select count(*)::int from api.find_matching_players('Αλκιβιάδης', 'Πλακιώτης') where id = :'free'::uuid), 0, 'hidden players stay out');
select is((api.get_player(:'pl')) ->> 'claimed', 'true', 'the profile says an account holds it');

-- ── 2. «Δεν είμαι εγώ;» ──
select throws_ok(format($$select api.report_claim(%L, %L)$$, :'pl', repeat('α', 201)), '22023', 'note_too_long', 'a note up to 200');
select is(api.report_claim(:'pl', 'Είμαι ο Αλκής') ->> 'reported', 'true', 'a report');
select is(api.report_claim(:'pl', 'Είμαι ο Αλκής, ο αληθινός') ->> 'replayed', 'true', 'again: the same report');
select tests.logout();
select is((select count(*)::int from core.identity_flags where reporter_user_id = :'a'::uuid), 1, 'one open report per person and player');
select is((select claimer_user_id from core.identity_flags where reporter_user_id = :'a'::uuid), :'b'::uuid, 'it remembers who held it');
select tests.login(:'b'::uuid);
select throws_ok(format($$select api.report_claim(%L)$$, :'pl'), '22023', 'own_player', 'not on your own player');
select throws_ok($$select count(*) from core.identity_flags$$, '42501', null, 'nobody reads the reports');
select throws_ok($$select api.admin_identity_queue()$$, '42501', 'forbidden', 'the queue is staff only');
select tests.logout();
select tests.login(:'c'::uuid);
select throws_ok(format($$select api.report_claim(%L)$$, :'free'), 'P0002', 'player_not_found', 'not on a hidden player');
select tests.logout();
-- 5 a day
select tests.login(:'c'::uuid);
select is(api.report_claim(:'pl', null, 'is_me') ->> 'reported', 'true', '«Είμαι εγώ» from onboarding');
select tests.logout();
insert into core.identity_flags (kind, player_id, reporter_user_id, created_at, status)
select 'not_them', tests.mk_player('Τεστ', 'Ρ' || g), :'c'::uuid, now(), 'dismissed' from generate_series(1, 4) g;
select tests.mk_player('Μάρκος', 'Πέμπτος') as fifth \gset
update core.players set claimed_by_user_id = :'n'::uuid where id = :'fifth'::uuid;
select tests.login(:'c'::uuid);
select throws_ok(format($$select api.report_claim(%L)$$, :'fifth'), '54000', 'rate_limited', 'at most 5 reports a day');
select tests.logout();

-- ── 3. the hints staff see ──
select tests.login(:'adm'::uuid);
select is((select jsonb_array_length(api.admin_identity_queue())), 2, 'two open reports on the desk');
select is((select f -> 'claimer' -> 'providers' from jsonb_array_elements(api.admin_identity_queue()) f where f ->> 'kind' = 'not_them'),
          '["google"]'::jsonb, 'how the holder signs in');
select is((select f -> 'claimer' ->> 'provider_name' from jsonb_array_elements(api.admin_identity_queue()) f where f ->> 'kind' = 'not_them'),
          'Κάποιος Άλλος', 'the name Google gave, not the player''s');
select is((select f -> 'reporter' ->> 'provider_name' from jsonb_array_elements(api.admin_identity_queue()) f where f ->> 'kind' = 'not_them'),
          'Alkis Plakias', 'the reporter''s too (Greeklish is a different spelling here)');
select is((select f -> 'reporter' -> 'providers' from jsonb_array_elements(api.admin_identity_queue()) f where f ->> 'kind' = 'not_them'),
          '["apple", "email"]'::jsonb, 'every sign-in the reporter has');
select is((select (f ->> 'reports')::int from jsonb_array_elements(api.admin_identity_queue()) f where f ->> 'kind' = 'not_them'),
          2, 'two people say it is not the holder');
select tests.logout();
-- the claim queue too, with the request count
select tests.mk_player('Ρόστερ', 'Ελεύθερος') as rfree \gset
select tests.login(:'c'::uuid);
select (api.claim_player(:'rfree'::uuid)) is not null as x1 \gset
select tests.logout();
select tests.login(:'adm'::uuid);
select is((select q -> 'account' ->> 'requests' from jsonb_array_elements(api.admin_claim_queue()) q where q ->> 'user_id' = :'c'),
          '1', 'how many claims the account has asked for');
select is((select q -> 'account' ->> 'provider_name' from jsonb_array_elements(api.admin_claim_queue()) q where q ->> 'user_id' = :'c'),
          null, 'no provider name when it is just the email');
select tests.logout();
select tests.login(:'c'::uuid);
select throws_ok($$select api.admin_claim_queue()$$, '42501', 'forbidden', 'the hints are staff only');
select tests.logout();

-- ── staff decide ──
select id as f_not from core.identity_flags where kind = 'not_them' and reporter_user_id = :'a'::uuid \gset
select id as f_me from core.identity_flags where kind = 'is_me' and reporter_user_id = :'c'::uuid \gset
update core.players set claimed_by_user_id = :'c'::uuid where id = (select id from core.players where surname = 'Ρ1');
select tests.login(:'adm'::uuid);
select throws_ok(format($$select api.admin_decide_identity(%L, 'give')$$, :'f_me'), '23505', 'already_claimed_other',
                 'not to someone who already holds a player');
select is(api.admin_decide_identity(:'f_not', 'give') ->> 'status', 'given', '«Δώσ’ το στον αναφέροντα»');
select tests.logout();
select is((select claimed_by_user_id from core.players where id = :'pl'::uuid), :'a'::uuid, 'the reporter holds the player now');
select is((select claimed_player_id from core.profiles where user_id = :'b'::uuid), null, 'the old account let go');
select is((select status from core.identity_flags where id = :'f_me'::uuid), 'given', 'the other report on it closed too');
select is((select payload -> 'message' ->> 'title' from core.outbox where payload ->> 'user_id' = :'a' and payload ->> 'type' = 'claim'),
          'Είσαι εσύ!', 'with the claim push');

-- ── 4. the first official result ──
select tests.create_user('id-u@test.local') as u \gset
select tests.login(:'u'::uuid);
select api.update_profile('{"first_name": "Ορέστης", "surname": "Καινούριος"}'::jsonb) is not null as x2 \gset
select api.set_claim_status('creation_requested') is not null as x3 \gset
select tests.logout();
select tests.approve_claim(:'u'::uuid) is not null as x4 \gset
select player_id as up from core.claim_requests where user_id = :'u'::uuid \gset
select tests.mk_match(:'up', tests.mk_player('Αντί', 'Παλος')) as m1 \gset
select is((select count(*)::int from core.identity_flags where player_id = :'up'::uuid), 0, 'nothing before a result');
select tests.finish_match(:'m1') is not null as x5 \gset
select results_eq(format($$select kind, match_id, claimer_user_id, status from core.identity_flags where player_id = %L$$, :'up'),
                  format($$values ('first_official'::text, %L::uuid, %L::uuid, 'open'::text)$$, :'m1', :'u'),
                  'the first official result is flagged');
select tests.mk_match(:'up', tests.mk_player('Αντί', 'Παλος Δύο')) as m2 \gset
select tests.finish_match(:'m2') is not null as x6 \gset
select is((select count(*)::int from core.identity_flags where player_id = :'up'::uuid), 1, 'once per player');
select is((select count(*)::int from core.match_results where match_id = :'m1'::uuid), 1, 'the result stands');
select is((select count(*)::int from core.identity_flags f join core.players p on p.id = f.player_id
            where f.kind = 'first_official' and p.source <> 'user'), 0, 'roster players are never flagged');
select id as f_off from core.identity_flags where player_id = :'up'::uuid \gset
select tests.login(:'adm'::uuid);
select is((select f -> 'match' ->> 'id' from jsonb_array_elements(api.admin_identity_queue()) f where f ->> 'id' = :'f_off'),
          :'m1', 'staff see the match');
select is(api.admin_decide_identity(:'f_off', 'unlink') ->> 'status', 'unlinked', '«Αποσύνδεση»');
select throws_ok(format($$select api.admin_decide_identity(%L, 'dismiss')$$, :'f_off'), '22023', 'not_open', 'decided once');
select tests.logout();
select is((select claimed_by_user_id from core.players where id = :'up'::uuid), null, 'unlinked');

select * from finish();
rollback;
