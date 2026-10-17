-- Kits are mostly bought (founder, 17 Oct 2026: "ρούχα και ρακέτα: most should be bought, not free"). Πράσινο stays
-- the free kit everyone starts in; Λευκό and Μαύρο become 0.99 like the other sets. Looks only, never an advantage.
-- Anyone already wearing one of them keeps it: it is theirs from the migration.

insert into core.user_cosmetics (user_id, item_id, source)
select e.user_id, e.item_id, 'migration'
  from core.user_equipped e
  join core.cosmetic_items c on c.id = e.item_id
 where c.key in ('kit_white', 'kit_black')
on conflict do nothing;

update core.cosmetic_items set kind = 'buy', price_eur = 0.99 where key in ('kit_white', 'kit_black');
