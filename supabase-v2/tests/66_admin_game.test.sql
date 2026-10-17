-- Staff tools for the game: the quiz bank (edit, add, retire, with slot checks), a day's set previewed and thrown
-- away, the settings read-only, and the month close as a dry run that writes nothing.
begin;
select plan(11);

select tests.create_user('ag-adm@test.local', 'admin') as adm \gset
select tests.create_user('ag-u@test.local') as u \gset

select tests.login(:'u'::uuid);
select throws_ok($$select api.admin_quiz_templates()$$, '42501', 'forbidden', 'staff only');
select tests.logout();

select tests.login(:'adm'::uuid);
select is(jsonb_array_length(api.admin_quiz_templates()), 40, 'the 40 templates (ten more opinions since 17 Oct)');
select api.admin_save_quiz_template(null, '{"family": "o", "tag": "Άποψη", "q": "Το διπλό θέλει δύο φίλους.", "options": ["Συμφωνώ", "Με τίποτα"]}') ->> 'id' as nt \gset
select is((select active from core.quiz_templates where id = :'nt'::uuid), true, 'a new Άποψη goes live');
select throws_ok($$select api.admin_save_quiz_template(null, '{"family": "s", "tag": "Σενάριο", "q": "{p3.o} με {p1.ton};", "players": 2, "gender": "m", "options": ["{p1}", "{p2}"]}')$$,
                 '22023', 'bad_slot', 'a slot must point at a player');
select throws_ok($$select api.admin_save_quiz_template(null, '{"family": "c", "tag": "Διάλεξε", "q": "Ποιος;", "players": 4, "gender": "m", "options": ["{p1}"]}')$$,
                 '22023', 'two_to_four_options', 'two to four options');
select api.admin_save_quiz_template(:'nt'::uuid, '{"family": "o", "tag": "Άποψη", "q": "Το διπλό θέλει δύο φίλους.", "options": ["Συμφωνώ", "Με τίποτα"], "active": false}');
select is((select active from core.quiz_templates where id = :'nt'::uuid), false, 'and can be retired');

-- preview: six free, twelve Pro, nothing kept
select is(jsonb_array_length(api.admin_quiz_preview('ag-u@test.local', current_date + 3, false) -> 'cards'), 6, 'preview: free six');
select is(jsonb_array_length(api.admin_quiz_preview('ag-u@test.local', current_date + 3, true) -> 'cards'), 12, 'preview: Pro twelve');
select tests.logout();
select is((select count(*)::int from core.quiz_sets where user_id = :'u'::uuid), 0, 'nothing kept');

-- settings and the dry run
select core.league_join(:'u'::uuid);
insert into core.points_ledger (user_id, delta, reason, ref_type, ref_id, month_key, idempotency_key)
values (:'u'::uuid, 40, 'correct', 'match', gen_random_uuid(), core.month_key(), 'ag-1');
select tests.login(:'adm'::uuid);
select is(jsonb_array_length(api.admin_game_config() -> 'unlocks'), 13, 'the ladder, read-only');
select is((select (api.admin_league_preview() -> 'groups' -> 0 -> 'rows' -> 0 ->> 'movement')), 'promote',
          'the dry run says who would go up');
select tests.logout();

select * from finish();
rollback;
