-- The opponent link: a non-member sees the match, answers, hides or shows themselves, and claims their player.
begin;
select plan(19);

select tests.create_user('ml-u@test.local') as u \gset
select tests.create_user('ml-w@test.local') as w \gset
select tests.create_user('ml-x@test.local') as x \gset
select tests.mk_player('Λογ', 'Γράφει') as me \gset
select tests.mk_player('Μέλ', 'Λος') as member \gset
update core.profiles set claimed_player_id = :'me'::uuid where user_id = :'u'::uuid;
update core.players set claimed_by_user_id = :'u'::uuid where id = :'me'::uuid;
update core.players set claimed_by_user_id = :'x'::uuid where id = :'member'::uuid;

-- a played match against a new name: the new player gets a link
select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"new": {"first": "Νέος", "surname": "Λινκ"}}], "result": {"won": true, "sets": "2-1"}}',
                            core.athens_day())::jsonb) ->> 'match_id' as m1 \gset
select api.match_links(:'m1'::uuid) as links \gset
select is(jsonb_array_length(:'links'::jsonb), 1, 'one link for the opponent not in the app');
select :'links'::jsonb -> 0 ->> 'token' as tok \gset
select is(length(:'tok'), 16, 'a short token');

select tests.login(:'w'::uuid);
select throws_ok(format($$select api.match_links(%L)$$, :'m1'), '42501', 'not_your_match', 'only the logger gets the links');

-- the visitor, without an account
select tests.as_anon();
select is((api.get_match_link(:'tok') ->> 'score'), '2-1', 'the link shows the score');
select is((api.get_match_link(:'tok') ->> 'my_side')::int, 2, 'from the opponent''s side');
select throws_ok($$select api.get_match_link('nope')$$, 'P0002', 'link_not_found', 'a wrong token finds nothing');
select throws_ok(format($$select api.match_links(%L)$$, :'m1'), '42501', null, 'anonymous callers make no links');
select is((api.answer_link(:'tok', 'yes') ->> 'outcome'), 'confirmed', '«Έτσι έγινε» from the link');
select throws_ok(format($$select api.answer_link(%L, 'yes')$$, :'tok'), 'P0002', 'nothing_to_confirm', 'an answer counts once');
select api.link_kudo(:'tok', 'serve');
select api.hide_via_link(:'tok', true) is not null as x \gset
select tests.logout();
select is((select via from core.match_confirmations where match_id = :'m1'::uuid and state = 'confirmed'), 'link', 'answered by link');
select ok((select opened_at is not null and kudo = 'serve' from core.match_links where match_id = :'m1'::uuid), 'opened, and the good word is kept');
select is((select hidden from core.players where surname = 'Λινκ'), true, '«Κρύψε με» hides them');
select tests.as_anon();
select api.hide_via_link(:'tok', false) is not null as x \gset
select tests.logout();
select is((select hidden from core.players where surname = 'Λινκ'), false, 'and the same link shows them again');

-- join and claim: the pending player becomes theirs
select tests.login(:'w'::uuid);
select is((api.claim_via_link(:'tok') ->> 'claimed')::boolean, true, '«Κράτα το ματς στο προφίλ σου»');
select tests.logout();
select is((select status || ':' || (claimed_by_user_id = :'w'::uuid) from core.players where surname = 'Λινκ'), 'active:true',
          'the new name is now an active, claimed player');

-- a member gets no link; a resend makes the old token stop working; an expired link finds nothing
select tests.login(:'u'::uuid);
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"new": {"first": "Άλλος", "surname": "Λινκ"}}], "result": {"won": false, "sets": "2-0"}}',
                            core.athens_day() - 1)::jsonb) ->> 'match_id' as m2 \gset
select api.match_links(:'m2'::uuid) -> 0 ->> 'token' as old \gset
select api.match_links(:'m2'::uuid) -> 0 ->> 'token' as new \gset
select api.log_match(format('{"mode": "played", "date": "%s", "format": "singles", "opponents": [{"player_id": "%s"}], "result": {"won": true, "sets": "2-0"}}',
                            core.athens_day() - 2, :'member')::jsonb) ->> 'match_id' as m3 \gset
select is(jsonb_array_length(api.match_links(:'m3'::uuid)), 0, 'members confirm in the feed, no link');
select tests.as_anon();
select throws_ok(format($$select api.get_match_link(%L)$$, :'old'), 'P0002', 'link_not_found', 'a resent link replaces the old one');
select is((api.get_match_link(:'new') ->> 'state'), 'pending', 'and the new one works');
select tests.logout();
update core.match_links set created_at = now() - interval '8 days', expires_at = now() - interval '1 day' where match_id = :'m2'::uuid;
select tests.as_anon();
select throws_ok(format($$select api.get_match_link(%L)$$, :'new'), 'P0002', 'link_not_found', 'an expired link finds nothing');

select * from finish();
rollback;
