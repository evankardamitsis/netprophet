-- Notification texts the founder edits and approves: the seeded texts render exactly today's pushes, an edit changes the
-- next push, the checks hold, only staff edit, only an admin approves, and an edit clears the approval.
begin;
select plan(30);

-- ── seeded texts render today's strings ──
select is((select title || '|' || body from core.ntext('results_one', '{}')), 'Βγήκε αποτέλεσμα|Το ’πες; Μπες να δεις.', 'one result');
select is((select title || '|' || body from core.ntext('results_many', '{"n": 3}')), 'Βγήκαν 3 αποτελέσματα|Πόσα το ’πες; Μπες να δεις.', 'many results');
select is((select title || '|' || body from core.ntext('schedule_new', '{"when": "Σάβ 17/10, 10:00", "tournament": "Glyfada Open", "opponent": "Παππάς"}')),
          'Το πρόγραμμά σου|Σάβ 17/10, 10:00 · Glyfada Open · με Παππάς', 'schedule: new');
select is((select title from core.ntext('schedule_moved', '{}')), 'Άλλαξε η ώρα σου', 'schedule: moved');
select is((select body from core.ntext('schedule_moved', '{"when": "Σάβ 17/10, 10:00", "tournament": "T", "opponent": ""}')),
          'Σάβ 17/10, 10:00 · T · με ', 'an empty value keeps its piece (as today)');
select is((select title || '|' || body from core.ntext('schedule_postponed', '{"tournament": "T", "opponent": "Παππάς"}')),
          'Αναβλήθηκε το ματς σου|T: το ματς με Παππάς αναβλήθηκε. Θα σου πούμε τη νέα μέρα.', 'schedule: postponed');
select is((select title || '|' || body from core.ntext('draw_opponent', '{"tournament": "T", "category": "M OPEN", "opponent": "Παππάς"}')),
          'Βγήκε η κλήρωση|T · M OPEN: πρώτος γύρος με Παππάς', 'draw: opponent');
select is((select body from core.ntext('draw_bye', '{"tournament": "T", "category": "M OPEN"}')),
          'T · M OPEN: περνάς κατευθείαν στον 2ο γύρο', 'draw: bye');
select is((select body from core.ntext('draw_group', '{"tournament": "T", "category": "MIXED"}')), 'T · MIXED: παίζεις σε όμιλο', 'draw: group');
select is((select title || '|' || body from core.ntext('reminder_eve', '{"when": "Σάβ 17/10, 10:00", "tournament": "T", "opponent": "Παππάς"}')),
          'Αύριο παίζεις|Σάβ 17/10, 10:00 · T · με Παππάς', 'reminder: the evening before');
select is((select title || '|' || body from core.ntext('reminder_soon', '{"time": "10:00", "tournament": null, "opponent": "Παππάς"}')),
          'Σε λίγο παίζεις|10:00 · με Παππάς', 'reminder: no tournament, its piece drops');
select is((select body from core.ntext('reminder_soon', '{"time": "10:00"}')), '10:00', 'reminder: nothing known, only the time');
select is((select title || '|' || body from core.ntext('entry_deadline', '{"tournament": "T", "day": "Πέμ", "date": "22/10"}')),
          'Κλείνουν οι δηλώσεις|T: δηλώσεις έως Πέμ 22/10. Μπαίνεις;', 'entry deadline');
select is(core.ntext_fill('{a} · {b}', '{"a": "{b}", "b": "x"}'), '{b} · x', 'a value is never filled again');

-- ── a real reminder through the builder, then an edit changes the next one ──
select tests.create_user('nt-pro@test.local') as pro \gset
insert into core.entitlements (user_id, source, status) values (:'pro'::uuid, 'gift', 'active');
select tests.mk_player('Νοτ', 'Πρόος') as p1 \gset
select tests.mk_player('Νοτ', 'Αντίπαλος') as p2 \gset
update core.players set claimed_by_user_id = :'pro'::uuid where id = :'p1'::uuid;
select ((core.athens_day(now()) + 1) + time '10:00') at time zone 'Europe/Athens' as starts \gset
select tests.mk_match(:'p1'::uuid, :'p2'::uuid, :'starts'::timestamptz) as m \gset
select core.match_reminders((core.athens_day(now()) + time '20:05') at time zone 'Europe/Athens');
select is((select payload ->> 'body' from core.notifications where user_id = :'pro'::uuid and type = 'reminder'),
          core.greek_when(:'starts'::timestamptz) || ' · με Αντίπαλος', 'the builder: no tournament, the opponent, as today');

select tests.create_user('nt-admin@test.local', 'admin', 'Ελένη') as adm \gset
select tests.create_user('nt-editor@test.local', 'editor') as ed \gset
select tests.create_user('nt-user@test.local') as usr \gset

select tests.login(:'ed'::uuid);
select lives_ok($$select api.admin_update_notification_text('reminder_soon', 'Πάμε! Σε λίγο', '{time}: με {opponent} · {tournament}')$$, 'an editor edits a text');
select tests.logout();
select core.match_reminders(:'starts'::timestamptz - interval '1 hour 55 minutes');
select is((select payload ->> 'title' || '|' || (payload ->> 'body') from core.notifications where user_id = :'pro'::uuid and dedupe_key like 'reminder:soon:%'),
          'Πάμε! Σε λίγο|10:00: με Αντίπαλος', 'the next push uses the new text');

-- ── the checks ──
select tests.login(:'ed'::uuid);
select throws_ok($$select api.admin_update_notification_text('results_many', 'Βγήκαν {count}', 'x')$$, '22023', 'unknown_placeholder: count', 'an unknown placeholder is refused');
select throws_ok($$select api.admin_update_notification_text('results_one', 'Βγήκε {n}', 'x')$$, '22023', 'unknown_placeholder: n', 'a placeholder of another text is refused');
select throws_ok(format('select api.admin_update_notification_text(%L, %L, %L)', 'results_one', 'Βγήκε ' || chr(8212) || ' δες', 'x'), '22023', 'em_dash', 'no em dash');
select throws_ok($$select api.admin_update_notification_text('results_one', '  ', 'x')$$, '22023', 'title_required', 'a title is needed');
select throws_ok(format('select api.admin_update_notification_text(%L, %L, %L)', 'results_one', 'x', repeat('α', 181)), '22023', 'body_too_long', 'the body has a limit');
select throws_ok($$select api.admin_update_notification_text('results_many', 'Βγήκαν {n αποτελέσματα', 'x')$$, '22023', 'stray_brace', 'a broken brace is refused');
select throws_ok($$select api.admin_approve_notification_text('results_one')$$, '42501', 'forbidden', 'an editor cannot approve');
select tests.logout();

select tests.login(:'usr'::uuid);
select throws_ok($$select api.admin_update_notification_text('results_one', 'Χακ', 'x')$$, '42501', 'forbidden', 'a player cannot edit');
select throws_ok($$select api.admin_notification_texts()$$, '42501', 'forbidden', 'a player cannot read the list');
select throws_ok($$select * from core.notification_texts$$, '42501', null, 'no direct access to the table');
select tests.logout();

-- ── approve, then an edit clears it ──
select tests.login(:'adm'::uuid);
select is((api.admin_approve_notification_text('results_one') ->> 'approved_by'), 'Ελένη', 'the admin approves');
select ok((select (x ->> 'approved_at') is not null from jsonb_array_elements(api.admin_notification_texts()) x where x ->> 'key' = 'results_one'),
          'approved_at is set');
select ok((api.admin_update_notification_text('results_one', 'Βγήκε αποτέλεσμα!', 'Το ’πες; Μπες να δεις.') ->> 'approved_at') is null,
          'an edit clears the approval');
select tests.logout();

select * from finish();
rollback;
