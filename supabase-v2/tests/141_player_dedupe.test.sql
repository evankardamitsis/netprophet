-- One person, one roster row (20270307000000_player_dedupe): the name keys agree with packages/copy on the shared
-- vectors; imports link a sheet name to the player it means (same key, then this tournament's people, then a first name
-- that fits the only surname), never across genders and never to an account holder, a hidden player or a minor on
-- anything looser than the same key; merging leaves nothing behind, keeps the claim, the votes and the points, and
-- writes the audit trail; the duplicates desk lists sure and likely pairs and merges the sure ones in bulk.
\set ON_ERROR_STOP on
\set names `cat "${VECTORS_DIR:-packages/core/test-vectors}/name-keys.json"`

begin;

create temp table vec (doc jsonb not null);
insert into vec values (:'names'::jsonb);
grant select on vec to public;

select plan(
  (select count(*)::int from vec v, jsonb_array_elements(v.doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c)
  + 64);

-- ── the shared vectors ──
select is(core.name_key(c ->> 'input'), c ->> 'expected', 'nameKey: ' || (c ->> 'name'))
  from vec v, jsonb_array_elements(v.doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c
 where g ->> 'fn' = 'nameKey';
select is(core.same_named_person(c -> 'input' ->> 'sheet', c -> 'input' ->> 'surname', c -> 'input' ->> 'first',
                                 (c -> 'input' ->> 'anyFirst')::boolean),
          (c ->> 'expected')::boolean, 'sameNamedPerson: ' || (c ->> 'name'))
  from vec v, jsonb_array_elements(v.doc -> 'groups') g, jsonb_array_elements(g -> 'cases') c
 where g ->> 'fn' = 'sameNamedPerson';

-- ── a tournament and its people ──
insert into core.tournaments (sport_id, name, source, starts_on) values ('tennis', 'Dedupe Open', 'import', current_date) returning id as t \gset
insert into core.tournaments (sport_id, name, source, starts_on) values ('tennis', 'Other Cup', 'import', current_date) returning id as t2 \gset
select tests.create_user('dd-owner@test.local') as owner \gset
select tests.create_user('dd-fan@test.local') as fan \gset
select tests.create_user('dd-other@test.local') as other \gset
select tests.create_user('dd-staff@test.local', 'admin') as staff \gset
select tests.create_user('dd-two@test.local') as two \gset

select tests.mk_player('Χάρης', 'Καραγιανίδης') as har \gset
select tests.mk_player('Νίκος', 'Καραγιανίδης') as har_brother \gset
select tests.mk_player('Βασίλης', 'Μπριλάκης') as bril \gset
select tests.mk_player('Αντώνης', 'Μπαρούνας') as barou \gset
select tests.mk_player('Αντώνης', 'Γεωργίου') as geo \gset
select tests.mk_player('Πέτρος', 'Λάμπρου') as minor \gset
select tests.mk_player('Γιώργος', 'Παππάς') as pap_g \gset
select tests.mk_player('Γιάννης', 'Παππάς') as pap_y \gset
select tests.mk_player('Κωνσταντίνος', 'Κακκαβής') as kak \gset
select tests.mk_player('Άρης', 'Σεπερής') as seper \gset
select tests.mk_player('Δημήτρης', 'Ματζαβίνος') as matz \gset
select tests.mk_player('Οδυσσέας', 'Ζερβόπουλος') as zerv \gset
update core.players set is_minor = true where id = :'minor'::uuid;
update core.players set claimed_by_user_id = :'owner'::uuid where id = :'barou'::uuid;
update core.players set claimed_by_user_id = :'other'::uuid where id = :'seper'::uuid;

-- everyone but Ζερβόπουλος plays in Dedupe Open
select tests.mk_match(:'har'::uuid, :'bril'::uuid) as m1 \gset
select tests.mk_match(:'barou'::uuid, :'geo'::uuid) as m2 \gset
select tests.mk_match(:'minor'::uuid, :'pap_g'::uuid) as m3 \gset
select tests.mk_match(:'pap_y'::uuid, :'matz'::uuid) as m4 \gset
update core.matches set tournament_id = :'t'::uuid where id in (:'m1'::uuid, :'m2'::uuid, :'m3'::uuid, :'m4'::uuid);

select ok(:'har'::uuid = any (core.tournament_entrants(:'t'::uuid)) and not (:'zerv'::uuid = any (core.tournament_entrants(:'t'::uuid))),
          'a tournament''s people are its players');

create temp table r (k text primary key, v jsonb);
grant all on r to public;
insert into r values
  ('cut',       core.ingest_person('{"surname": "ΚΑΡΑΓΙΑΝΙΔΗΣ", "first": "ΧΑΡ", "raw": "ΚΑΡΑΓΙΑΝΙΔΗΣ ΧΑΡ"}', :'t'::uuid)),
  ('cut_out',   core.ingest_person('{"surname": "ΚΑΡΑΓΙΑΝΙΔΗΣ", "first": "ΧΑΡ", "raw": "ΚΑΡΑΓΙΑΝΙΔΗΣ ΧΑΡ"}', :'t2'::uuid)),
  ('double',    core.ingest_person('{"surname": "ΜΠΡΙΛΛΑΚΗΣ", "first": "ΒΑΣ", "raw": "ΜΠΡΙΛΛΑΚΗΣ ΒΑΣ"}', :'t'::uuid)),
  ('nt',        core.ingest_person('{"surname": "ΜΑΝΤΖΑΒΙΝΟΣ", "first": "ΔΗΜΗΤΡΙΟΣ", "raw": "ΜΑΝΤΖΑΒΙΝΟΣ ΔΗΜΗΤΡΙΟΣ"}', :'t'::uuid)),
  ('claimed',   core.ingest_person('{"surname": "ΜΠΑΡΟΥΝΑΣ", "first": "ΑΝΤΩΝΙΟΣ", "raw": "ΜΠΑΡΟΥΝΑΣ ΑΝΤΩΝΙΟΣ"}', :'t'::uuid)),
  ('claimed_k', core.ingest_person('{"surname": "ΣΕΠΕΡΗΣ", "first": "ΑΡΗΣ", "raw": "ΣΕΠΕΡΗΣ ΑΡΗΣ"}', null)),
  ('woman',     core.ingest_person('{"surname": "ΓΕΩΡΓΙΟΥ", "first": "ΑΝΤΩΝΙΑ", "raw": "ΓΕΩΡΓΙΟΥ ΑΝΤΩΝΙΑ"}', :'t'::uuid)),
  ('minor_cut', core.ingest_person('{"surname": "ΛΑΜΠΡΟΥ", "first": "ΠΕΤ", "raw": "ΛΑΜΠΡΟΥ ΠΕΤ"}', :'t'::uuid)),
  ('minor_key', core.ingest_person('{"surname": "ΛΑΜΠΡΟΥ", "first": "ΠΕΤΡΟΣ", "raw": "ΛΑΜΠΡΟΥ ΠΕΤΡΟΣ"}', :'t2'::uuid)),
  ('two',       core.ingest_person('{"surname": "ΠΑΠΑΣ", "first": "Γ", "raw": "ΠΑΠΑΣ Γ"}', :'t'::uuid)),
  ('only',      core.ingest_person('{"surname": "ΖΕΡΒΟΠΟΥΛΟΣ", "first": "ΟΔΥΣ", "raw": "ΖΕΡΒΟΠΟΥΛΟΣ ΟΔΥΣ"}', null)),
  ('only_no',   core.ingest_person('{"surname": "ΖΕΡΒΟΠΟΥΛΟΣ", "first": "ΝΙΚΟΣ", "raw": "ΖΕΡΒΟΠΟΥΛΟΣ ΝΙΚΟΣ"}', null));

select is((select v ->> 'player_id' from r where k = 'cut'), :'har', 'a cut first name in the tournament is its player, the brother not');
select is((select v ->> 'rule' from r where k = 'cut'), 'name_in_tournament', '... by the tournament rule');
select ok((select coalesce(v ->> 'player_id', '') <> :'har' from r where k = 'cut_out'),
          'outside that tournament two Καραγιανίδης stay apart: no guess');
select is((select v ->> 'player_id' from r where k = 'double'), :'bril', 'a doubled letter and a cut name');
select is((select v ->> 'player_id' from r where k = 'nt'), :'matz', 'ΝΤ for Τ and the formal first name');
select is((select v ->> 'how' from r where k = 'claimed'), 'review', 'an account holder on a looser key goes to staff');
select is((select v ->> 'player_id' from r where k = 'claimed_k'), :'seper', 'an account holder on the same key links');
select ok((select coalesce(v ->> 'player_id', '') <> :'geo' from r where k = 'woman'), 'never across genders (Αντωνία is not Αντώνης)');
select is((select v ->> 'how' from r where k = 'minor_cut'), 'review', 'a minor on a looser key goes to staff');
select is((select v ->> 'player_id' from r where k = 'minor_key'), :'minor', 'a minor on the same key is that minor, not a new row');
select is((select v ->> 'how' from r where k = 'two'), 'review', 'an initial two players fit is for staff');
select is((select v ->> 'rule' from r where k = 'only'), 'only_surname', 'a first name that fits the only player with the surname');
select is((select v ->> 'player_id' from r where k = 'only'), :'zerv', '... is that player');
select ok((select coalesce(v ->> 'player_id', '') <> :'zerv' from r where k = 'only_no'), 'a first name that does not fit is not him');

-- the same name twice in the roster: the one in this tournament, else staff
select tests.mk_player('Πέτρος', 'Λάμπρου') as minor_twin \gset
select is((core.ingest_person('{"surname": "ΛΑΜΠΡΟΥ", "first": "ΠΕΤΡΟΣ", "raw": "ΛΑΜΠΡΟΥ ΠΕΤΡΟΣ"}', :'t'::uuid)) ->> 'player_id', :'minor',
          'the same key twice: the one in this tournament');
select is((core.ingest_person('{"surname": "ΛΑΜΠΡΟΥ", "first": "ΠΕΤΡΟΣ", "raw": "ΛΑΜΠΡΟΥ ΠΕΤΡΟΣ"}', :'t2'::uuid)) ->> 'how', 'review',
          'the same key twice and neither in the tournament: staff');

-- draws: look-alikes folded, the discipline's gender on a new player
select core.ingest_draws(:'t2'::uuid, jsonb_build_array(
  jsonb_build_object('tab', 'MS', 'discipline', 'MS', 'format', 'knockout', 'size', 2,
                     'entrants', jsonb_build_array(
                       jsonb_build_object('pos', 1, 'people', jsonb_build_array(jsonb_build_object('surname', 'KAKKABHΣ', 'first', 'ΚΩΝΣΤΑΝΤΙΝΟΣ'))),
                       jsonb_build_object('pos', 2, 'people', jsonb_build_array(jsonb_build_object('surname', 'ΧΑΤΖΗΣΤΕΦΑΝΟΥ', 'first', 'ΙΩΑΝΝΗΣ'))))),
  jsonb_build_object('tab', 'WS', 'discipline', 'WS', 'format', 'knockout', 'size', 2,
                     'entrants', jsonb_build_array(
                       jsonb_build_object('pos', 1, 'people', jsonb_build_array(jsonb_build_object('surname', 'ΜΑΡΑΓΚΟΥ', 'first', 'ΕΛ'))))))) is not null as x \gset
select ok((select draw::text like '%' || :'kak' || '%' from core.tournament_draws where tournament_id = :'t2'::uuid and tab = 'MS'),
          'a draw name in Latin look-alikes links to the roster player');
select is((select gender from core.players where surname = 'ΜΑΡΑΓΚΟΥ'), 'f', 'a new player from a women''s draw is a woman');
select is((select gender from core.players where surname = 'ΧΑΤΖΗΣΤΕΦΑΝΟΥ'), 'm', 'a new player from a men''s draw is a man');
-- the schedule meets the draw's new player under a cut name: the same row, not another
select is((core.ingest_person('{"surname": "ΧΑΤΖΗΣΤΕΦΑΝΟΥ", "first": "ΙΩΑΝ", "raw": "ΧΑΤΖΗΣΤΕΦΑΝΟΥ ΙΩΑΝ"}', :'t2'::uuid)) ->> 'player_id',
          (select id::text from core.players where surname = 'ΧΑΤΖΗΣΤΕΦΑΝΟΥ'), 'the schedule finds the draw''s player');
select is((select count(*)::int from core.players where surname = 'ΧΑΤΖΗΣΤΕΦΑΝΟΥ'), 1, 'one row for him');
-- the draw again: the same links, no new rows
select core.ingest_draws(:'t2'::uuid, jsonb_build_array(
  jsonb_build_object('tab', 'MS', 'discipline', 'MS', 'format', 'knockout', 'size', 2,
                     'entrants', jsonb_build_array(
                       jsonb_build_object('pos', 1, 'people', jsonb_build_array(jsonb_build_object('surname', 'ΚΑΚΚΑΒΗΣ', 'first', 'ΚΩΝ'))),
                       jsonb_build_object('pos', 2, 'people', jsonb_build_array(jsonb_build_object('surname', 'ΧΑΤΖΗΣΤΕΦΑΝΟΥ', 'first', 'ΙΩ'))))),
  jsonb_build_object('tab', 'WS', 'discipline', 'WS', 'format', 'knockout', 'size', 2,
                     'entrants', jsonb_build_array(
                       jsonb_build_object('pos', 1, 'people', jsonb_build_array(jsonb_build_object('surname', 'ΜΑΡΑΓΚΟΥ', 'first', 'ΕΛ'))))))) is not null as x \gset
select is((select count(*)::int from core.players where surname in ('ΧΑΤΖΗΣΤΕΦΑΝΟΥ', 'ΜΑΡΑΓΚΟΥ') or surname = 'Κακκαβής'), 3,
          'a second draw run under other spellings makes no new rows');

-- «+ Ματς»: a typed opponent with a roster player's exact name is that player; a new name waits as before
select is(core.log_person('{"new": {"first": "Χάρης", "surname": "ΚΑΡΑΓΙΑΝΙΔΗΣ"}}'), :'har'::uuid, 'a typed opponent with the same name is the roster player');
select core.log_person('{"new": {"first": "Ιάσονας", "surname": "Νεοφύτου"}}') as newp \gset
select is((select status from core.players where id = :'newp'::uuid), 'pending',
          'a new name is a pending player');
select isnt(core.log_person('{"new": {"first": "Πέτρος", "surname": "Λάμπρου"}}'), :'minor'::uuid, 'a typed name never links to a minor');

-- ── merging ──
-- the shell the old draw import left («ΣΕΡΡΑΣ Γ», nobody's) and the account holder's row
select tests.mk_player('Γιώργος', 'Σέρρας') as keep \gset
select tests.mk_player('Γ', 'ΣΕΡΡΑΣ') as shell \gset
select tests.mk_player('Ορέστης', 'Φίλος') as opp \gset
-- the owner's claim moves from Μπαρούνας to their own row
update core.players set claimed_by_user_id = null where id = :'barou'::uuid;
update core.players set claimed_by_user_id = :'owner'::uuid where id = :'keep'::uuid;
update core.players set is_minor = false, birth_year = null, gender = null where id = :'keep'::uuid;
update core.players set birth_year = 1990, area_id = (select id from core.areas order by sort limit 1) where id = :'shell'::uuid;
select tests.mk_match(:'shell'::uuid, :'opp'::uuid, now() - interval '2 hours') as sm \gset
update core.matches set tournament_id = :'t2'::uuid where id = :'sm'::uuid;
insert into core.votes (user_id, subject_type, subject_id, option, created_at, day_key)
values (:'fan'::uuid, 'match', :'sm'::uuid, 1, now() - interval '3 hours', core.athens_day());
select tests.finish_match(:'sm'::uuid, 1) is not null as x \gset
insert into core.follows (user_id, player_id, relation) values (:'fan'::uuid, :'shell'::uuid, 'known');
insert into core.claim_requests (user_id, player_id, via, status) values (:'fan'::uuid, :'shell'::uuid, 'app', 'rejected');
update core.tournament_draws set draw = jsonb_set(draw, '{entrants,0,players,0,player_id}', to_jsonb(:'shell'::text))
 where tournament_id = :'t2'::uuid and tab = 'MS';
select count(*)::int as votes_before from core.votes where subject_id = :'sm'::uuid \gset
select coalesce(sum(delta), 0)::int as pts_before from core.points_ledger where user_id = :'fan'::uuid \gset

-- staff only
select tests.login(:'fan'::uuid);
select throws_ok($$select api.admin_duplicates('sure', 25, 0)$$, '42501', 'forbidden', 'the duplicates list is for staff');
select throws_ok($$select api.admin_merge_duplicates('[]'::jsonb, 'likely')$$, '42501', 'forbidden', 'merging is for staff');
select tests.logout();

select tests.login(:'staff'::uuid);
-- staff ask to keep the shell: the account holder's row stays all the same
select api.admin_merge_duplicates(jsonb_build_array(jsonb_build_object('keep', :'shell', 'drop', :'keep')), 'likely') as res \gset
select is((:'res'::jsonb ->> 'merged')::int, 1, 'one pair merged');
select tests.logout();

select is((select merged_into from core.players where id = :'shell'::uuid), :'keep'::uuid, 'the account holder''s row stayed');
select is((select status from core.players where id = :'shell'::uuid), 'merged', 'the shell is merged');
select is((select count(*)::int from core.match_participants where player_id = :'shell'::uuid), 0, 'no match left on the shell');
select is((select count(*)::int from core.match_participants where player_id = :'keep'::uuid and match_id = :'sm'::uuid), 1, 'the match is the survivor''s');
select is((select count(*)::int from core.follows where player_id = :'shell'::uuid), 0, 'no follow left on the shell');
select is((select count(*)::int from core.claim_requests where player_id = :'shell'::uuid), 0, 'no claim request left on the shell');
select ok((select bool_and(draw::text not like '%' || :'shell' || '%') from core.tournament_draws), 'no draw names the shell');
select ok((select draw::text like '%' || :'keep' || '%' from core.tournament_draws where tournament_id = :'t2'::uuid and tab = 'MS'), 'the draw names the survivor');
select is((select claimed_by_user_id from core.players where id = :'keep'::uuid), :'owner'::uuid, 'the claim is kept');
select is((select claimed_player_id from core.profiles where user_id = :'owner'::uuid), :'keep'::uuid, 'the profile still points at the survivor');
select is((select count(*)::int from core.votes where subject_id = :'sm'::uuid), :'votes_before'::int, 'votes intact');
select is((select coalesce(sum(delta), 0)::int from core.points_ledger where user_id = :'fan'::uuid), :'pts_before'::int, 'points intact');
select is((select birth_year from core.players where id = :'keep'::uuid), 1990, 'the birth year came over');
select is((select first_name from core.players where id = :'keep'::uuid), 'Γιώργος', 'an account holder''s first name is never touched');
select is((select how from core.player_merges where src_id = :'shell'::uuid), 'duplicates', 'the audit trail says how');
select is((select src ->> 'surname' from core.player_merges where src_id = :'shell'::uuid), 'ΣΕΡΡΑΣ', 'and keeps the merged row as it was');
select is((select (moved ->> 'matches')::int from core.player_merges where src_id = :'shell'::uuid), 1, 'and what moved');
select is((select player_id from core.player_aliases where alias_norm = core.normalize_search('ΣΕΡΡΑΣ Γ')), :'keep'::uuid,
          'the sheet''s spelling now finds the survivor');

-- a minor merged into an adult row keeps the survivor a minor; a cut first name is filled in
select tests.mk_player('Ελ', 'Λυμπέρη', 'f') as cut_row \gset
select tests.mk_player('Ελένη', 'Λυμπέρη', 'f') as full_row \gset
update core.players set is_minor = true where id = :'full_row'::uuid;
select core.merge_player(:'full_row'::uuid, :'cut_row'::uuid, :'staff'::uuid) as x \gset
select ok((select is_minor from core.players where id = :'cut_row'::uuid), 'a minor stays a minor after a merge');
select is((select first_name from core.players where id = :'cut_row'::uuid), 'Ελένη', 'the cut first name is filled in');
select is((select how from core.player_merges where src_id = :'full_row'::uuid), 'manual', 'the old merge paths write the audit trail too');

-- one refusal does not stop the batch
select tests.mk_player('Τάσος', 'Ίδιος') as same_a \gset
select tests.mk_player('Τάσος', 'Ιδιος') as same_b \gset
select tests.mk_match(:'same_a'::uuid, :'same_b'::uuid) is not null as x \gset
select tests.mk_player('Λευτέρης', 'Ξενάκης') as xa \gset
select tests.mk_player('ΛΕΥΤΕΡΗΣ', 'ΞΕΝΑΚΗΣ') as xb \gset
select tests.login(:'staff'::uuid);
select api.admin_merge_duplicates(jsonb_build_array(jsonb_build_object('keep', :'same_a', 'drop', :'same_b'),
                                                    jsonb_build_object('keep', :'xa', 'drop', :'xb')), 'likely') as res2 \gset
select tests.logout();
select is((:'res2'::jsonb ->> 'merged')::int, 1, 'the good pair merged');
select ok((:'res2'::jsonb -> 'skipped' -> 0 ->> 'reason') like 'same_match%', 'the pair in one match is skipped, with the reason');

-- ── the duplicates list ──
-- sure: the same name, one row empty; likely: a cut name in the same tournament with matches on both
select tests.mk_player('Μάριος', 'Ρούσσος') as rou_a \gset
select tests.mk_player('ΜΑΡΙΟΣ', 'POYΣΣΟΣ') as rou_b \gset
select tests.mk_player('Ιωάννης', 'Τσακίρης') as tsa_a \gset
select tests.mk_player('ΙΩΑΝ', 'ΤΣΑΚΙΡΗΣ') as tsa_b \gset
select tests.mk_player('Νίκη', 'Ντόκου', 'f') as both_a \gset
select tests.mk_player('Νίκη', 'Ντόκου', 'f') as both_b \gset
select tests.mk_player('Στέλιος', 'Βλάχος') as vl_a \gset
select tests.mk_player('Στέλιος', 'Βλάχος') as vl_b \gset
select tests.mk_match(:'rou_a'::uuid, :'opp'::uuid) is not null as x \gset
select tests.mk_match(:'tsa_a'::uuid, :'opp'::uuid) as tm1 \gset
select tests.mk_match(:'tsa_b'::uuid, :'har'::uuid) as tm2 \gset
update core.matches set tournament_id = :'t'::uuid where id in (:'tm1'::uuid, :'tm2'::uuid);
update core.players set claimed_by_user_id = :'fan'::uuid where id = :'both_a'::uuid;
update core.players set claimed_by_user_id = :'two'::uuid where id = :'both_b'::uuid;
select tests.login(:'staff'::uuid);
select api.admin_dismiss_duplicate(:'vl_b'::uuid, :'vl_a'::uuid) is not null as x \gset
select tests.logout();

-- an empty row a draw left, and the one player of that tournament its cut name fits: sure
select tests.mk_player('Ανδρέας', 'Κουρής') as kou \gset
select tests.mk_player('ΑΝΔΡ', 'ΚΟΥΡΗΣ') as kou_shell \gset
select tests.mk_match(:'kou'::uuid, :'opp'::uuid) as km \gset
update core.matches set tournament_id = :'t'::uuid where id = :'km'::uuid;
insert into core.tournament_draws (tournament_id, tab, discipline, format, size, draw)
values (:'t'::uuid, 'MS-B', 'MS', 'knockout', 2,
        jsonb_build_object('entrants', jsonb_build_array(jsonb_build_object('pos', 1, 'players',
          jsonb_build_array(jsonb_build_object('raw', 'ΚΟΥΡΗΣ ΑΝΔΡ', 'player_id', :'kou_shell')))), 'rounds', '[]'::jsonb));

create temp table dc as select * from core.duplicate_candidates();
grant select on dc to public;
select is((select confidence from dc where (a, b) = (least(:'rou_a'::uuid, :'rou_b'::uuid), greatest(:'rou_a'::uuid, :'rou_b'::uuid))), 'sure',
          'the same name in look-alikes with an empty row is sure');
select is((select keep_id from dc where :'rou_b'::uuid in (a, b)), :'rou_a'::uuid, 'the row with the match stays');
select is((select confidence from dc where (a, b) = (least(:'tsa_a'::uuid, :'tsa_b'::uuid), greatest(:'tsa_a'::uuid, :'tsa_b'::uuid))), 'likely',
          'a cut name in the same tournament, matches on both: likely');
select ok((select evidence -> 'shared_tournaments' ? 'Dedupe Open' from dc where :'tsa_b'::uuid in (a, b)), 'the evidence names the tournament');
select is((select confidence || ' ' || (keep_id = :'kou'::uuid)::text from dc where :'kou_shell'::uuid in (a, b)), 'sure true',
          'an empty draw row with the one player its cut name fits in that tournament is sure');
select is((select count(*)::int from dc where :'both_a'::uuid in (a, b)), 0, 'two account holders are never a pair');
select is((select count(*)::int from dc where :'vl_a'::uuid in (a, b)), 0, '«not the same person» stays dismissed');
select is((select count(*)::int from dc where :'pap_g'::uuid in (a, b) and :'pap_y'::uuid in (a, b)), 0, 'Γιώργος and Γιάννης are not a pair');

-- the sure ones in bulk; a likely pair sent as sure is refused
select tests.login(:'staff'::uuid);
select api.admin_merge_duplicates(api.admin_duplicate_pairs('sure') || jsonb_build_array(jsonb_build_object('keep', :'tsa_a', 'drop', :'tsa_b')),
                                  'sure') as res3 \gset
select api.admin_duplicates('sure', 25, 0) as after \gset
select tests.logout();
select is((select status from core.players where id = :'rou_b'::uuid), 'merged', 'bulk: the sure pair is merged');
select is((select status from core.players where id = :'tsa_b'::uuid), 'active', 'bulk: a likely pair sent as sure is left alone');
select ok((:'res3'::jsonb -> 'skipped') @> '[{"reason": "not_sure_now"}]', '... and says why');
select is((:'after'::jsonb -> 'counts' ->> 'sure')::int, 0, 'nothing sure is left');

select * from finish();
rollback;
