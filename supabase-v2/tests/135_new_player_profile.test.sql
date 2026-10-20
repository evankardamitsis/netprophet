-- «Δεν με βρίσκω, είμαι καινούριος» makes a player (20270226000000_new_player_profile.sql): a pending, unseen player from
-- the onboarding name plus a request staff decide in «Αιτήματα παικτών»; replays, the area step and logging a match
-- reuse it; approve makes it live and theirs with the claim push, reject hides it with its own push.
begin;
select plan(45);

select tests.create_user('np-adm@test.local', 'editor') as adm \gset
select tests.create_user('np-u@test.local') as u \gset
select tests.create_user('np-w@test.local') as w \gset
select tests.create_user('np-x@test.local') as x \gset
select tests.create_user('np-y@test.local') as y \gset
select tests.mk_player('Στέλιος', 'Δυοφορίδης') as dup \gset
select tests.mk_player('Ελένη', 'Ρόστερ', 'f') as roster \gset
select id as area from core.areas order by sort, id limit 1 \gset

create or replace function pg_temp.req(p_user uuid) returns core.claim_requests language sql as $$
  select * from core.claim_requests where user_id = p_user and status = 'pending'
$$;
create or replace function pg_temp.job(p_user uuid) returns jsonb language sql as $$
  select payload from core.outbox where kind = 'push' and payload ->> 'user_id' = p_user::text and payload ->> 'type' = 'claim'
   order by id desc limit 1
$$;

-- the name step, then «είμαι καινούριος»
select tests.login(:'u'::uuid);
select api.update_profile('{"first_name": "Άρης", "surname": "Νεόφυτος"}'::jsonb) is not null as x0 \gset
select is(api.set_claim_status('creation_requested'), 'creation_requested', '«είμαι καινούριος» answers as before');
select tests.logout();
select (pg_temp.req(:'u'::uuid)).player_id as np \gset
select is((pg_temp.req(:'u'::uuid)).via, 'new', 'a request of kind new waits for staff');
select results_eq(format($$select first_name, surname, status, source, claimed_by_user_id from core.players where id = %L$$, :'np'),
                  $$values ('Άρης'::text, 'Νεόφυτος'::text, 'pending'::text, 'user'::text, null::uuid)$$,
                  'a pending player from the onboarding name, nobody''s yet');
select is((select claim_status from core.profiles where user_id = :'u'::uuid), 'creation_requested', 'the profile still says creation_requested');
select is((pg_temp.req(:'u'::uuid)).duplicate_of, null, 'no roster player with that name');

-- not public until approved
select tests.login(:'w'::uuid);
select throws_ok(format($$select api.get_player(%L)$$, :'np'), 'P0002', 'player_not_found', 'no profile page while pending');
select is((select count(*)::int from api.search_players('Νεόφυτος') s), 0, 'not in search while pending');
select tests.logout();

-- replay: nothing new
select tests.login(:'u'::uuid);
select is(api.set_claim_status('creation_requested'), 'creation_requested', 'a replay');
select tests.logout();
select is((select count(*)::int from core.players where search_norm = core.normalize_search('Άρης Νεόφυτος')), 1, 'still one player');
select is((select count(*)::int from core.claim_requests where user_id = :'u'::uuid), 1, 'still one request');

-- the area step after the choice reaches the player
select tests.login(:'u'::uuid);
select api.update_profile(jsonb_build_object('area_id', :'area', 'area_ids', jsonb_build_array(:'area'))) is not null as x1 \gset
select tests.logout();
select is((select area_id from core.players where id = :'np'::uuid), :'area', 'the area saved later is on the player');
select is((select count(*)::int from core.players where search_norm = core.normalize_search('Άρης Νεόφυτος')), 1, 'and no second player');

-- the admin queue: kind, email, area; kept out of «New players»
select tests.login(:'adm'::uuid);
select is((select q ->> 'via' from jsonb_array_elements(api.admin_claim_queue()) q where q ->> 'user_id' = :'u'), 'new', 'in «Αιτήματα παικτών» as a new player');
select is((select q -> 'user' ->> 'email' from jsonb_array_elements(api.admin_claim_queue()) q where q ->> 'user_id' = :'u'),
          'np-u@test.local', 'with the account email');
select is((select q -> 'player' ->> 'area_id' from jsonb_array_elements(api.admin_claim_queue()) q where q ->> 'user_id' = :'u'),
          :'area', 'and the area');
select is((select count(*)::int from jsonb_array_elements(api.admin_moderation() -> 'players') p where p ->> 'player_id' = :'np'),
          0, 'not in «New players»');
select tests.logout();

-- a likely duplicate is flagged
select tests.login(:'w'::uuid);
select api.update_profile('{"first_name": "Στελιος", "surname": "ΔΥΟΦΟΡΙΔΗΣ"}'::jsonb) is not null as x2 \gset
select api.set_claim_status('creation_requested') is not null as x3 \gset
select tests.logout();
select is((pg_temp.req(:'w'::uuid)).duplicate_of, :'dup'::uuid, 'the same name in the roster is flagged');
select tests.login(:'adm'::uuid);
select is((select q -> 'duplicate' ->> 'name' from jsonb_array_elements(api.admin_claim_queue()) q where q ->> 'user_id' = :'w'),
          'Στέλιος Δυοφορίδης', 'staff see «πιθανό ίδιο με …»');
select tests.logout();
select is(core.ingest_person('{"first": "Στέλιος", "surname": "Δυοφορίδης"}'::jsonb) ->> 'player_id', :'dup',
          'a sheet row with a roster name stays with the roster player, not the waiting one');

-- a name typed later is checked again
select tests.login(:'w'::uuid);
select api.update_profile('{"first_name": "Γιώργης", "surname": "Παπαδοπουλάκης"}'::jsonb) is not null as x4 \gset
select tests.logout();
select is((pg_temp.req(:'w'::uuid)).duplicate_of, null, 'a new spelling clears the hint');
select is((select surname from core.players where id = (pg_temp.req(:'w'::uuid)).player_id), 'Παπαδοπουλάκης', 'and renames the pending player');

-- someone logs a match against that exact name, and a sheet has it: both link to the waiting player
select is(core.log_person('{"new": {"first": "Αρης", "surname": "Νεοφυτος"}}'::jsonb), :'np'::uuid, 'a typed opponent links to the waiting player');
select is(core.log_person('{"new": {"first": "Άρης", "surname": "Άλλος"}}'::jsonb) <> :'np'::uuid, true, 'another name is a new player');
select is(core.ingest_person('{"first": "ΑΡΗΣ", "surname": "ΝΕΟΦΥΤΟΣ"}'::jsonb) ->> 'player_id', :'np', 'a sheet row links to the waiting player');
select is(core.ingest_person('{"first": "ΑΡΗΣ", "surname": "ΝΕΟΦΥΤΟΣ"}'::jsonb) ->> 'how', 'match', 'as a match');

-- logging a match while waiting uses the same player
select is(core.own_player(:'u'::uuid), :'np'::uuid, 'the logger''s own player is the waiting one');
select is((select claimed_player_id from core.profiles where user_id = :'u'::uuid), :'np'::uuid, 'and the profile points at it');
select is((pg_temp.req(:'u'::uuid)).player_id, :'np'::uuid, 'the request still waits');

-- only staff decide; approve: live, theirs, the claim push
select tests.login(:'w'::uuid);
select throws_ok(format($$select api.admin_review_claim(%L, true)$$, :'u'), '42501', 'forbidden', 'a player cannot approve');
select tests.logout();
select is(tests.approve_claim(:'u'::uuid) ->> 'via', 'new', '«Έγκριση»');
select results_eq(format($$select status, hidden, claimed_by_user_id from core.players where id = %L$$, :'np'),
                  format($$values ('active'::text, false, %L::uuid)$$, :'u'), 'the player is live and theirs');
select is((select claimed_player_id from core.profiles where user_id = :'u'::uuid), :'np'::uuid, 'the profile has the player');
select is(pg_temp.job(:'u'::uuid) -> 'message' ->> 'body',
          'Ο λογαριασμός σου συνδέθηκε με το προφίλ Άρης Νεόφυτος. Τα ματς σου είναι πια δικά σου, δες τα στο Εγώ.',
          'the approve push names the new profile');
select tests.login(:'y'::uuid);
select is(api.get_player(:'np'::uuid) is not null, true, 'now public');
select tests.logout();

-- reject: hidden, profile back to none, its own push
select (pg_temp.req(:'w'::uuid)).player_id as wp \gset
select is(tests.approve_claim(:'w'::uuid, false) ->> 'decision', 'rejected', '«Απόρριψη»');
select results_eq(format($$select status, hidden, claimed_by_user_id from core.players where id = %L$$, :'wp'),
                  $$values ('pending'::text, true, null::uuid)$$, 'the player stays pending and hidden');
select is((select claim_status from core.profiles where user_id = :'w'::uuid), 'none', 'the profile goes back to none');
select is(pg_temp.job(:'w'::uuid) -> 'message' ->> 'title', 'Δεν φτιάξαμε το προφίλ', 'the reject push');
select tests.login(:'adm'::uuid);
select is((select count(*)::int from jsonb_array_elements(api.admin_moderation() -> 'players') p where p ->> 'player_id' = :'wp'),
          0, 'a rejected new player does not come back under «New players»');
select tests.logout();
select is(pg_temp.job(:'w'::uuid) -> 'message' ->> 'body',
          'Δεν φτιάξαμε το προφίλ Γιώργης Παπαδοπουλάκης. Αν είσαι ήδη στο ρόστερ, γράψε μας και θα σε βρούμε.',
          'naming the profile');

-- changed their mind: a roster pick replaces the request and hides the new player
select tests.login(:'x'::uuid);
select api.update_profile('{"first_name": "Νίκη", "surname": "Αλλαξοδρόμου"}'::jsonb) is not null as x5 \gset
select api.set_claim_status('creation_requested') is not null as x6 \gset
select (pg_temp.req(:'x'::uuid)).player_id as xp \gset
select is(api.claim_player(:'roster'::uuid) ->> 'requested', 'true', '«Εγώ είμαι» after all');
select tests.logout();
select is((pg_temp.req(:'x'::uuid)).via, 'app', 'the open request is the roster claim');
select is((select hidden from core.players where id = :'xp'::uuid), true, 'the new player is hidden');

-- no name yet: the request comes when the name is saved
update core.profiles set first_name = null, surname = null where user_id = :'y'::uuid;
select tests.login(:'y'::uuid);
select api.set_claim_status('creation_requested') is not null as x7 \gset
select tests.logout();
select is((select count(*)::int from core.claim_requests where user_id = :'y'::uuid), 0, 'no name, no request yet');
select tests.login(:'y'::uuid);
select api.update_profile('{"first_name": "Σοφία", "surname": "Αργότερη"}'::jsonb) is not null as x8 \gset
select tests.logout();
select is((select p.surname from core.claim_requests q join core.players p on p.id = q.player_id
            where q.user_id = :'y'::uuid and q.status = 'pending' and q.via = 'new'), 'Αργότερη', 'it comes with the name');

select * from finish();
rollback;
