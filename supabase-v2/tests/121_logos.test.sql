-- Logos for tournaments and clubs: a public `logos` bucket only staff write; staff set and clear a logo with a path
-- in the row's own folder; every function that shows a tournament or club name carries its logo path.
begin;
set local storage.allow_delete_query = 'true';
select plan(30);

select tests.create_user('lg-u@test.local') as u \gset
select tests.create_user('lg-ed@test.local', 'editor') as ed \gset
insert into core.entitlements (user_id, source, status) values (:'u'::uuid, 'gift', 'active');
select tests.mk_player('Λόγκο', 'Πρώτος') as pa \gset
select tests.mk_player('Λόγκο', 'Δεύτερος') as pb \gset
select tests.mk_player('Λόγκο', 'Εγώ') as pme \gset
update core.players set claimed_by_user_id = :'u'::uuid where id = :'pme'::uuid;
update core.profiles set claimed_player_id = :'pme'::uuid where user_id = :'u'::uuid;

select core.athens_day(now()) as today \gset
insert into core.tournaments (id, sport_id, name, starts_on, ends_on, entry_deadline) values
  ('00000000-0000-0000-0000-0000000010a1', 'tennis', 'Open Λόγκο', :'today'::date - 1, :'today'::date + 5, null),
  ('00000000-0000-0000-0000-0000000010a2', 'tennis', 'Κύπελλο Μετά', :'today'::date + 10, null, :'today'::date + 5);
insert into core.clubs (id, name) values ('00000000-0000-0000-0000-0000000010c1', 'Όμιλος Λόγκο');

-- a match tomorrow at the club (feed, tournament page), a finished one (results), one of mine (Pro schedule)
select tests.mk_match(:'pa'::uuid, :'pb'::uuid, now() + interval '1 day') as m_open \gset
select tests.mk_match(:'pa'::uuid, :'pb'::uuid, now() - interval '1 day') as m_done \gset
select tests.mk_match(:'pme'::uuid, :'pa'::uuid, now() + interval '2 days') as m_mine \gset
update core.matches set tournament_id = '00000000-0000-0000-0000-0000000010a1', club_id = '00000000-0000-0000-0000-0000000010c1'
 where id in (:'m_open'::uuid, :'m_done'::uuid, :'m_mine'::uuid);
select tests.finish_match(:'m_done'::uuid, 1) is not null as x \gset

-- the bucket
select is((select public from storage.buckets where id = 'logos'), true, 'the logos bucket is public');
select is((select file_size_limit from storage.buckets where id = 'logos'), 524288::bigint, 'logos are 512 KB at most');
select is((select allowed_mime_types from storage.buckets where id = 'logos'), array['image/png', 'image/jpeg', 'image/webp'],
          'logos are PNG, JPG or WebP');

-- storage: staff write, nobody else
select tests.login(:'u'::uuid);
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('logos', 'tournaments/x/evil.png', auth.uid())$$,
                 '42501', null, 'a player cannot upload a logo');
select tests.login(:'ed'::uuid);
select lives_ok($$insert into storage.objects (bucket_id, name, owner) values ('logos', 'tournaments/00000000-0000-0000-0000-0000000010a1/a1.png', auth.uid())$$,
                'staff can upload a logo');
select tests.login(:'u'::uuid);
select is(tests.rowcount($q$delete from storage.objects where bucket_id = 'logos'$q$), 0, 'a player cannot delete a logo');
select tests.as_anon();
select is((select count(*)::int from storage.objects where bucket_id = 'logos'), 1, 'anyone can read logos');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('logos', 'clubs/x/anon.png')$$, '42501', null, 'anon cannot upload');

-- the admin rpc
select tests.login(:'u'::uuid);
select throws_ok($$select api.admin_set_logo('tournament', '00000000-0000-0000-0000-0000000010a1', 'tournaments/00000000-0000-0000-0000-0000000010a1/a1.png')$$,
                 '42501', null, 'a player cannot set a logo');
select tests.login(:'ed'::uuid);
select throws_ok($$select api.admin_set_logo('tournament', '00000000-0000-0000-0000-0000000010a1', 'tournaments/00000000-0000-0000-0000-0000000010a2/a1.png')$$,
                 '22023', null, 'a path outside the row''s folder is refused');
select throws_ok($$select api.admin_set_logo('tournament', '00000000-0000-0000-0000-0000000010a1', 'tournaments/00000000-0000-0000-0000-0000000010a1/a1.svg')$$,
                 '22023', null, 'an SVG path is refused');
select throws_ok($$select api.admin_set_logo('player', '00000000-0000-0000-0000-0000000010a1', null)$$, '22023', null, 'only tournaments and clubs');
select throws_ok($$select api.admin_set_logo('club', '00000000-0000-0000-0000-0000000010a1', null)$$, 'P0002', null, 'an unknown club is not found');
select is(api.admin_set_logo('tournament', '00000000-0000-0000-0000-0000000010a1', 'tournaments/00000000-0000-0000-0000-0000000010a1/old1.png') ->> 'previous',
          null, 'the first logo has no previous one');
select is(api.admin_set_logo('tournament', '00000000-0000-0000-0000-0000000010a1', 'tournaments/00000000-0000-0000-0000-0000000010a1/a1.png') ->> 'previous',
          'tournaments/00000000-0000-0000-0000-0000000010a1/old1.png', 'a replaced logo returns the old path to remove');
select is(api.admin_set_logo('club', '00000000-0000-0000-0000-0000000010c1', 'clubs/00000000-0000-0000-0000-0000000010c1/c1.webp') ->> 'logo_path',
          'clubs/00000000-0000-0000-0000-0000000010c1/c1.webp', 'staff set a club logo');
select api.admin_set_logo('tournament', '00000000-0000-0000-0000-0000000010a2', 'tournaments/00000000-0000-0000-0000-0000000010a2/a2.jpg') is not null as x \gset
select is((select t ->> 'logo_path' from jsonb_array_elements(api.admin_tournaments()) t where t ->> 'id' = '00000000-0000-0000-0000-0000000010a1'),
          'tournaments/00000000-0000-0000-0000-0000000010a1/a1.png', 'the admin list shows the tournament logo');
select is((select c ->> 'logo_path' from jsonb_array_elements(api.admin_clubs()) c where c ->> 'id' = '00000000-0000-0000-0000-0000000010c1'),
          'clubs/00000000-0000-0000-0000-0000000010c1/c1.webp', 'the admin list shows the club logo');

-- what the app reads
select tests.login(:'u'::uuid);
select is((select c -> 'tournament' ->> 'logo' from jsonb_array_elements(api.get_feed(100) -> 'items') c where c ->> 'match_id' = :'m_open'),
          'tournaments/00000000-0000-0000-0000-0000000010a1/a1.png', 'a feed card carries its tournament logo');
select is((select c ->> 'club_logo' from jsonb_array_elements(api.get_feed(100) -> 'items') c where c ->> 'match_id' = :'m_open'),
          'clubs/00000000-0000-0000-0000-0000000010c1/c1.webp', 'a feed card carries its club logo');
select is((select r ->> 'tournament_logo' from jsonb_array_elements(api.get_results()) r where r ->> 'match_id' = :'m_done'),
          'tournaments/00000000-0000-0000-0000-0000000010a1/a1.png', 'a result carries its tournament logo');
select is((select r ->> 'logo' from jsonb_array_elements(api.results_tournaments()) r where r ->> 'id' = '00000000-0000-0000-0000-0000000010a1'),
          'tournaments/00000000-0000-0000-0000-0000000010a1/a1.png', 'the results filter carries the logo');
select is((select r ->> 'logo' from jsonb_array_elements(api.get_tournaments() -> 'items') r where r ->> 'id' = '00000000-0000-0000-0000-0000000010a1'),
          'tournaments/00000000-0000-0000-0000-0000000010a1/a1.png', 'the tournaments page carries the logo');
select is((select r ->> 'tournament_logo' from jsonb_array_elements(api.get_tournaments() -> 'mine') r where r ->> 'match_id' = :'m_mine'),
          'tournaments/00000000-0000-0000-0000-0000000010a1/a1.png', 'my schedule carries the tournament logo');
select is(api.get_tournament('00000000-0000-0000-0000-0000000010a1') ->> 'logo',
          'tournaments/00000000-0000-0000-0000-0000000010a1/a1.png', 'a tournament page carries its logo');
select is((select m ->> 'club_logo' from jsonb_array_elements(api.get_tournament('00000000-0000-0000-0000-0000000010a1') -> 'days') d,
                                         jsonb_array_elements(d -> 'matches') m where m ->> 'match_id' = :'m_open'),
          'clubs/00000000-0000-0000-0000-0000000010c1/c1.webp', 'a match on the tournament page carries its club logo');
select is((select r ->> 'logo' from jsonb_array_elements(api.upcoming_tournaments() -> 'items') r where r ->> 'id' = '00000000-0000-0000-0000-0000000010a2'),
          'tournaments/00000000-0000-0000-0000-0000000010a2/a2.jpg', 'the next tournament carries its logo');
select is((select r ->> 'logo' from jsonb_array_elements(api.list_tournaments()) r where r ->> 'id' = '00000000-0000-0000-0000-0000000010a2'),
          'tournaments/00000000-0000-0000-0000-0000000010a2/a2.jpg', 'the «+ Ματς» picker carries the logo');

-- clearing
select tests.login(:'ed'::uuid);
select is(api.admin_set_logo('tournament', '00000000-0000-0000-0000-0000000010a1', null) ->> 'previous',
          'tournaments/00000000-0000-0000-0000-0000000010a1/a1.png', 'clearing returns the path to remove');
select tests.login(:'u'::uuid);
select is((select r ->> 'logo' from jsonb_array_elements(api.get_tournaments() -> 'items') r where r ->> 'id' = '00000000-0000-0000-0000-0000000010a1'),
          null, 'a cleared logo is gone');

select * from finish();
rollback;
