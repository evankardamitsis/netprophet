-- Kits are mostly bought: only Πράσινο is free, and someone already wearing Λευκό or Μαύρο kept it.
begin;
select plan(3);

select is((select count(*)::int from core.cosmetic_items where category = 'kit' and kind = 'free' and active), 1, 'one free kit');
select is((select key from core.cosmetic_items where category = 'kit' and kind = 'free' and active), 'kit_green', 'and it is Πράσινο');
select is((select count(*)::int from core.cosmetic_items where key in ('kit_white', 'kit_black') and kind = 'buy' and price_eur = 0.99), 2,
          'Λευκό and Μαύρο cost 0,99');

select * from finish();
rollback;
