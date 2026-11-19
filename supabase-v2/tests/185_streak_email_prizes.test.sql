-- The σερί emails' prizes (founder, 19 Nov 2026): unused Ασφάλειες and the next Frame, only when not owned.
begin;
select plan(5);

select tests.create_user('sp-a@example.com') as a \gset
select is(core.streak_freezes_left(:'a'::uuid), 0, 'no Ασφάλεια yet');
select core.grant_freeze(:'a'::uuid, 'paid', 'purchase', 2);
select is(core.streak_freezes_left(:'a'::uuid), 1, 'one unused');
select is(core.streak_next_frame(:'a'::uuid, 7), 'frame_seven', 'day 7 gives Frame Επτά');
select is(core.streak_next_frame(:'a'::uuid, 8), null, 'day 8 gives no Frame');
insert into core.user_cosmetics (user_id, item_id, source)
select :'a'::uuid, c.id, 'earned' from core.cosmetic_items c where c.key = 'frame_seven';
select is(core.streak_next_frame(:'a'::uuid, 7), null, 'no Frame promised when it is already owned');

select * from finish();
rollback;
