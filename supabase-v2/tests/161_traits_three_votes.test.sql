-- «Πώς παίζει»: three votes at most per person per player; taking one back frees a place; your own phrase counts.
begin;
select plan(7);

select tests.create_user('tv-n@test.local') as n \gset
select tests.mk_player('Δέλτα', 'Τριψήφιος') as pb \gset
select tests.mk_player('Έψιλον', 'Άλλος') as pc \gset
select array_agg(id order by label_en) as ids from (select id, label_en from core.trait_defs where status = 'approved' and sport_id = 'tennis' order by label_en limit 4) x \gset

select tests.login(:'n'::uuid);
select api.vote_trait(:'pb'::uuid, (:'ids'::uuid[])[1], true) is not null as v1 \gset
select api.vote_trait(:'pb'::uuid, (:'ids'::uuid[])[2], true) is not null as v2 \gset
select is((api.vote_trait(:'pb'::uuid, (:'ids'::uuid[])[3], true) ->> 'my_votes')::int, 3, 'three votes, counted');
select is((api.get_traits(:'pb'::uuid) ->> 'max_votes')::int, 3, 'the limit is three');
select throws_ok(format($$select api.vote_trait(%L, %L)$$, :'pb', (:'ids'::uuid[])[4]), '54000', 'too_many_votes', 'a fourth is refused');
select throws_ok(format($$select api.suggest_trait(%L, 'Τέταρτο δικό μου')$$, :'pb'), '54000', 'too_many_votes', 'so is a phrase of your own');
select is((select count(*)::int from core.trait_defs where label_en = 'Τέταρτο δικό μου'), 0, 'and no phrase is left behind');
select api.vote_trait(:'pb'::uuid, (:'ids'::uuid[])[1], false) is not null as off1 \gset
select is((api.vote_trait(:'pb'::uuid, (:'ids'::uuid[])[4], true) ->> 'my_votes')::int, 3, 'taking one back frees a place');
select is((api.vote_trait(:'pc'::uuid, (:'ids'::uuid[])[1], true) ->> 'my_votes')::int, 1, 'another player has their own three');
select tests.logout();

select * from finish();
rollback;
