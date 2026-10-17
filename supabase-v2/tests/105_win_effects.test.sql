-- More cheers: six win effects listed, each bought before it is worn, then worn.
begin;
select plan(4);

select tests.create_user('fx-u@test.local') as u \gset
select tests.login(:'u'::uuid);

select is((select count(*)::int from jsonb_array_elements(api.get_look() -> 'items') i where i ->> 'category' = 'win_effect'), 6,
          'six win effects listed: the confetti and five more');
select throws_ok($$select api.equip_item('win_effect', 'fx_fireworks')$$, '42501', 'not_owned', 'the fireworks are bought before they go off');
select tests.logout();

insert into core.user_cosmetics (user_id, item_id, source)
select :'u'::uuid, id, 'bought' from core.cosmetic_items where key = 'fx_trophy';
select tests.login(:'u'::uuid);
select is(api.equip_item('win_effect', 'fx_trophy') -> 'equipped' ->> 'win_effect', 'fx_trophy', 'an owned trophy is worn');
select tests.logout();
select is((select count(*)::int from core.cosmetic_items where category = 'win_effect' and kind = 'buy' and price_eur is not null), 6,
          'every win effect is a look you buy, never earned with points');

select * from finish();
rollback;
