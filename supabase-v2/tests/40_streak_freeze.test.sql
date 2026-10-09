-- σερί and freezes: correct votes in a row, wrong resets unless a freeze absorbs it,
-- first free freeze at σερί 3, then one every 15 votes, max 2 held.
begin;
select plan(38);

-- ---------------------------------------------------------------------------
-- u1: build to 3, absorb one wrong with the free freeze, break, restart
-- ---------------------------------------------------------------------------
select tests.create_user('sf-1@test.local') as u1 \gset
select tests.play(:'u1'::uuid, true) is not null as p \gset
select is((select streak from tests.state(:'u1'::uuid)), 1, 'u1: 1 correct -> σερί 1');
select is((select total_points from tests.state(:'u1'::uuid)), 10, 'u1: first correct is +10');
select tests.play(:'u1'::uuid, true) is not null as p \gset
select is((select total_points from tests.state(:'u1'::uuid)), 25, 'u1: second correct in a row is +10 plus the +5 chain bonus');
select is(tests.unused_freezes(:'u1'::uuid), 0, 'u1: no freeze before σερί 3');
select tests.play(:'u1'::uuid, true) is not null as p \gset
select is((select streak from tests.state(:'u1'::uuid)), 3, 'u1: σερί 3');
select is(tests.unused_freezes(:'u1'::uuid), 1, 'u1: the first free freeze arrives at σερί 3');
select is((select kind || '/' || source from core.freezes where user_id = :'u1'::uuid), 'free/streak3', 'u1: it is a free freeze from streak3');
select is((select first_free_at3_done from tests.state(:'u1'::uuid)), true, 'u1: first-at-3 flag set');
select is((select count(*)::int from core.feed_inbox where user_id = :'u1'::uuid and kind = 'celebration'), 1, 'u1: σερί 3 milestone celebration queued');
select is((select total_points from tests.state(:'u1'::uuid)), 40, 'u1: 10 + 15 + 15 points');

select tests.play(:'u1'::uuid, false) as wrong1 \gset
select is((select streak from tests.state(:'u1'::uuid)), 3, 'u1: a wrong vote with a freeze keeps σερί 3');
select is((select chain from tests.state(:'u1'::uuid)), 3, 'u1: a free freeze keeps the +5 chain too');
select is(tests.unused_freezes(:'u1'::uuid), 0, 'u1: the freeze was consumed');
select is((select count(*)::int from core.streak_events where user_id = :'u1'::uuid and kind = 'freeze_used'), 1, 'u1: freeze_used event logged');
select is((select (payload ->> 'freeze_used')::boolean from core.feed_inbox where user_id = :'u1'::uuid and kind = 'result' and ref = 'match:' || :'wrong1'),
          true, 'u1: the result card says the freeze saved the σερί');
select is((select total_points from tests.state(:'u1'::uuid)), 40, 'u1: a saved wrong vote earns nothing');

select tests.play(:'u1'::uuid, false) is not null as p \gset
select is((select streak from tests.state(:'u1'::uuid)), 0, 'u1: next wrong vote, no freeze: σερί resets to 0');
select is((select streak_best from tests.state(:'u1'::uuid)), 3, 'u1: personal record (ΠΡ) stays 3');
select is((select chain from tests.state(:'u1'::uuid)), 0, 'u1: chain reset');
select isnt((select broke_at from tests.state(:'u1'::uuid)), null, 'u1: broke_at recorded');
select tests.play(:'u1'::uuid, true) is not null as p \gset
select is((select streak from tests.state(:'u1'::uuid)), 1, 'u1: restarts at 1');
select is((select total_points from tests.state(:'u1'::uuid)), 50, 'u1: after a break the next correct is plain +10 (no chain bonus)');
select is(tests.unused_freezes(:'u1'::uuid), 0, 'u1: the first-at-3 freeze is only given once');

-- ---------------------------------------------------------------------------
-- u2: a paid freeze keeps the number only, the chain restarts from zero
-- ---------------------------------------------------------------------------
select tests.create_user('sf-2@test.local') as u2 \gset
select tests.play(:'u2'::uuid, true) is not null as p \gset
select tests.play(:'u2'::uuid, true) is not null as p \gset
insert into core.freezes (user_id, kind, source) values (:'u2'::uuid, 'paid', 'purchase');
select tests.play(:'u2'::uuid, false) is not null as p \gset
select is((select streak from tests.state(:'u2'::uuid)), 2, 'u2: paid freeze keeps the σερί number');
select is((select chain from tests.state(:'u2'::uuid)), 0, 'u2: paid freeze restarts the chain');
select tests.play(:'u2'::uuid, true) is not null as p \gset
select is((select streak from tests.state(:'u2'::uuid)), 3, 'u2: σερί continues to 3');
select is((select total_points from tests.state(:'u2'::uuid)), 10 + 15 + 10, 'u2: no chain bonus right after the restart (10 + 15 + 10)');

-- ---------------------------------------------------------------------------
-- u3: with a free and a paid freeze, the free one is used first
-- ---------------------------------------------------------------------------
select tests.create_user('sf-3@test.local') as u3 \gset
insert into core.freezes (user_id, kind, source, acquired_at) values
  (:'u3'::uuid, 'paid', 'purchase', now() - interval '1 day'), (:'u3'::uuid, 'free', 'gift', now());
select tests.play(:'u3'::uuid, false) is not null as p \gset
select is((select kind from core.freezes where user_id = :'u3'::uuid and used_at is null), 'paid', 'u3: the free freeze was consumed first, the paid one is kept');

-- ---------------------------------------------------------------------------
-- cap: never more than 2 unused freezes
-- ---------------------------------------------------------------------------
insert into core.freezes (user_id, kind, source) values (:'u3'::uuid, 'free', 'gift');
select throws_like($$insert into core.freezes (user_id, kind, source) values ('$$ || :'u3' || $$', 'free', 'gift')$$, 'freeze_cap%', 'a third unused freeze is refused');

-- ---------------------------------------------------------------------------
-- u4: one free freeze every 15 votes cast (counted as they resolve), held back at the cap
-- ---------------------------------------------------------------------------
select tests.create_user('sf-4@test.local') as u4 \gset
select tests.play(:'u4'::uuid, true) is not null as p from generate_series(1, 14);
select is((select votes_since_free_freeze from tests.state(:'u4'::uuid)), 14, 'u4: 14 votes counted toward the next free freeze');
select is(tests.unused_freezes(:'u4'::uuid), 1, 'u4: only the σερί-3 freeze so far');
select tests.play(:'u4'::uuid, true) is not null as p \gset
select is(tests.unused_freezes(:'u4'::uuid), 2, 'u4: the 15th vote grants a free freeze (2 held)');
select is((select votes_since_free_freeze from tests.state(:'u4'::uuid)), 0, 'u4: counter reset after the grant');
select is((select count(*)::int from core.freezes where user_id = :'u4'::uuid and source = 'every15'), 1, 'u4: granted with source every15');
select tests.play(:'u4'::uuid, true) is not null as p from generate_series(1, 15);
select is(tests.unused_freezes(:'u4'::uuid), 2, 'u4: at the cap of 2 nothing more is granted');
select is((select votes_since_free_freeze from tests.state(:'u4'::uuid)), 15, 'u4: the counter waits at 15 while the user holds 2');
select tests.play(:'u4'::uuid, false) is not null as p \gset
select is((select streak from tests.state(:'u4'::uuid)), 30, 'u4: the wrong vote used a freeze (σερί kept at 30)') ;
select is(tests.unused_freezes(:'u4'::uuid), 2, 'u4: a freed slot is refilled at once (1 used, 1 granted)');

select * from finish();
rollback;
