-- M4: Pro draw alerts. A Pro player's claimed profile in a new draw gets «Βγήκε η κλήρωση» with the first opponent,
-- once; free players do not; a first match already played says nothing.
begin;
select plan(7);

select tests.create_user('draw-pro@test.local') as pro \gset
select tests.create_user('draw-free@test.local') as free \gset
select tests.create_user('draw-late@test.local') as late \gset
select tests.mk_player('Πρω', 'Κληρωτός') as pp \gset
select tests.mk_player('Δωρ', 'Αντίπαλος') as fp \gset
select tests.mk_player('Αργ', 'Αργοπορημένος') as lp \gset
select tests.mk_player('Άλλος', 'Τέταρτος') as xp \gset
update core.players set claimed_by_user_id = :'pro'::uuid where id = :'pp'::uuid;
update core.players set claimed_by_user_id = :'free'::uuid where id = :'fp'::uuid;
update core.players set claimed_by_user_id = :'late'::uuid where id = :'lp'::uuid;
insert into core.entitlements (user_id, source, status) values (:'pro'::uuid, 'gift', 'active'), (:'late'::uuid, 'gift', 'active');
insert into core.push_tokens (token, user_id, platform) values ('ExponentPushToken[draw]', :'pro'::uuid, 'ios');
insert into core.tournaments (sport_id, name, source, starts_on) values ('tennis', 'Draw Open', 'import', current_date) returning id as t \gset

insert into core.tournament_draws (tournament_id, tab, discipline, format, size, draw) values (:'t'::uuid, 'M OPEN', 'MS', 'knockout', 4,
  jsonb_build_object(
    'entrants', jsonb_build_array(
      jsonb_build_object('pos', 1, 'raw', 'ΚΛΗΡΩΤΟΣ ΠΡΩ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΚΛΗΡΩΤΟΣ ΠΡΩ', 'player_id', :'pp'))),
      jsonb_build_object('pos', 2, 'raw', 'ΑΝΤΙΠΑΛΟΣ ΔΩΡ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΑΝΤΙΠΑΛΟΣ ΔΩΡ', 'player_id', :'fp'))),
      jsonb_build_object('pos', 3, 'raw', 'ΑΡΓΟΠΟΡΗΜΕΝΟΣ ΑΡΓ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΑΡΓΟΠΟΡΗΜΕΝΟΣ ΑΡΓ', 'player_id', :'lp'))),
      jsonb_build_object('pos', 4, 'raw', 'ΤΕΤΑΡΤΟΣ ΑΛΛΟΣ', 'bye', false, 'players', jsonb_build_array(jsonb_build_object('raw', 'ΤΕΤΑΡΤΟΣ ΑΛΛΟΣ', 'player_id', :'xp')))),
    'rounds', jsonb_build_array(jsonb_build_array(
      jsonb_build_object('round', 1, 'slot', 1, 'winner', null),
      jsonb_build_object('round', 1, 'slot', 2, 'winner', 1)))));

select is((select count(*)::int from core.notifications where user_id = :'pro'::uuid and type = 'draw'), 1, 'Pro: the draw is out');
select is((select payload ->> 'body' from core.notifications where user_id = :'pro'::uuid and type = 'draw'),
          'Draw Open · M OPEN: πρώτος γύρος με Αντίπαλος', 'the tournament, the category and the first opponent');
select is((select count(*)::int from core.notifications where user_id = :'free'::uuid and type = 'draw'), 0, 'free: nothing');
select is((select count(*)::int from core.notifications where user_id = :'late'::uuid and type = 'draw'), 0, 'first match already played: nothing');

update core.tournament_draws set draw = draw || '{"flags": []}'::jsonb where tournament_id = :'t'::uuid;
select is((select count(*)::int from core.notifications where user_id = :'pro'::uuid and type = 'draw'), 1, 'a later run: not again');

select core.take_push_batch(200) as b \gset
select is(jsonb_array_length(:'b'::jsonb), 1, 'one push');
select ok(jsonb_path_exists(:'b'::jsonb, '$[*] ? (@.data.type == "draw" && @.title == "Βγήκε η κλήρωση")'), 'typed, with its own title');

select * from finish();
rollback;
