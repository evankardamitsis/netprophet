-- Registration audit (20270301000000_registration_audit): the claim search, the roster count, the claimed
-- candidate's sign-in hint, «είμαι καινούριος» after a roster request, minors, deleting an account.
-- docs/v2/registration-audit.md points at these test names.
begin;
select plan(34);
\o /dev/null

select tests.create_user('ra-searcher@test.local') as a \gset
select tests.create_user('ra-holder-secret@test.local') as b \gset
select tests.create_user('ra-changer@test.local') as c \gset
select tests.create_user('ra-leaver@test.local') as d \gset
update auth.users set raw_app_meta_data = '{"provider": "google", "providers": ["google"]}' where id = :'b'::uuid;

select tests.mk_player('Βαγγέλης', 'Ξενοδοχάκης') as p1 \gset
select tests.mk_player('Βαγ', 'Τρικαλιώτης') as abbr \gset
select tests.mk_player('Ιωάννης', 'Μπλαβάκης') as formal \gset
select tests.mk_player('Ελένη', 'Ζαφειροπούλου', 'f') as fem \gset
select tests.mk_player('Πέτρος', 'Ψηλορείτης') as held \gset
select tests.mk_player('Νίκος', 'Ανηλικάκης') as minor \gset
update core.players set claimed_by_user_id = :'b'::uuid where id = :'held'::uuid;
update core.players set is_minor = true where id = :'minor'::uuid;
-- 25 people with one surname, and the one we look for
select tests.mk_player(n, 'Κοινοτόπουλος')
  from unnest(array['Άγγελος','Άρης','Αχιλλέας','Βασίλης','Γεράσιμος','Δημοσθένης','Ευθύμιος','Ζήσης','Ηρακλής',
                    'Θεόφιλος','Ιάσονας','Κλέαρχος','Λεωνίδας','Μιλτιάδης','Νεόφυτος','Ξενοφών','Ορέστης','Περικλής',
                    'Ραφαήλ','Σόλων','Τηλέμαχος','Υπατος','Φίλιππος','Χαρίλαος','Ωρίων']) n;
select tests.mk_player('Μάριος', 'Κοινοτόπουλος') as common \gset

select tests.login(:'a'::uuid);
\o

-- ── the search ──
select is((select id from api.find_matching_players('Βαγγέλης', 'Ξενοδοχάκης') limit 1), :'p1'::uuid,
          'search: exact spelling finds the player first');
select is((select id from api.find_matching_players('ΒΑΓΓΕΛΗΣ', 'ξενοδοχακης') limit 1), :'p1'::uuid,
          'search: capitals and no accents find the player');
select is((select id from api.find_matching_players('Vaggelis', 'Xenodochakis') limit 1), :'p1'::uuid,
          'search: Latin letters find the Greek name');
select is((select id from api.find_matching_players('Ξενοδοχάκης', 'Βαγγέλης') limit 1), :'p1'::uuid,
          'search: surname first, then first name, finds the player');
select is((select id from api.find_matching_players('Ξενοδοχάκης', '') limit 1), :'p1'::uuid,
          'search: one word in the box is a surname');
select is((select id from api.find_matching_players('Βαγγέλης', 'Τρικαλιώτης') limit 1), :'abbr'::uuid,
          'search: «Βαγγέλης» finds the sheet''s «Βαγ»');
select is((select id from api.find_matching_players('Γιάννης', 'Μπλαβάκης') limit 1), :'formal'::uuid,
          'search: «Γιάννης» finds «Ιωάννης»');
select is((select id from api.find_matching_players('Ελένη', 'Ζαφειρόπουλος') limit 1), :'fem'::uuid,
          'search: the -ος form finds the -ου surname');
select is((select id from api.find_matching_players('Μάριος', 'Κοινοτόπουλος') limit 1), :'common'::uuid,
          'search: among 26 with one surname, the first name puts the right one first');
select ok((select count(*) from api.find_matching_players('', 'Κοινοτόπουλος')) <= 20,
          'search: a surname alone lists 20 at most');
select is((select count(*)::int from api.find_matching_players('Γιώργος', 'Ξενοδοχάκης')), 0,
          'search: another first name on the same surname is not offered');
select is((select count(*)::int from api.find_matching_players('Νίκος', 'Ανηλικάκης')), 0,
          'search: a minor is never listed');

-- ── a player another account holds ──
select is((select claimed from api.find_matching_players('Πέτρος', 'Ψηλορείτης') where id = :'held'::uuid), true,
          'claimed: listed and marked for someone else');
select is(api.claimed_sign_in(:'held'::uuid), 'google', 'claimed: the hint is the provider');
select is(api.claimed_sign_in(:'p1'::uuid), null, 'claimed: no hint on a free player');
select ok(coalesce(api.claimed_sign_in(:'held'::uuid), '') !~ '@|ra-holder', 'claimed: never any part of the address');
select throws_ok(format('select api.claim_player(%L)', :'held'), '23505', null, 'claimed: a normal claim is refused');
select tests.logout();

select tests.login(:'b'::uuid);
select is((select claimed from api.find_matching_players('Πέτρος', 'Ψηλορείτης') where id = :'held'::uuid), false,
          'claimed: the holder sees their own player unmarked');
select is(api.claimed_sign_in(:'held'::uuid), null, 'claimed: no hint about your own account');
select tests.logout();

select tests.as_anon();
select throws_ok(format('select api.claimed_sign_in(%L)', :'held'), '42501', null, 'claimed: no hint without signing in');
select tests.logout();

-- ── minors ──
select tests.login(:'a'::uuid);
select throws_ok(format('select api.claim_player(%L)', :'minor'), 'P0002', null, 'minor: claim_player refuses a minor');

-- ── a second pick replaces the first ──
select is((api.claim_player(:'p1'::uuid)) ->> 'requested', 'true', 'pick: a roster player is a request');
select is((api.claim_player(:'formal'::uuid)) ->> 'requested', 'true', 'pick: another roster player is a new request');
select is((select array_agg(status order by created_at)::text from core.claim_requests where user_id = :'a'::uuid),
          '{cancelled,pending}', 'pick: the first request is cancelled');
select tests.logout();

-- ── «είμαι καινούριος» after a roster request ──
update core.profiles set first_name = 'Αλλαξοδρόμης', surname = 'Μετανιωμένος' where user_id = :'c'::uuid;
select tests.login(:'c'::uuid);
select api.claim_player(:'p1'::uuid);
select is(api.set_claim_status('creation_requested'), 'creation_requested', 'new after request: the latest choice wins');
select is((select status from core.claim_requests where user_id = :'c'::uuid and via = 'app'), 'cancelled',
          'new after request: the roster request is cancelled');
select is(api.set_claim_status('creation_requested'), 'creation_requested', 'new after request: a second tap is a replay');
select tests.logout();
select is((select p.first_name || ' ' || p.surname from core.claim_requests q join core.players p on p.id = q.player_id
            where q.user_id = :'c'::uuid and q.status = 'pending' and q.via = 'new'), 'Αλλαξοδρόμης Μετανιωμένος',
          'new after request: the new player waits for staff');

-- ── deleting an account ──
update core.profiles set first_name = 'Φευγάτος', surname = 'Διαγραφάκης' where user_id = :'d'::uuid;
select tests.login(:'d'::uuid);
select api.set_claim_status('creation_requested');
select (select player_id from core.claim_requests where user_id = :'d'::uuid and via = 'new') as newp \gset
select api.delete_my_account();
select tests.logout();
select is((select hidden from core.players where id = :'newp'::uuid), true, 'delete: the asked-for new player is hidden');

-- ── the roster count ──
select tests.mk_player('Γιάννη', 'Διπλότυπος') as dupshort \gset
select tests.mk_player('Γιάννης', 'Διπλότυπος') as duplong \gset
select tests.mk_player('Κ.', 'Τελειάκης') as dotted \gset
select tests.mk_player('Σταύρος', 'Δίδυμος') as twin1 \gset
select tests.mk_player('Σταύρος', 'Διδυμος') as twin2 \gset
select is(core.roster_countable((select p from core.players p where id = :'abbr'::uuid)), false, 'count: a 3-letter first name is out');
select is(core.roster_countable((select p from core.players p where id = :'dotted'::uuid)), false, 'count: a first name with a dot is out');
select is(core.roster_countable((select p from core.players p where id = :'dupshort'::uuid)), false, 'count: the shorter of two spellings is out');
select is(core.roster_countable((select p from core.players p where id = :'duplong'::uuid)), true, 'count: the longer spelling counts');
select is((select count(*)::int from core.players p where p.id in (:'twin1'::uuid, :'twin2'::uuid) and core.roster_countable(p)), 1,
          'count: the same name twice counts once');

select * from finish();
rollback;
