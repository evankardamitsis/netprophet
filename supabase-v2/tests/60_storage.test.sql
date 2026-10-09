-- Storage: avatars and athlete-photos accept writes from the owner only (v1 let any signed-in user write and delete).
begin;
-- real Supabase blocks direct deletes unless this is set (the Storage API sets it); the RLS policies are what we test
set local storage.allow_delete_query = 'true';
select plan(16);

select tests.create_user('st-a@test.local') as a \gset
select tests.create_user('st-b@test.local') as b \gset
select tests.create_user('st-admin@test.local', 'admin') as adm \gset
select tests.mk_player('Φωτο', 'Αθλητής') as p \gset
update core.players set claimed_by_user_id = :'a'::uuid where id = :'p'::uuid;

select is((select file_size_limit from storage.buckets where id = 'athlete-photos'), 5242880::bigint, 'athlete-photos bucket has a 5 MB limit');
select is((select count(*)::int from storage.buckets where id in ('avatars', 'athlete-photos')), 2, 'both buckets exist');

-- a fixture object that belongs to B
insert into storage.objects (bucket_id, name, owner) values ('avatars', :'b' || '/b.png', :'b'::uuid);

-- avatars (folder = user id)
select tests.login(:'a'::uuid);
select lives_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('avatars', %L, auth.uid())$$, :'a' || '/a.png'), 'A can upload into their own avatars folder');
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('avatars', %L, auth.uid())$$, :'b' || '/evil.png'), '42501', null, 'A cannot upload into B''s folder');
select throws_ok($$insert into storage.objects (bucket_id, name, owner) values ('avatars', 'loose.png', auth.uid())$$, '42501', null, 'no uploads outside a user folder');
select is(tests.rowcount($q$update storage.objects set name = name where bucket_id = 'avatars' and name like '%/b.png'$q$), 0, 'A cannot update B''s file');
select is(tests.rowcount($q$delete from storage.objects where bucket_id = 'avatars' and name like '%/b.png'$q$), 0, 'A cannot delete B''s file');
select is(tests.rowcount($q$update storage.objects set metadata = '{"v":2}' where bucket_id = 'avatars' and name = (auth.uid())::text || '/a.png'$q$), 1, 'A can update their own file');
select is(tests.rowcount($q$delete from storage.objects where bucket_id = 'avatars' and name = (auth.uid())::text || '/a.png'$q$), 1, 'A can delete their own file');
select cmp_ok((select count(*)::int from storage.objects where bucket_id = 'avatars'), '>=', 1, 'avatars are publicly readable (B''s file is visible to A)');

-- athlete photos (folder = player id): the claimed account or staff
select lives_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('athlete-photos', %L, auth.uid())$$, :'p' || '/photo.jpg'), 'the claimed player can upload their photo');
select tests.login(:'b'::uuid);
select throws_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('athlete-photos', %L, auth.uid())$$, :'p' || '/hack.jpg'), '42501', null, 'another user cannot upload into that player''s folder');
select is(tests.rowcount($q$delete from storage.objects where bucket_id = 'athlete-photos'$q$), 0, 'another user cannot delete the photo');
select tests.login(:'adm'::uuid);
select lives_ok(format($$insert into storage.objects (bucket_id, name, owner) values ('athlete-photos', %L, auth.uid())$$, :'p' || '/admin.jpg'), 'an admin can upload for any player');
select tests.as_anon();
select throws_ok(format($$insert into storage.objects (bucket_id, name) values ('athlete-photos', %L)$$, :'p' || '/anon.jpg'), '42501', null, 'anon cannot upload');
select cmp_ok((select count(*)::int from storage.objects where bucket_id = 'athlete-photos'), '>=', 1, 'anon can read athlete photos');

select * from finish();
rollback;
