-- Demo data: real roster names in upcoming matches and recent results, all removable again.
begin;
select plan(7);

select tests.create_user('dm-adm@test.local', 'admin') as adm \gset
select tests.create_user('dm-u@test.local') as u \gset
insert into core.player_sports (player_id, sport_id, initial_level)
select tests.mk_player('Δέμο' || g, 'Παίκτης' || g), 'tennis', 3 + (g % 5) * 0.5 from generate_series(1, 20) g;

select tests.login(:'u'::uuid);
select throws_ok($$select api.admin_demo(true)$$, '42501', null, 'only staff');
select tests.login(:'adm'::uuid);
select is((api.admin_demo(true) ->> 'upcoming')::int, 16, 'sixteen matches coming up');
select tests.logout();
select is((select count(*)::int from core.matches m join core.match_results r on r.match_id = m.id where m.provenance ? 'demo'), 14,
          'fourteen results from the last week');
select ok((select bool_and(starts_at > now()) from core.matches m where provenance ? 'demo' and not exists (select 1 from core.match_results r where r.match_id = m.id)),
          'the upcoming ones are all still ahead');
select is(core.seed_demo_sponsored(true), 5, 'five demo sponsored cards');
select ok((select bool_and(art is not null) from core.sponsored_cards where category = 'demo'), 'every demo ad has art');
select core.seed_demo(false) is not null as x \gset
select is((select count(*)::int from core.matches where provenance ? 'demo'), 0, 'and it all goes away');

select * from finish();
rollback;
