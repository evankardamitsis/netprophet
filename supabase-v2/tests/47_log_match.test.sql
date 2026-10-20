-- «+ Ματς»: players log played and upcoming matches; staff check each one, then votes on it pay out when its result
-- comes in (18 Oct 2026: no match can be invented).
begin;
select plan(15);

select tests.create_user('lm-u@test.local') as u \gset
select tests.create_user('lm-v@test.local') as v \gset
select tests.create_user('lm-w@test.local') as w \gset
select tests.mk_player('Λογ', 'Γκερ') as me \gset
select tests.mk_player('Αντί', 'Πάλος') as o \gset
update core.profiles set claimed_player_id = :'me'::uuid where user_id = :'u'::uuid;
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
update core.profiles set first_name = 'Βασίλης', surname = 'Νεόφερτος' where user_id = :'w'::uuid;

select tests.as_anon();
select throws_ok($$select api.log_match('{"mode": "soon"}')$$, '42501', null, 'anonymous callers cannot log');

-- a played singles match, won 2-1
select tests.login(:'u'::uuid);
select format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}], "result": {"won": true, "sets": "2-1"}}',
              core.athens_day(), :'o') as played \gset
select api.log_match(:'played'::jsonb) ->> 'match_id' as m1 \gset
select tests.logout();
select is((select review from core.matches where id = :'m1'::uuid), 'pending', 'a played match waits for staff');
select is((select score_summary from core.match_results where match_id = :'m1'::uuid), '2-1', 'the sets, no games');
select is((select winner_side::int from core.match_results where match_id = :'m1'::uuid), 1, 'won by the logger''s side');
select is((select state from core.match_confirmations where match_id = :'m1'::uuid and player_id = :'o'::uuid), 'pending',
          'the opponent has a confirmation waiting');
select is((select counts_for_levels from core.matches where id = :'m1'::uuid), false, 'it counts for levels only once confirmed');
select ok(not exists (select 1 from core.outbox where kind = 'resolve_match' and payload ->> 'match_id' = :'m1'), 'nothing resolves before staff approve it');

select tests.login(:'u'::uuid);
select throws_ok(format($$select api.log_match(%L)$$, :'played'), '23505', 'duplicate_match', 'the same match twice is refused');
select throws_ok(format($$select api.log_match('{"mode": "played", "date": "%s", "format": "doubles", "partner": {"player_id": "%s"}, "opponents": [{"new": {"first": "Άλφα", "surname": "Βήτα"}}], "result": {"won": true, "sets": "2-0"}}')$$,
                 core.athens_day(), :'o'), '22023', 'wrong_opponents', 'doubles needs two opponents');

-- an upcoming match against a new name
select format('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"new": {"first": "Νέος", "surname": "Αντίπαλος"}}]}',
              core.athens_day() + 1) as soon \gset
select api.log_match(:'soon'::jsonb) ->> 'match_id' as m2 \gset
select tests.logout();
select is((select status from core.players where surname = 'Αντίπαλος'), 'pending', 'a new name is a pending player');
select tests.approve_match(:'m2'::uuid) is not null as x \gset
select ok(core.match_sides_json(:'m2'::uuid)::text like '%Αντίπαλος%', 'and shows by name on the card');

-- someone votes for the logger, then the logger adds the result to that same match
select tests.login(:'v'::uuid);
select api.cast_vote(:'m2'::uuid, 1) is not null as x \gset
select tests.logout();
select id as newbie from core.players where surname = 'Αντίπαλος' \gset
select tests.login(:'u'::uuid);
select is(jsonb_array_length(api.find_my_matches(array[:'newbie'::uuid], core.athens_day() + 1, 'singles')),
          1, '«Αυτό είναι το ματς σου;» finds it');
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "match_id": "%s", "result": {"won": true, "sets": "2-0"}}',
                            core.athens_day() + 1, :'m2')::jsonb) is not null as x \gset
select tests.logout();
select tests.approve_match(:'m2'::uuid) is not null as x \gset
select core.process_outbox(50) is not null as x \gset
select is((select outcome from core.votes where user_id = :'v'::uuid and subject_id = :'m2'::uuid), 'correct', 'the vote pays out');

-- a logger without a player gets their own, pending, from the profile
select tests.login(:'w'::uuid);
select api.log_match(format('{"mode": "soon", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}]}',
                            core.athens_day() + 2, :'o')::jsonb) is not null as x \gset
select tests.logout();
select is((select p.status from core.players p join core.profiles pr on pr.claimed_player_id = p.id where pr.user_id = :'w'::uuid),
          'pending', 'a new logger gets a pending player of their own');

select tests.login(:'u'::uuid);
select is((select r ->> 'score_summary' from jsonb_array_elements(api.get_results(14, 200)) r where r ->> 'match_id' = :'m1'),
          '2-1', 'Αποτελέσματα has the score without games');

select * from finish();
rollback;
