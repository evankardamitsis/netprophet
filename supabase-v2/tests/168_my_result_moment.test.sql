-- The Pro player's result screen: once per match, win or loss with its numbers, nothing for free or for a walkover, a
-- correction updates an unseen one and never replays a seen one, a removed match drops it.
begin;
select plan(13);

select tests.create_user('mr-pro@test.local') as pro \gset
select tests.create_user('mr-free@test.local') as free \gset
select tests.mk_player('Νίκος', 'Βλάχος') as p1 \gset
select tests.mk_player('Πέτρος', 'Παππάς') as p2 \gset
update core.players set claimed_by_user_id = :'pro'::uuid where id = :'p1'::uuid;
update core.players set claimed_by_user_id = :'free'::uuid where id = :'p2'::uuid;
create or replace function core.is_pro(p uuid) returns boolean language sql as $$
  select exists (select 1 from auth.users u where u.id = p and u.email = 'mr-pro@test.local')
$$;

create or replace function pg_temp.m() returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into core.matches (sport_id, format, status, starts_at, source, approved)
  values ('tennis', 'singles', 'confirmed', now() - interval '1 hour' + (random() * interval '1 minute'), 'import', true) returning id into v;
  insert into core.match_participants (match_id, player_id, side, position)
  select v, player_id, side, 1 from (values (current_setting('t.p1')::uuid, 1::smallint), (current_setting('t.p2')::uuid, 2::smallint)) x(player_id, side);
  return v;
end $$;
select set_config('t.p1', :'p1', false), set_config('t.p2', :'p2', false);
create or replace function pg_temp.res(p_m uuid, p_w int, p_walkover boolean default false) returns void language sql as $$
  insert into core.match_results (match_id, winner_side, sets, sets_won, sets_lost, walkover)
  values (p_m, p_w, '[{"w": 6, "l": 4}, {"w": 6, "l": 2}]', 2, 0, p_walkover)
$$;
create or replace function pg_temp.inbox(p_u uuid, p_m uuid) returns core.feed_inbox language sql as $$
  select * from core.feed_inbox where user_id = p_u and kind = 'celebration' and ref = 'my_result:' || p_m
$$;

select pg_temp.m() as a \gset
select pg_temp.res(:'a'::uuid, 1);
select is((pg_temp.inbox(:'pro'::uuid, :'a'::uuid)).payload ->> 'win', 'true', 'a win queues a screen for the Pro player');
select is((pg_temp.inbox(:'pro'::uuid, :'a'::uuid)).payload ->> 'score', '6-4 6-2', 'with the score');
select is((pg_temp.inbox(:'pro'::uuid, :'a'::uuid)).payload ->> 'opponent', 'τον Π. Παππά', 'and who against');
select is((pg_temp.inbox(:'free'::uuid, :'a'::uuid)).id, null, 'nothing for a free player');

select pg_temp.m() as b \gset
select pg_temp.res(:'b'::uuid, 2);
select is((pg_temp.inbox(:'pro'::uuid, :'b'::uuid)).payload ->> 'win', 'false', 'a loss queues the other screen');
select is((pg_temp.inbox(:'pro'::uuid, :'b'::uuid)).payload ->> 'year_losses', '1', 'the year counts it');
select is((pg_temp.inbox(:'pro'::uuid, :'b'::uuid)).payload ->> 'h2h_wins', '1', 'the record between you');

select pg_temp.m() as w \gset
select pg_temp.res(:'w'::uuid, 1, true);
select is((pg_temp.inbox(:'pro'::uuid, :'w'::uuid)).id, null, 'a walkover has no screen');

-- a correction: an unseen screen follows it, a seen one stays gone
update core.match_results set winner_side = 2 where match_id = :'a'::uuid;
select is((pg_temp.inbox(:'pro'::uuid, :'a'::uuid)).payload ->> 'win', 'false', 'a correction updates a screen not yet seen');
update core.feed_inbox set seen_at = now() where user_id = :'pro'::uuid and ref = 'my_result:' || :'a';
update core.match_results set winner_side = 1 where match_id = :'a'::uuid;
select ok((pg_temp.inbox(:'pro'::uuid, :'a'::uuid)).seen_at is not null, 'a seen one never replays');

-- in review: only once approved
insert into core.matches (sport_id, format, status, starts_at, source, approved)
values ('tennis', 'singles', 'confirmed', now() - interval '2 hours', 'user', false) returning id as r \gset
insert into core.match_participants (match_id, player_id, side, position) values (:'r'::uuid, :'p1'::uuid, 1, 1), (:'r'::uuid, :'p2'::uuid, 2, 1);
select pg_temp.res(:'r'::uuid, 1);
select is((pg_temp.inbox(:'pro'::uuid, :'r'::uuid)).id, null, 'a match in review waits');
update core.matches set approved = true where id = :'r'::uuid;
select ok((pg_temp.inbox(:'pro'::uuid, :'r'::uuid)).id is not null, 'and queues when approved');

-- a removed match
update core.matches set status = 'void' where id = :'b'::uuid;
select is((pg_temp.inbox(:'pro'::uuid, :'b'::uuid)).id, null, 'a removed match drops its screen');

select * from finish();
rollback;
