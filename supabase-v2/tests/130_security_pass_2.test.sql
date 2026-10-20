-- Security pass 2 (20 Oct): no minor in the claim search or a single follow; daily caps on logging, kudos and claim
-- requests; follow_players takes 50 at most; a match link answers once; no public listing of storage; bounded
-- profile fields; a store TRANSFER moves Pro; core helpers are not executable by authenticated.
begin;
select plan(30);

select tests.create_user('s2-u@test.local') as u \gset
select tests.create_user('s2-v@test.local') as v \gset
select tests.create_user('s2-ed@test.local', 'editor') as ed \gset
select tests.mk_player('Μικρός', 'Ανήλικοςδύο') as kid \gset
update core.players set is_minor = true where id = :'kid'::uuid;

-- ── minors ──
select tests.login(:'u'::uuid);
select is((select count(*)::int from api.find_matching_players('Μικρός', 'Ανήλικοςδύο')), 0, 'the claim search never lists a minor');
select throws_ok(format($$select api.follow_player(%L)$$, :'kid'), 'P0002', 'player_not_found', 'nobody follows a minor one by one');

-- ── follow_players: 50 at most ──
select throws_ok($$select api.follow_players((select array_agg(gen_random_uuid()) from generate_series(1, 51)))$$,
                 '54000', 'too_many', '51 ids at once are refused');
select lives_ok($$select api.follow_players((select array_agg(gen_random_uuid()) from generate_series(1, 50)))$$,
                '50 are fine');
select tests.logout();

-- ── log_match: 10 new matches per Athens day ──
select tests.mk_player('Λογ', 'Ορίουδύο') as me \gset
select tests.mk_player('Αντί', 'Ορίουδύο') as o \gset
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
update core.profiles set first_name = 'Λογ', surname = 'Ορίουδύο' where user_id = :'u'::uuid;
select tests.mk_match_fresh() from generate_series(1, 9);
update core.matches set source = 'user', logged_by = :'u'::uuid
 where id in (select id from core.matches where logged_by is null order by created_at desc limit 9);
select is((select count(*)::int from core.matches where logged_by = :'u'::uuid), 9, 'nine logged today');
select tests.login(:'u'::uuid);
select lives_ok(format($$select api.log_match('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}')$$,
                       core.athens_day() + 1, :'o'), 'the tenth goes in');
select throws_ok(format($$select api.log_match('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}')$$,
                        core.athens_day() + 2, :'o'), '54000', 'rate_limited', 'the eleventh waits for tomorrow');
select tests.logout();
update core.matches set created_at = now() - interval '2 days' where logged_by = :'u'::uuid;
select tests.login(:'u'::uuid);
select lives_ok(format($$select api.log_match('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}')$$,
                       core.athens_day() + 5, :'o'), 'a new day, a new ten');
select tests.logout();

-- ── give_kudo: 50 a day ──
select tests.mk_match_fresh() as km \gset
insert into core.kudos (from_user_id, to_player_id, match_id, option_id)
select :'v'::uuid, tests.mk_player('Κύδος', 'Παίκτης' || g), :'km'::uuid, (select id from core.kudos_options where active limit 1)
  from generate_series(1, 50) g;
select key as kkey from core.kudos_options where active limit 1 \gset
select tests.login(:'v'::uuid);
select throws_ok(format($$select api.give_kudo(%L, %L)$$, :'km', :'kkey'), '54000', 'rate_limited', 'the 51st kudo of the day is refused');
select tests.logout();
update core.kudos set created_at = now() - interval '2 days' where from_user_id = :'v'::uuid;
select tests.login(:'v'::uuid);
select throws_ok(format($$select api.give_kudo(%L, %L)$$, :'km', :'kkey'), 'P0002', 'match_not_found',
                 'a day later the cap is gone (the next check speaks)');
select tests.logout();

-- ── claim requests: 5 a day, a replay is not counted ──
select tests.mk_player('Κλαίημ', 'Ένα') as c1 \gset
select tests.mk_player('Κλαίημ', 'Δύο') as c2 \gset
insert into core.claim_requests (user_id, player_id, status)
select :'v'::uuid, tests.mk_player('Παλιό', 'Αίτημα' || g), 'cancelled' from generate_series(1, 4) g;
insert into core.claim_requests (user_id, player_id, status) values (:'v'::uuid, :'c1'::uuid, 'pending');
select tests.login(:'v'::uuid);
select is((api.claim_player(:'c1'::uuid) ->> 'replayed')::boolean, true, 'asking again for the same player is a replay');
select throws_ok(format($$select api.claim_player(%L)$$, :'c2'), '54000', 'rate_limited', 'a sixth request in a day is refused');
select tests.logout();
select is((select status from core.claim_requests where user_id = :'v'::uuid and player_id = :'c1'::uuid), 'pending',
          'the open request stays open');

-- ── a match link answers once ──
select tests.mk_player('Σύνδ', 'Εσμοςδύο') as lp \gset
select tests.mk_match(:'me'::uuid, :'lp'::uuid, now() - interval '1 hour') as lm \gset
insert into core.match_results (match_id, winner_side, sets, sets_won, sets_lost) values (:'lm'::uuid, 1, '[]', 2, 0);
insert into core.match_confirmations (match_id, player_id, state, via) values (:'lm'::uuid, :'lp'::uuid, 'pending', 'feed');
insert into core.match_links (match_id, player_id, token_hash) values (:'lm'::uuid, :'lp'::uuid, core.link_hash('s2-token'));
select tests.as_anon();
select lives_ok($$select api.answer_link('s2-token', 'yes')$$, 'the link answers');
select throws_ok($$select api.answer_link('s2-token', 'not_me')$$, 'P0002', 'nothing_to_confirm', 'and only once');
select tests.logout();

-- ── storage: nobody lists, owners and staff still manage ──
insert into storage.objects (bucket_id, name, owner) values ('avatars', :'u' || '/me.png', :'u'::uuid);
insert into storage.objects (bucket_id, name, owner) values ('logos', 'clubs/00000000-0000-0000-0000-0000000020b2/x.png', :'ed'::uuid);
select tests.as_anon();
select is((select count(*)::int from storage.objects where bucket_id in ('avatars', 'logos', 'athlete-photos')), 0,
          'anonymous callers list nothing');
select tests.login(:'v'::uuid);
select is((select count(*)::int from storage.objects where bucket_id in ('avatars', 'logos')), 0, 'another user lists nothing');
select tests.login(:'u'::uuid);
select is((select count(*)::int from storage.objects where bucket_id = 'avatars'), 1, 'the owner sees their own avatar');
select tests.login(:'ed'::uuid);
select is(tests.rowcount($q$delete from storage.objects where bucket_id = 'logos' and name like 'clubs/%/x.png'$q$), 1,
          'staff can still remove a logo');
select tests.logout();
select is((select count(*)::int from pg_policies where schemaname = 'storage' and 'anon' = any (roles)), 0,
          'no storage policy for anon');

-- ── update_profile ──
select tests.login(:'u'::uuid);
select throws_ok(format($$select api.update_profile(jsonb_build_object('display_name', %L))$$, repeat('α', 61)),
                 '22023', null, 'a 61 character name is refused');
select throws_ok($$select api.update_profile('{"surname": "   "}')$$, '22023', null, 'a blank surname is refused');
select api.update_profile('{"first_name": "  Νίκος  "}');
select is((select first_name from core.profiles where user_id = :'u'::uuid), 'Νίκος', 'names are stored trimmed');
select throws_ok($$select api.update_profile(jsonb_build_object('onboarding_state',
                     jsonb_build_object('x', (select string_agg(md5(g::text), '') from generate_series(1, 400) g))))$$,
                 '22023', null, 'onboarding_state over 8 KB is refused');
select lives_ok($$select api.update_profile('{"notification_prefs": {"results": true}, "display_name": null}')$$,
                'small prefs and a cleared name are fine');
select tests.logout();

-- ── the store: TRANSFER ──
insert into core.entitlements (user_id, key, source, status, ends_at)
values (:'u'::uuid, 'pro', 'subscription', 'active', now() + interval '20 days');
select tests.as_service();
select api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 's2-transfer', 'type', 'TRANSFER', 'transferred_from', jsonb_build_array('$RCAnonymousID:abc', :'u'),
  'transferred_to', jsonb_build_array(:'v'))));
select tests.logout();
select ok(not core.is_pro(:'u'::uuid) and core.is_pro(:'v'::uuid), 'Pro moves to the new account');
select cmp_ok((select ends_at from core.entitlements where user_id = :'v'::uuid and source = 'subscription'), '>',
              now() + interval '19 days', 'with the end it had');
select tests.as_service();
select is((api.apply_store_event(jsonb_build_object('event', jsonb_build_object(
  'id', 's2-transfer', 'type', 'TRANSFER', 'transferred_from', jsonb_build_array(:'v'),
  'transferred_to', jsonb_build_array(:'u')))) ->> 'duplicate')::boolean, true, 'the same event twice changes nothing');
select tests.logout();

-- ── core helpers ──
select ok(not has_function_privilege('authenticated', 'core.badge_counters(uuid)', 'execute')
          and not has_function_privilege('authenticated', 'core.ingest_person(jsonb, uuid)', 'execute'),
          'authenticated cannot run core helpers directly');
select ok(has_function_privilege('authenticated', 'core.is_staff()', 'execute')
          and has_function_privilege('authenticated', 'core.can_write_athlete_photo(text)', 'execute'),
          'the helpers RLS policies call stay executable');

select * from finish();
rollback;
