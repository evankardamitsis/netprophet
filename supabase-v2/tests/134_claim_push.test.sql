-- A push when staff decide a roster claim (20270225000000_claim_push.sql): approve and reject each send one push with
-- their own editable text, keyed on the claim request, so a decision never goes out twice; only staff decide.
begin;
select plan(20);

select tests.create_user('cp-adm@test.local', 'editor') as adm \gset
select tests.create_user('cp-u@test.local') as u \gset
select tests.create_user('cp-w@test.local') as w \gset
select tests.mk_player('Νίκος', 'Παππάς') as p1 \gset
select tests.mk_player('Μαρία', 'Καρρά', 'f') as p2 \gset
-- transactional: it goes even with «Αντιδράσεις» off
update core.profiles set notification_prefs = '{"reactions": false}' where user_id = :'u'::uuid;
insert into core.push_tokens (token, user_id, platform) values ('ExponentPushToken[claim]', :'u'::uuid, 'ios');

create or replace function pg_temp.jobs(p_user uuid) returns int language sql as $$
  select count(*)::int from core.outbox where kind = 'push' and payload ->> 'user_id' = p_user::text and payload ->> 'type' = 'claim'
$$;
create or replace function pg_temp.job(p_user uuid) returns jsonb language sql as $$
  select payload from core.outbox where kind = 'push' and payload ->> 'user_id' = p_user::text and payload ->> 'type' = 'claim'
   order by id desc limit 1
$$;

-- only staff decide
select tests.login(:'u'::uuid);
select api.claim_player(:'p2'::uuid) is not null as x1 \gset
select tests.login(:'w'::uuid);
select throws_ok(format($$select api.admin_review_claim(%L, true)$$, :'u'), '42501', 'forbidden', 'a player cannot approve');
select throws_ok(format($$select api.admin_review_claim(%L, false)$$, :'u'), '42501', 'forbidden', 'nor reject');
select tests.logout();
select is(pg_temp.jobs(:'u'::uuid), 0, 'no push before a decision');

-- reject: one push with the reject text
select tests.login(:'adm'::uuid);
select is(api.admin_review_claim(:'u'::uuid, false) ->> 'decision', 'rejected', '«Απόρριψη»');
select tests.logout();
select is(pg_temp.jobs(:'u'::uuid), 1, 'one push for the rejection');
select is(pg_temp.job(:'u'::uuid) -> 'message' ->> 'title', 'Δεν βρήκαμε σύνδεση', 'the reject title');
select is(pg_temp.job(:'u'::uuid) -> 'message' ->> 'body',
          'Δεν μπορέσαμε να επιβεβαιώσουμε ότι το προφίλ Μαρία Καρρά είναι δικό σου. Γράψε μας αν έγινε λάθος.',
          'the reject body names the player');
select is(pg_temp.job(:'u'::uuid) -> 'message' -> 'data' ->> 'decision', 'rejected', 'the push data says rejected');

-- replay: a decided request cannot be decided again, and nothing more goes out
select tests.login(:'adm'::uuid);
select throws_ok(format($$select api.admin_review_claim(%L, false)$$, :'u'), 'P0002', 'no_request', 'a decision is final');
select tests.logout();
select is(pg_temp.jobs(:'u'::uuid), 1, 'still one push after a replay');
select is((select count(*)::int from core.notifications where user_id = :'u'::uuid and type = 'claim_review'), 1, 'and one notification');

-- ask again, approved: one more push, with the approve text
select tests.login(:'u'::uuid);
select api.claim_player(:'p1'::uuid) is not null as x2 \gset
select tests.logout();
select is(tests.approve_claim(:'u'::uuid) ->> 'decision', 'approved', '«Έγκριση»');
select is(pg_temp.jobs(:'u'::uuid), 2, 'one push for the approval');
select is(pg_temp.job(:'u'::uuid) -> 'message' ->> 'title', 'Είσαι εσύ!', 'the approve title');
select is(pg_temp.job(:'u'::uuid) -> 'message' ->> 'body',
          'Ο λογαριασμός σου συνδέθηκε με το προφίλ Νίκος Παππάς. Τα ματς σου είναι πια δικά σου, δες τα στο Εγώ.',
          'the approve body names the player');
select is(pg_temp.job(:'u'::uuid) -> 'message' -> 'data' ->> 'player_id', :'p1', 'the push data carries the player');
select ok((select n.channel = 'push' and n.payload ->> 'decision' = 'approved' and n.payload ->> 'title' = 'Είσαι εσύ!'
             from core.notifications n where n.dedupe_key = 'claim_review:' || (select id from core.claim_requests
                                                                                where user_id = :'u'::uuid and status = 'approved')),
          'the notification row is the push, keyed on the request');

-- the edited text goes out on the next decision
update core.notification_texts set title = 'Μπράβο, είσαι εσύ' where key = 'claim_approved';
select tests.login(:'w'::uuid);
select api.claim_player(:'p2'::uuid) is not null as x3 \gset
select tests.logout();
select is(tests.approve_claim(:'w'::uuid) ->> 'decision', 'approved', 'another approval');
select is(pg_temp.job(:'w'::uuid) -> 'message' ->> 'title', 'Μπράβο, είσαι εσύ', 'the admin text is used');

-- the push leaves the outbox with type 'claim' in its data (the app opens Εγώ)
select is((select x -> 'data' ->> 'type' from jsonb_array_elements(core.take_push_batch(500)) x
            where x ->> 'to' = 'ExponentPushToken[claim]' and x ->> 'title' = 'Είσαι εσύ!'),
          'claim', 'the batch sends it to the device as type claim');

select * from finish();
rollback;
