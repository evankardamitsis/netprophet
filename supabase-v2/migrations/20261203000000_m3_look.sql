-- M3 part 9: Εγώ «Εμφάνιση» and the stats side of the card. The cosmetics catalogue now matches the prototype's
-- (frames, backgrounds, kits), you can put on what you own (earned, free or bought), and the card turns over to
-- show your level in detail (the value itself is Pro, as everywhere). There is no 3D avatar yet (founder): the app
-- draws frames and backgrounds on the Εγώ card in 2D from the prototype's styles, keyed by item. Buying waits for the
-- payment provider (M5): bought items show their price and nothing pretends to sell. Style only: nothing here
-- touches level, votes, points or the Ladder.

-- ---------------------------------------------------------------------------
-- The catalogue, as in the prototype
-- ---------------------------------------------------------------------------
update core.cosmetic_items set name_el = 'Χρυσό', name_en = 'Gold' where key = 'frame_gold';
update core.cosmetic_items set active = false where key = 'bg_court';   -- not in the prototype
insert into core.cosmetic_items (category, key, name_el, name_en, kind, price_eur, earn_rule_text) values
('frame',      'frame_retro',  'Ρετρό',              'Retro',              'buy',    1.99, null),
('frame',      'frame_grass',  'Γρασίδι',            'Grass',              'buy',    1.99, null),
('background', 'bg_hard',      'Σκληρό γήπεδο',      'Hard court',         'buy',    0.99, null),
('background', 'bg_indoor',    'Κλειστό γήπεδο',     'Indoor court',       'buy',    0.99, null),
('background', 'bg_center',    'Κεντρικό γήπεδο',    'Centre court',       'buy',    0.99, null),
('kit',        'kit_grass',    'Σετ Γρασίδι',        'Grass set',          'pack',   1.99, null),
('kit',        'kit_clay',     'Σετ Χώμα',           'Clay set',           'pack',   1.99, null),
('kit',        'kit_night',    'Σετ Βραδινό ματς',   'Night match set',    'earned', null, 'Το κερδίζεις με το badge Μάντης του κλαμπ')
on conflict (key) do nothing;
-- the prototype's earn lines
update core.cosmetic_items set earn_rule_text = 'Το κερδίζεις με 7 σωστές στη σειρά' where key = 'frame_seven';
update core.cosmetic_items set earn_rule_text = 'Το κερδίζεις με 10 σωστές στη σειρά' where key = 'frame_ten';
update core.cosmetic_items set earn_rule_text = 'Το κερδίζεις με ένα badge σε χρυσή βαθμίδα' where key = 'frame_level';
update core.cosmetic_items set earn_rule_text = 'Το κερδίζεις στην πρώτη τριάδα της Κατάταξης' where key = 'frame_month_top';
update core.cosmetic_items set earn_rule_text = 'Το κερδίζεις με την εβδομαδιαία αποστολή' where key in ('frame_week', 'bg_grass');
update core.cosmetic_items set earn_rule_text = 'Το κερδίζεις με μια αποστολή' where key in ('bg_night', 'bg_clay');
update core.cosmetic_items set earn_rule_text = 'Το κερδίζεις όταν φέρεις έναν φίλο' where key = 'frame_friends';

-- «Μάντης του κλαμπ» (first tier) gives the night set
create or replace function core.look_on_badge()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if new.badge_key = 'club_oracle' and new.tier >= 1 then
    insert into core.user_cosmetics (user_id, item_id, source)
    select new.user_id, id, 'earned' from core.cosmetic_items where key = 'kit_night'
    on conflict do nothing;
  end if;
  return null;
end;
$$;
create trigger look_on_badge after insert or update of tier on core.user_badges
  for each row execute function core.look_on_badge();
insert into core.user_cosmetics (user_id, item_id, source)
select b.user_id, c.id, 'earned' from core.user_badges b, core.cosmetic_items c
 where b.badge_key = 'club_oracle' and b.tier >= 1 and c.key = 'kit_night'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- API
-- ---------------------------------------------------------------------------
-- «Εμφάνιση»: every active item with what it is to me, and what I wear
create or replace function api.get_look()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'key', c.key, 'category', c.category, 'name_el', c.name_el, 'name_en', c.name_en, 'kind', c.kind,
               'price_eur', c.price_eur, 'earn_rule', c.earn_rule_text,
               'owned', c.kind = 'free' or uc.item_id is not null, 'source', uc.source,
               'equipped', e.item_id is not null)
             order by case c.category when 'frame' then 1 when 'background' then 2 when 'kit' then 3 else 4 end,
                      case c.kind when 'free' then 1 when 'earned' then 2 else 3 end, c.price_eur nulls first, c.key)
        from core.cosmetic_items c
        left join core.user_cosmetics uc on uc.user_id = v_uid and uc.item_id = c.id
        left join core.user_equipped e on e.user_id = v_uid and e.item_id = c.id
       where c.active and c.category in ('frame', 'background', 'kit')), '[]'::jsonb),
    'equipped', jsonb_build_object(
      'frame',      (select c.key from core.user_equipped e join core.cosmetic_items c on c.id = e.item_id where e.user_id = v_uid and e.category = 'frame'),
      'background', (select c.key from core.user_equipped e join core.cosmetic_items c on c.id = e.item_id where e.user_id = v_uid and e.category = 'background'),
      'kit',        coalesce((select c.key from core.user_equipped e join core.cosmetic_items c on c.id = e.item_id where e.user_id = v_uid and e.category = 'kit'), 'kit_green')));
end;
$$;
revoke all on function api.get_look() from public, anon;
grant execute on function api.get_look() to authenticated, service_role;

-- «Βάλ’ το»: wear an item I own (free items are everyone's); null takes the frame or background off
create or replace function api.equip_item(p_category text, p_key text)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  c     core.cosmetic_items;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_category is null or p_category not in ('frame', 'background', 'kit') then
    raise exception 'bad_category' using errcode = '22023';
  end if;
  if p_key is null then
    if p_category = 'kit' then raise exception 'kit_required' using errcode = '22023'; end if;
    delete from core.user_equipped where user_id = v_uid and category = p_category;
    return api.get_look();
  end if;
  select * into c from core.cosmetic_items where key = p_key and active;
  if c.id is null or c.category <> p_category then raise exception 'not_found' using errcode = 'P0002'; end if;
  if c.kind <> 'free' and not exists (select 1 from core.user_cosmetics where user_id = v_uid and item_id = c.id) then
    raise exception 'not_owned' using errcode = '42501';
  end if;
  insert into core.user_equipped (user_id, category, item_id) values (v_uid, p_category, c.id)
  on conflict (user_id, category) do update set item_id = excluded.item_id;
  return api.get_look();
end;
$$;
revoke all on function api.equip_item(text, text) from public, anon;
grant execute on function api.equip_item(text, text) to authenticated, service_role;

-- the back of the card: my level in detail (the exact value and the gap to the next half only with Pro)
create or replace function api.get_my_level()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_pro   boolean;
  v_sport text;
  v_me    uuid;
  ps      core.player_sports;
  s       core.level_snapshots;
  v_week  numeric;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  v_pro := core.is_pro(v_uid);
  select claimed_player_id, coalesce(primary_sport, 'tennis') into v_me, v_sport from core.profiles where user_id = v_uid;
  if v_me is null then return jsonb_build_object('claimed', false, 'pro', v_pro); end if;
  select * into ps from core.player_sports where player_id = v_me and sport_id = v_sport;
  select * into s from core.level_snapshots where player_id = v_me and sport_id = v_sport order by computed_at desc limit 1;
  select value into v_week from core.level_snapshots
   where player_id = v_me and sport_id = v_sport and computed_at <= now() - interval '7 days'
   order by computed_at desc limit 1;
  return jsonb_build_object(
    'claimed', true,
    'pro', v_pro,
    'status', ps.level_status,
    'tier', ps.level_tier,
    'direction', ps.level_direction,
    'matches', coalesce((s.inputs ->> 'matches')::int, 0),
    'votes', coalesce((s.inputs ->> 'votes')::int, 0),
    'value', case when v_pro then ps.level_value end,
    'week_ago', case when v_pro then v_week end,
    'to_next', case when v_pro and ps.level_value is not null and ps.level_value < 7
                    then round(floor(ps.level_value * 2 + 1) / 2 - ps.level_value, 2) end,
    'next_tier', case when ps.level_value is not null and ps.level_value < 7 then floor(ps.level_value * 2 + 1) / 2 end);
end;
$$;
revoke all on function api.get_my_level() from public, anon;
grant execute on function api.get_my_level() to authenticated, service_role;
