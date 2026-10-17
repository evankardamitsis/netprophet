-- Gear for the ball people: six items (one free, one earned, four to buy), one worn at a time; the confetti win
-- effect can be worn; nothing you do not own goes on; get_look lists both and says what is worn.
begin;
select plan(9);

select tests.create_user('gear-u@test.local') as u \gset
select tests.login(:'u'::uuid);

select is((select count(*)::int from jsonb_array_elements(api.get_look() -> 'items') i where i ->> 'category' = 'gear'), 9, 'nine gear items listed (six, then the Baller wardrobe adds three)');
select ok((select bool_or(i ->> 'key' = 'fx_confetti') from jsonb_array_elements(api.get_look() -> 'items') i), 'the confetti is listed');
select is(api.get_look() -> 'equipped' -> 'gear', 'null'::jsonb, 'nothing on at first');
select is(api.equip_item('gear', 'gear_cap') -> 'equipped' ->> 'gear', 'gear_cap', 'the free cap goes on');
select throws_ok($$select api.equip_item('gear', 'gear_visor')$$, '42501', 'not_owned', 'a visor not bought stays off');
select throws_ok($$select api.equip_item('gear', 'fx_confetti')$$, 'P0002', 'not_found', 'an item from another category is refused');
select is(api.equip_item('gear', null) -> 'equipped' -> 'gear', 'null'::jsonb, 'taken off');
select throws_ok($$select api.equip_item('win_effect', 'fx_confetti')$$, '42501', 'not_owned', 'the confetti is bought before it is worn');
select tests.logout();
select is((select kind || ':' || coalesce(earn_rule_text, '') from core.cosmetic_items where key = 'gear_headband'),
          'earned:Την κερδίζεις με 5 σωστές στη σειρά', 'the lime headband is earned, never bought');

select * from finish();
rollback;
