-- M4 part 3a: draws. A sheet's brackets are stored per category; a sure name links, an unknown one becomes a new
-- player (founder, 13 Oct); a dry read writes nothing but its log; a tab gone from the sheet is removed.
begin;
select plan(11);

select tests.create_user('dr-adm@test.local', 'admin') as adm \gset
select tests.mk_player('Γιάννης', 'Πρωτονοτάριος') as p1 \gset

select tests.login(:'adm'::uuid);
select api.admin_save_tournament('{"name": "Draw Open", "draw_url": "https://docs.google.com/spreadsheets/d/d", "ongoing": true}') as t \gset
create temp table d_ as select $j$[
 {"tab": "Μ 40+", "title": "Μ 40+ MAIN DRAW (2)", "discipline": "MS", "level": "40+", "format": "knockout", "size": 2,
  "entrants": [{"pos": 1, "raw": "ΠΡΩΤΟΝΟΤΑΡΙΟΣ ΓΙΑΝΝΗΣ", "seed": 1, "bye": false, "people": [{"surname": "ΠΡΩΤΟΝΟΤΑΡΙΟΣ", "first": "ΓΙΑΝΝΗΣ"}]},
               {"pos": 2, "raw": "ΑΓΝΩΣΤΟΣ ΚΑΠΟΙΟΣ", "seed": null, "bye": false, "people": [{"surname": "ΑΓΝΩΣΤΟΣ", "first": "ΚΑΠΟΙΟΣ"}]}],
  "rounds": [[{"round": 1, "slot": 1, "side1": "ΠΡΩΤΟΝΟΤΑΡΙΟΣ ΓΙΑΝΝΗΣ", "side2": "ΑΓΝΩΣΤΟΣ ΚΑΠΟΙΟΣ", "winner": 1, "scoreRaw": "61 62"}]], "flags": []},
 {"tab": "W 45+", "title": "W 45+ MAIN DRAW (2)", "discipline": "WS", "level": "45+", "format": "knockout", "size": 2, "entrants": [], "rounds": [], "flags": []}
]$j$::jsonb as j;
grant select on d_ to public;

select api.admin_ingest_draws(:'t'::uuid, (select j from d_), true) as dry \gset
select api.admin_ingest_draws(:'t'::uuid, (select j from d_), false) as run \gset
select api.admin_ingest_draws(:'t'::uuid, (select jsonb_build_array(j -> 0) from d_), false) as run2 \gset
select ok(jsonb_path_exists(api.admin_tournaments(), '$[*] ? (@.draw_url != null && @.draws == 1)'), 'the desk lists the draw source and its draws');
select tests.logout();

select is((:'dry'::jsonb ->> 'draws')::int, 2, 'a dry read counts the draws');
select is((:'run'::jsonb ->> 'linked')::int, 2, 'both names end up on a player');
select is((select count(*)::int from core.tournament_draws where tournament_id = :'t'::uuid), 1, 'a tab gone from the sheet is removed');
select is((select draw -> 'entrants' -> 0 -> 'players' -> 0 ->> 'player_id' from core.tournament_draws where tournament_id = :'t'::uuid),
          :'p1', 'the sure name links to the player');
select is((select draw -> 'entrants' -> 1 -> 'players' -> 0 ->> 'player_id' from core.tournament_draws where tournament_id = :'t'::uuid),
          (select id::text from core.players where surname = 'ΑΓΝΩΣΤΟΣ'), 'an unknown name becomes a new player');
select is((select count(*)::int from core.players where surname = 'ΑΓΝΩΣΤΟΣ'), 1, 'once, not on every read');
select is((select count(*)::int from core.ingest_runs where tournament_id = :'t'::uuid and kind = 'draws'), 3, 'every read is logged as a draw read');

select set_config('request.jwt.claims', '{"role": "service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
select ok(jsonb_path_exists(api.ingest_due(), '$[*] ? (@.draw_url != null)'), 'a tournament with only a draw sheet is due');
select is(api.ingest_cron_draws(:'t'::uuid, '[]', 'not shared') ->> 'health', 'error', 'a failed read is logged red');
reset role;

-- a round robin keeps its groups
select tests.login(:'adm'::uuid);
select api.admin_ingest_draws(:'t'::uuid, '[{"tab": "MIXED", "title": "MIXED ROUND ROBIN", "discipline": "XD", "level": "", "format": "round_robin", "size": 2,
  "entrants": [], "rounds": [], "flags": [],
  "groups": [{"name": "Όμιλος 1", "teams": [{"pos": 1, "raw": "Α / Β"}, {"pos": 2, "raw": "Γ / Δ"}], "matches": [{"a": 1, "b": 2, "scoreRaw": "63 64", "winner": 1}],
              "standings": [{"pos": 1, "won": 1, "played": 1}]}]}]'::jsonb, false);
select tests.logout();
select is((select draw -> 'groups' -> 0 ->> 'name' from core.tournament_draws where tournament_id = :'t'::uuid and tab = 'MIXED'), 'Όμιλος 1',
          'a round robin keeps its groups');

select * from finish();
rollback;
