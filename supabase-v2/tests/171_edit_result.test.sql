-- Editing a published result: admin only; votes and points follow the new winner, any number of times; the σερί stays;
-- a score change moves no points; a read of the source does not overwrite it; removing the match takes it all back.
begin;
select plan(17);

select tests.create_user('er-a@test.local') as a \gset
select tests.create_user('er-b@test.local') as b \gset
select tests.create_user('er-ed@test.local', 'editor') as ed \gset
select tests.create_user('er-adm@test.local', 'admin') as adm \gset

-- a voted right, on side 1, and earned points
select tests.play(:'a'::uuid, true) as m \gset
select (select total_points from core.user_game_state where user_id = :'a'::uuid) as earned \gset
select (select streak from core.user_game_state where user_id = :'a'::uuid) as streak \gset
select (select votes_correct from core.user_game_state where user_id = :'a'::uuid) as vc \gset
select (select winner_side from core.match_results where match_id = :'m'::uuid) as w \gset
select (3 - :w) as other \gset
select (select (core.sport_rules(sport_id) ->> 'correct')::int from core.matches where id = :'m'::uuid) as base \gset
insert into core.votes (user_id, subject_type, subject_id, option, day_key, resolved_at, outcome, points)
values (:'b'::uuid, 'match', :'m'::uuid, :other, current_date, now(), 'wrong', 0);

select tests.login(:'ed'::uuid);
select throws_ok(format($$select api.admin_edit_result(%L, %s, '[]', false, true)$$, :'m', :other), '42501', null, 'an editor cannot edit a published result');
select tests.login(:'adm'::uuid);

-- the score only
select is((api.admin_edit_result(:'m'::uuid, :w, '[{"w": 7, "l": 5}, {"w": 6, "l": 1}]') ->> 'points_moved')::int, 0, 'another score with the same winner moves no points');
select is((select total_points from core.user_game_state where user_id = :'a'::uuid), :'earned'::int, 'the points stay');
select is((api.admin_edit_result(:'m'::uuid, :w, '[{"w": 7, "l": 5}, {"w": 6, "l": 1}]') ->> 'changed')::boolean, false, 'the same again changes nothing');

-- the other side won
select is((api.admin_edit_result(:'m'::uuid, :other, '[]', false, true) ->> 'votes_changed')::int, 2, 'a new winner flips both votes');
reset role;
select is((select total_points from core.user_game_state where user_id = :'a'::uuid), 0, 'who was right loses what the match paid');
select is((select total_points from core.user_game_state where user_id = :'b'::uuid), :base, 'who is now right gets the base points');
select is((select outcome from core.votes where user_id = :'a'::uuid and subject_id = :'m'::uuid), 'wrong', 'the vote says so');
select is((select votes_correct from core.user_game_state where user_id = :'a'::uuid), :'vc'::int - 1, 'and the count of right calls');
select is((select streak from core.user_game_state where user_id = :'a'::uuid), :'streak'::int, 'the σερί is not rewritten');
select is((select payload ->> 'outcome' from core.feed_inbox where kind = 'result' and user_id = :'a'::uuid and ref = 'match:' || :'m'), 'wrong', 'a card not yet seen shows the new result');

-- back and forth: the ledger stays right past its one row per reason per match
select tests.login(:'adm'::uuid);
select api.admin_edit_result(:'m'::uuid, :w, '[{"w": 6, "l": 4}, {"w": 6, "l": 4}]');
select api.admin_edit_result(:'m'::uuid, :other, '[]', false, true);
select api.admin_edit_result(:'m'::uuid, :w, '[{"w": 6, "l": 4}, {"w": 6, "l": 4}]');
reset role;
select is((select total_points from core.user_game_state where user_id = :'a'::uuid), :base, 'four flips later: the base points');
select is((select total_points from core.user_game_state where user_id = :'b'::uuid), 0, 'and nothing for the other');
select is((select count(*)::int from core.result_edits where match_id = :'m'::uuid), 5, 'every edit is kept');

-- a result nobody published cannot be edited
select tests.mk_match_fresh() as fresh \gset
select tests.login(:'adm'::uuid);
select throws_ok(format($$select api.admin_edit_result(%L, 1, '[]', false, true)$$, :'fresh'), '22023', null, 'only a published result');

-- the source says otherwise on its next read: the edit stands
reset role;
insert into core.tournaments (sport_id, name, source) values ('tennis', 'Edit Open', 'import') returning id as t \gset
update core.matches set tournament_id = :'t'::uuid, source = 'import', source_ref = 'er-1' where id = :'m'::uuid;
select core.ingest_apply(:'t'::uuid, jsonb_build_array(jsonb_build_object('fingerprint', 'er-1', 'date', current_date, 'time', '20:00', 'discipline', 'MS', 'level', 'OPEN',
  'side1', '[]'::jsonb, 'side2', '[]'::jsonb, 'result', jsonb_build_object('winner_side', :other, 'sets', '[]'::jsonb, 'walkover', true))), null, null);
select is((select winner_side::int from core.match_results where match_id = :'m'::uuid), :w, 'a read of the source does not overwrite an edit');

-- removed: nothing left from the match or its edits
select tests.login(:'adm'::uuid);
select api.admin_void_match(:'m'::uuid);
reset role;
select is((select total_points from core.user_game_state where user_id = :'a'::uuid), 0, 'removing the match takes the edits back too');

select * from finish();
rollback;
