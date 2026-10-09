-- NetProphet v2 dev seed. Reference data (tennis, areas, quests, badges...) comes from the migrations.
-- This file adds: 20 Greek-named players, 2 tournaments, 10 matches (4 finished, 6 upcoming), 3 test users.
-- Safe to run more than once. Test users have no password: sign in with email OTP in local Supabase.

-- ---------------------------------------------------------------------------
-- Players (fixed ids so docs and tests can refer to them)
-- ---------------------------------------------------------------------------
insert into core.players (id, first_name, surname, gender, birth_year, area_id, slug, source) values
('10000000-0000-0000-0000-000000000001', 'Γιώργος',    'Παπαδόπουλος',    'm', 1984, 'glyfada',       'giorgos-papadopoulos', 'admin'),
('10000000-0000-0000-0000-000000000002', 'Νίκος',      'Αντωνίου',        'm', 1990, 'glyfada',       'nikos-antoniou', 'admin'),
('10000000-0000-0000-0000-000000000003', 'Δημήτρης',   'Κωνσταντίνου',    'm', 1979, 'voula',         'dimitris-konstantinou', 'admin'),
('10000000-0000-0000-0000-000000000004', 'Κώστας',     'Γεωργίου',        'm', 1988, 'glyfada',       'kostas-georgiou', 'admin'),
('10000000-0000-0000-0000-000000000005', 'Μιχάλης',    'Βλάχος',          'm', 1992, 'kifisia',       'michalis-vlahos', 'admin'),
('10000000-0000-0000-0000-000000000006', 'Αλέξανδρος', 'Ξενάκης',         'm', 1981, 'kifisia',       'alexandros-xenakis', 'admin'),
('10000000-0000-0000-0000-000000000007', 'Θοδωρής',    'Χρηστίδης',       'm', 1986, 'marousi',       'thodoris-christidis', 'admin'),
('10000000-0000-0000-0000-000000000008', 'Στέλιος',    'Μακρής',          'm', 1975, 'halandri',      'stelios-makris', 'admin'),
('10000000-0000-0000-0000-000000000009', 'Βαγγέλης',   'Καρράς',          'm', 1995, 'pagrati',       'vaggelis-karras', 'admin'),
('10000000-0000-0000-0000-000000000010', 'Πέτρος',     'Ψαρράς',          'm', 1983, 'athens',        'petros-psarras', 'admin'),
('10000000-0000-0000-0000-000000000011', 'Μαρία',      'Παπαγεωργίου',    'f', 1991, 'glyfada',       'maria-papageorgiou', 'admin'),
('10000000-0000-0000-0000-000000000012', 'Ελένη',      'Δημητρίου',       'f', 1987, 'voula',         'eleni-dimitriou', 'admin'),
('10000000-0000-0000-0000-000000000013', 'Κατερίνα',   'Σταματίου',       'f', 1993, 'kifisia',       'katerina-stamatiou', 'admin'),
('10000000-0000-0000-0000-000000000014', 'Σοφία',      'Αναστασίου',      'f', 1989, 'marousi',       'sofia-anastasiou', 'admin'),
('10000000-0000-0000-0000-000000000015', 'Αθανασία',   'Χατζή',           'f', 1985, 'psychiko',      'athanasia-chatzi', 'admin'),
('10000000-0000-0000-0000-000000000016', 'Ιωάννα',     'Μπακάλη',         'f', 1994, 'palaio_faliro', 'ioanna-bakali', 'admin'),
('10000000-0000-0000-0000-000000000017', 'Άννα',       'Τζαννετάκη',      'f', 1982, 'pagrati',       'anna-tzannetaki', 'admin'),
('10000000-0000-0000-0000-000000000018', 'Χρήστος',    'Ευθυμίου',        'm', 1978, 'halandri',      'christos-efthymiou', 'admin'),
('10000000-0000-0000-0000-000000000019', 'Παναγιώτης', 'Ζαχαρίου',        'm', 1990, 'palaio_faliro', 'panagiotis-zachariou', 'admin'),
('10000000-0000-0000-0000-000000000020', 'Γιάννης',    'Θεοδωρόπουλος',   'm', 1986, 'athens',        'giannis-theodoropoulos', 'admin')
on conflict (id) do nothing;

insert into core.player_sports (player_id, sport_id, hand, initial_level, level_value, level_tier, level_direction, level_status, record, form)
select p.id, 'tennis',
       case when n % 5 = 0 then 'L' else 'R' end,
       3.0 + (n % 5) * 0.5,
       3.0 + (n % 5) * 0.5,
       3 + (n % 5),
       (array['up', 'same', 'down'])[1 + n % 3],
       'active',
       jsonb_build_object('singles', jsonb_build_object('w', 8 + n, 'l', 4 + n % 4), 'doubles', jsonb_build_object('w', n % 6, 'l', n % 3)),
       '["W","W","L","W","L"]'::jsonb
  from (select id, row_number() over (order by id)::int as n from core.players where id::text like '10000000-%') p
on conflict (player_id, sport_id) do nothing;

-- ---------------------------------------------------------------------------
-- Tournaments
-- ---------------------------------------------------------------------------
insert into core.tournaments (id, sport_id, name, area_id, venue, level_min, level_max, entry_deadline, starts_on, ends_on, draw_state, active, source, external_ref) values
('20000000-0000-0000-0000-000000000001', 'tennis', 'Open Γλυφάδας',      'glyfada',  'Ομίλος Αντισφαίρισης Γλυφάδας', 3.0, 5.0, current_date - 10, current_date - 4, current_date + 6, 'drawn', true, 'admin', 'seed-open-glyfadas'),
('20000000-0000-0000-0000-000000000002', 'tennis', 'Κύπελλο Κηφισιάς',  'kifisia',  'Αθλητικό Κέντρο Κηφισιάς',     3.0, 6.0, current_date + 5,  current_date + 12, current_date + 14, 'open', true, 'admin', 'seed-kupello-kifisias')
on conflict (id) do nothing;

insert into core.tournament_events (id, tournament_id, name, format, gender, level_min, level_max) values
('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Μονά Ανδρών', 'singles', 'm', 3.0, 5.0),
('21000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Μονά Γυναικών', 'singles', 'f', 3.0, 5.0),
('21000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Διπλά Ανδρών', 'doubles', 'm', 3.0, 6.0)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Matches: 4 finished (with results), 6 upcoming
-- ---------------------------------------------------------------------------
insert into core.matches (id, sport_id, format, status, starts_at, venue, area_id, tournament_id, event_id, round, source, source_ref, counts_for_levels) values
('30000000-0000-0000-0000-000000000001', 'tennis', 'singles', 'confirmed', now() - interval '3 days',  'Γλυφάδα',  'glyfada', '20000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'Προημιτελικός', 'admin', 'seed-m1', true),
('30000000-0000-0000-0000-000000000002', 'tennis', 'singles', 'confirmed', now() - interval '3 days',  'Γλυφάδα',  'glyfada', '20000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'Προημιτελικός', 'admin', 'seed-m2', true),
('30000000-0000-0000-0000-000000000003', 'tennis', 'singles', 'confirmed', now() - interval '2 days',  'Γλυφάδα',  'glyfada', '20000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000002', 'Ημιτελικός', 'admin', 'seed-m3', true),
('30000000-0000-0000-0000-000000000004', 'tennis', 'doubles', 'confirmed', now() - interval '1 day',   'Κηφισιά',  'kifisia', null, null, null, 'admin', 'seed-m4', true),
('30000000-0000-0000-0000-000000000005', 'tennis', 'singles', 'scheduled', now() + interval '1 day',   'Γλυφάδα',  'glyfada', '20000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'Ημιτελικός', 'admin', 'seed-m5', false),
('30000000-0000-0000-0000-000000000006', 'tennis', 'singles', 'scheduled', now() + interval '1 day 3 hours', 'Παγκράτι', 'pagrati', null, null, null, 'admin', 'seed-m6', false),
('30000000-0000-0000-0000-000000000007', 'tennis', 'singles', 'scheduled', now() + interval '2 days',  'Κηφισιά',  'kifisia', null, null, 'Φιλικό', 'admin', 'seed-m7', false),
('30000000-0000-0000-0000-000000000008', 'tennis', 'mixed',   'scheduled', now() + interval '2 days 2 hours', 'Κηφισιά', 'kifisia', null, null, 'Φιλικό', 'admin', 'seed-m8', false),
('30000000-0000-0000-0000-000000000009', 'tennis', 'singles', 'announced', now() + interval '3 days',  'Αθήνα',    'athens',  null, null, null, 'admin', 'seed-m9', false),
('30000000-0000-0000-0000-000000000010', 'tennis', 'singles', 'scheduled', now() + interval '4 days',  'Παλαιό Φάληρο', 'palaio_faliro', null, null, 'Φιλικό', 'admin', 'seed-m10', false)
on conflict (id) do nothing;

insert into core.match_participants (match_id, side, player_id, position) values
('30000000-0000-0000-0000-000000000001', 1, '10000000-0000-0000-0000-000000000001', 1),
('30000000-0000-0000-0000-000000000001', 2, '10000000-0000-0000-0000-000000000002', 1),
('30000000-0000-0000-0000-000000000002', 1, '10000000-0000-0000-0000-000000000003', 1),
('30000000-0000-0000-0000-000000000002', 2, '10000000-0000-0000-0000-000000000004', 1),
('30000000-0000-0000-0000-000000000003', 1, '10000000-0000-0000-0000-000000000011', 1),
('30000000-0000-0000-0000-000000000003', 2, '10000000-0000-0000-0000-000000000012', 1),
('30000000-0000-0000-0000-000000000004', 1, '10000000-0000-0000-0000-000000000005', 1),
('30000000-0000-0000-0000-000000000004', 1, '10000000-0000-0000-0000-000000000006', 2),
('30000000-0000-0000-0000-000000000004', 2, '10000000-0000-0000-0000-000000000007', 1),
('30000000-0000-0000-0000-000000000004', 2, '10000000-0000-0000-0000-000000000008', 2),
('30000000-0000-0000-0000-000000000005', 1, '10000000-0000-0000-0000-000000000001', 1),
('30000000-0000-0000-0000-000000000005', 2, '10000000-0000-0000-0000-000000000004', 1),
('30000000-0000-0000-0000-000000000006', 1, '10000000-0000-0000-0000-000000000009', 1),
('30000000-0000-0000-0000-000000000006', 2, '10000000-0000-0000-0000-000000000010', 1),
('30000000-0000-0000-0000-000000000007', 1, '10000000-0000-0000-0000-000000000013', 1),
('30000000-0000-0000-0000-000000000007', 2, '10000000-0000-0000-0000-000000000014', 1),
('30000000-0000-0000-0000-000000000008', 1, '10000000-0000-0000-0000-000000000006', 1),
('30000000-0000-0000-0000-000000000008', 1, '10000000-0000-0000-0000-000000000015', 2),
('30000000-0000-0000-0000-000000000008', 2, '10000000-0000-0000-0000-000000000007', 1),
('30000000-0000-0000-0000-000000000008', 2, '10000000-0000-0000-0000-000000000016', 2),
('30000000-0000-0000-0000-000000000009', 1, '10000000-0000-0000-0000-000000000019', 1),
('30000000-0000-0000-0000-000000000009', 2, '10000000-0000-0000-0000-000000000020', 1),
('30000000-0000-0000-0000-000000000010', 1, '10000000-0000-0000-0000-000000000015', 1),
('30000000-0000-0000-0000-000000000010', 2, '10000000-0000-0000-0000-000000000017', 1)
on conflict do nothing;

-- results for the finished matches (sets are winner-first; the coherence trigger validates them)
insert into core.match_results (match_id, winner_side, sets) values
('30000000-0000-0000-0000-000000000001', 1, '[{"w":6,"l":4},{"w":6,"l":3}]'),
('30000000-0000-0000-0000-000000000002', 2, '[{"w":6,"l":7},{"w":6,"l":4},{"w":6,"l":2}]'),
('30000000-0000-0000-0000-000000000003', 2, '[{"w":6,"l":2},{"w":6,"l":4}]'),
('30000000-0000-0000-0000-000000000004', 2, '[{"w":6,"l":3},{"w":3,"l":6},{"w":10,"l":7,"stb":true}]')
on conflict (match_id) do nothing;

insert into core.sponsored_cards (id, sponsor, category, title, subtitle, placement, status)
values ('40000000-0000-0000-0000-000000000001', 'Ρακέτες Αθηνών', 'sports-retail', 'Νέες ρακέτες στο κέντρο', 'Δοκίμασε πριν αγοράσεις', 'feed', 'active')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Test users (the on_auth_user_created trigger creates profile + game state)
--   Evan  (admin)  evan@netprophet.test
--   Maria (user)   maria@netprophet.test   claims Μαρία Παπαγεωργίου; follows Κατερίνα, Σοφία
--   Nikos (user)   nikos@netprophet.test   claims Νίκος Αντωνίου; follows Γιώργος, Κώστας
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
('a0000000-0000-0000-0000-000000000001', 'evan@netprophet.test',  '{"full_name": "Evan Admin"}'),
('a0000000-0000-0000-0000-000000000002', 'maria@netprophet.test', '{"full_name": "Μαρία Παπαγεωργίου"}'),
('a0000000-0000-0000-0000-000000000003', 'nikos@netprophet.test', '{"full_name": "Νίκος Αντωνίου"}')
on conflict (id) do nothing;

update core.profiles set role = 'admin' where user_id = 'a0000000-0000-0000-0000-000000000001';
update core.profiles set gender = 'f', area_id = 'glyfada', hand = 'R' where user_id = 'a0000000-0000-0000-0000-000000000002';
update core.profiles set gender = 'm', area_id = 'glyfada', hand = 'R' where user_id = 'a0000000-0000-0000-0000-000000000003';

update core.players set claimed_by_user_id = 'a0000000-0000-0000-0000-000000000002'
 where id = '10000000-0000-0000-0000-000000000011' and claimed_by_user_id is null;
update core.players set claimed_by_user_id = 'a0000000-0000-0000-0000-000000000003'
 where id = '10000000-0000-0000-0000-000000000002' and claimed_by_user_id is null;

insert into core.follows (user_id, player_id, relation, source) values
('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000013', 'friend', 'onboarding'),
('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000014', 'known',  'onboarding'),
('a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'friend', 'onboarding'),
('a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', 'known',  'onboarding')
on conflict do nothing;

-- Votes on the finished matches that are NOT resolved yet: try  select api.resolve_match('3000...0001');
-- (as service role / admin). Maria and Nikos did not play these matches.
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key) values
('a0000000-0000-0000-0000-000000000002', 'match', '30000000-0000-0000-0000-000000000001', 1, now() - interval '4 days', core.athens_day(now() - interval '4 days')),
('a0000000-0000-0000-0000-000000000003', 'match', '30000000-0000-0000-0000-000000000001', 2, now() - interval '4 days', core.athens_day(now() - interval '4 days')),
('a0000000-0000-0000-0000-000000000002', 'match', '30000000-0000-0000-0000-000000000002', 2, now() - interval '4 days', core.athens_day(now() - interval '4 days'))
on conflict do nothing;
update core.user_game_state set votes_cast = 2 where user_id = 'a0000000-0000-0000-0000-000000000002' and votes_cast = 0;
update core.user_game_state set votes_cast = 1 where user_id = 'a0000000-0000-0000-0000-000000000003' and votes_cast = 0;
