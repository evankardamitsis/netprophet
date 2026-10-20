-- A push when someone reacts to your match (20270223000000_reaction_push.sql): the players of the match who have an
-- account hear about it, never the reactor, a hidden player, a minor, an unclaimed player, someone blocked either way
-- or someone with «Αντιδράσεις» off; at most one push per person per match every 3 hours, later reactions join it.
begin;
select plan(27);

select tests.create_user('rp-a@test.local', 'user', 'Νίκος Παππάς') as a \gset
select tests.create_user('rp-b@test.local', 'user', 'Πέτρος Βλάχος') as b \gset
select tests.create_user('rp-h@test.local') as h \gset
select tests.create_user('rp-k@test.local') as k \gset
select tests.create_user('rp-c@test.local') as c \gset
select tests.create_user('rp-r1@test.local', 'user', 'Γιώργος Ρ') as r1 \gset
select tests.create_user('rp-r2@test.local', 'user', 'Μαρία Σ') as r2 \gset
select tests.create_user('rp-r3@test.local', 'user', 'Ελένη Τ') as r3 \gset
select tests.create_user('rp-x@test.local', 'user', 'Μπλοκ Χ') as x \gset
select tests.create_user('rp-y@test.local', 'user', 'Γιάννης Υ') as y \gset
select tests.create_user('rp-z@test.local', 'user', 'Ζωή Ζ') as z \gset

select tests.mk_player('Νίκος', 'Παππάς') as pa \gset
select tests.mk_player('Χάρης', 'Κρυφός') as ph \gset
select tests.mk_player('Πέτρος', 'Βλάχος') as pb \gset
select tests.mk_player('Κώστας', 'Μικρός') as pk \gset
select tests.mk_player('Μάριος', 'Καρράς') as pc \gset
select tests.mk_player('Άγνωστος', 'Κανένας') as pu \gset
update core.players set claimed_by_user_id = :'a'::uuid where id = :'pa'::uuid;
update core.players set claimed_by_user_id = :'h'::uuid, hidden = true where id = :'ph'::uuid;
update core.players set claimed_by_user_id = :'b'::uuid where id = :'pb'::uuid;
update core.players set claimed_by_user_id = :'k'::uuid, is_minor = true where id = :'pk'::uuid;
update core.players set claimed_by_user_id = :'c'::uuid where id = :'pc'::uuid;
update core.profiles set claimed_player_id = :'pa'::uuid where user_id = :'a'::uuid;

-- m1: doubles, Παππάς and a hidden partner against Βλάχος and a minor; 2-0, so the chips are Πάμε / Περίπατος
select tests.mk_match(:'pa'::uuid, :'pb'::uuid, now() - interval '1 day') as m1 \gset
update core.matches set format = 'doubles' where id = :'m1'::uuid;
insert into core.match_participants (match_id, side, player_id, position) values
  (:'m1'::uuid, 1, :'ph'::uuid, 2), (:'m1'::uuid, 2, :'pk'::uuid, 2);
select tests.finish_match(:'m1'::uuid, 1) is not null as x1 \gset
-- m2: Παππάς against Καρράς, who switched reactions off; Παππάς blocked x
select tests.mk_match(:'pa'::uuid, :'pc'::uuid, now() - interval '1 day') as m2 \gset
select tests.finish_match(:'m2'::uuid, 1) is not null as x2 \gset
update core.profiles set notification_prefs = '{"reactions": false}' where user_id = :'c'::uuid;
insert into core.blocks (user_id, blocked_user_id) values (:'a'::uuid, :'x'::uuid);
-- m3: Παππάς against a player with no account
select tests.mk_match(:'pa'::uuid, :'pu'::uuid, now() - interval '1 day') as m3 \gset
select tests.finish_match(:'m3'::uuid, 1) is not null as x3 \gset

create or replace function pg_temp.pushes(p_user uuid, p_match uuid) returns int language sql as $$
  select count(*)::int from core.notifications where user_id = p_user and type = 'reaction' and payload -> 'data' ->> 'match_id' = p_match::text
$$;
create or replace function pg_temp.last(p_user uuid, p_match uuid) returns core.notifications language sql as $$
  select * from core.notifications where user_id = p_user and type = 'reaction' and payload -> 'data' ->> 'match_id' = p_match::text
   order by scheduled_at desc limit 1
$$;

-- a player reacts to their own match: the other side hears, they do not
select tests.login(:'a'::uuid);
select api.react(:'m1'::uuid, 'lets_go') is not null as x4 \gset
select tests.logout();
select is(pg_temp.pushes(:'a'::uuid, :'m1'::uuid), 0, 'never for your own reaction');
select is(pg_temp.pushes(:'b'::uuid, :'m1'::uuid), 1, 'the claimed player on the other side hears');
select is((pg_temp.last(:'b'::uuid, :'m1'::uuid)).payload ->> 'title', 'Νίκος: «Πάμε»', 'one reactor: the first name and the reaction');
select is((pg_temp.last(:'b'::uuid, :'m1'::uuid)).payload ->> 'body', 'Στο ματς σου με τον Ν. Παππά',
          'the opponent in the accusative, the hidden partner left out, no tournament piece');
select is((pg_temp.last(:'b'::uuid, :'m1'::uuid)).payload -> 'data' ->> 'match_id', :'m1', 'the push opens the match');
select ok(exists (select 1 from core.outbox where idempotency_key = 'push:' || (pg_temp.last(:'b'::uuid, :'m1'::uuid)).dedupe_key
                    and payload ->> 'type' = 'reaction' and run_after <= now()), 'the first one goes at once');
select ok(not ((pg_temp.last(:'b'::uuid, :'m1'::uuid)).payload ? 'reactors'), 'who reacted stays on the server');

-- a spectator reacts: Παππάς hears now, Βλάχος's waiting push now speaks for two
select tests.login(:'r1'::uuid);
select api.react(:'m1'::uuid, 'stroll') is not null as x5 \gset
select tests.logout();
select is(pg_temp.pushes(:'a'::uuid, :'m1'::uuid), 1, 'a claimed player hears about a spectator');
select is((pg_temp.last(:'a'::uuid, :'m1'::uuid)).payload ->> 'title', 'Γιώργος: «Περίπατος»', 'with the spectator''s name');
select is((pg_temp.last(:'a'::uuid, :'m1'::uuid)).payload ->> 'body', 'Στο ματς σου με τον Π. Βλάχο', 'the minor is never named');
select is(pg_temp.pushes(:'b'::uuid, :'m1'::uuid), 1, 'still one push for Βλάχος');
select is((pg_temp.last(:'b'::uuid, :'m1'::uuid)).payload ->> 'title', '2 άτομα αντέδρασαν', 'the waiting push becomes the count');
select is(pg_temp.pushes(:'h'::uuid, :'m1'::uuid), 0, 'a hidden player hears nothing');
select is(pg_temp.pushes(:'k'::uuid, :'m1'::uuid), 0, 'a minor hears nothing');

-- the push goes out; within 3 hours a new reaction waits for the next one
select core.take_push_batch(500) is not null as x6 \gset
select tests.login(:'r2'::uuid);
select api.react(:'m1'::uuid, 'lets_go') is not null as x7 \gset
select tests.logout();
select is(pg_temp.pushes(:'b'::uuid, :'m1'::uuid), 2, 'after a push went, the next reaction opens the next one');
select ok((select run_after >= now() + interval '3 hours' - interval '1 minute' from core.outbox
            where idempotency_key = 'push:' || (pg_temp.last(:'b'::uuid, :'m1'::uuid)).dedupe_key),
          'and it waits 3 hours after the last');
select is((pg_temp.last(:'b'::uuid, :'m1'::uuid)).payload ->> 'title', 'Μαρία: «Πάμε»', 'it names the one person so far');
select tests.login(:'r3'::uuid);
select api.react(:'m1'::uuid, 'stroll') is not null as x8 \gset
select tests.logout();
select is(pg_temp.pushes(:'b'::uuid, :'m1'::uuid), 2, 'a third reaction in the window adds no push');
select is((pg_temp.last(:'b'::uuid, :'m1'::uuid)).payload ->> 'title', '2 άτομα αντέδρασαν', 'it joins the waiting one');

-- changing or taking back and giving again never counts the same person twice
select tests.login(:'r3'::uuid);
select api.react(:'m1'::uuid, 'lets_go') is not null as x9 \gset
select api.react(:'m1'::uuid, null) is not null as x10 \gset
select api.react(:'m1'::uuid, 'stroll') is not null as x11 \gset
select tests.logout();
select is((pg_temp.last(:'b'::uuid, :'m1'::uuid)).payload ->> 'title', '2 άτομα αντέδρασαν', 'the same person counts once');
select is(pg_temp.pushes(:'b'::uuid, :'m1'::uuid), 2, 'and adds no push');

-- blocked either way, and prefs off
select tests.login(:'x'::uuid);
select api.react(:'m2'::uuid, 'lets_go') is not null as x12 \gset
select tests.logout();
select is(pg_temp.pushes(:'a'::uuid, :'m2'::uuid), 0, 'nothing from someone you blocked');
insert into core.blocks (user_id, blocked_user_id) values (:'z'::uuid, :'a'::uuid);
select tests.login(:'z'::uuid);
select api.react(:'m2'::uuid, 'lets_go') is not null as x13 \gset
select tests.logout();
select is(pg_temp.pushes(:'a'::uuid, :'m2'::uuid), 0, 'nothing from someone who blocked you');
select tests.login(:'y'::uuid);
select api.react(:'m2'::uuid, 'lets_go') is not null as x14 \gset
select api.react(:'m3'::uuid, 'lets_go') is not null as x15 \gset
select tests.logout();
select is(pg_temp.pushes(:'a'::uuid, :'m2'::uuid), 1, 'the next reaction does reach Παππάς');
select is(pg_temp.pushes(:'c'::uuid, :'m2'::uuid), 0, 'not someone who switched reactions off');
select is((select count(*)::int from core.notifications where type = 'reaction' and payload -> 'data' ->> 'match_id' = :'m3'),
          1, 'an unclaimed player gets nothing, the claimed one does');

-- 3 hours after a push went, the next reaction goes at once
select core.take_push_batch(500) is not null as x16 \gset
insert into core.reactions (user_id, match_id, reaction_key) values (:'r1'::uuid, :'m2'::uuid, 'stroll');
select core.reaction_notify(:'m2'::uuid, :'r1'::uuid, now() + interval '3 hours 1 minute') as x17 \gset
select is((pg_temp.last(:'a'::uuid, :'m2'::uuid)).scheduled_at, now() + interval '3 hours 1 minute', 'after the window a new push is due at once');

select * from finish();
rollback;
