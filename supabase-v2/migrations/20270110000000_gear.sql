-- Gear for the ball people (founder, 15 Oct 2026: "a bunch of cosmetics nicely styled that can be wore or applied";
-- the mix: one free item for everyone, the lime headband earned, the rest 0.99). One gear item is worn at a time, on
-- the head or the eyes. The confetti win effect, in the catalogue since M3 but never offered, can now be worn too.
-- Money never buys advantage: all of this is looks only.

alter table core.cosmetic_items drop constraint cosmetic_items_category_check;
alter table core.cosmetic_items add constraint cosmetic_items_category_check
  check (category in ('frame', 'background', 'kit', 'gear', 'win_effect'));
alter table core.user_equipped drop constraint user_equipped_category_check;
alter table core.user_equipped add constraint user_equipped_category_check
  check (category in ('frame', 'background', 'kit', 'gear', 'win_effect'));

insert into core.cosmetic_items (category, key, name_el, name_en, kind, price_eur, earn_rule_text) values
('gear', 'gear_cap',      'Καπέλο',        'Cap',         'free',   null, null),
('gear', 'gear_headband', 'Κορδέλα',       'Headband',    'earned', null, 'Την κερδίζεις με 5 σωστές στη σειρά'),
('gear', 'gear_visor',    'Γείσο',         'Visor',       'buy',    0.99, null),
('gear', 'gear_shades',   'Γυαλιά ηλίου',  'Sunglasses',  'buy',    0.99, null),
('gear', 'gear_bandana',  'Μπαντάνα',      'Bandana',     'buy',    0.99, null),
('gear', 'gear_bucket',   'Καπέλο ψαρά',   'Bucket hat',  'buy',    0.99, null)
on conflict (key) do nothing;

create or replace function core.reward_milestone()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_n      int := (new.payload ->> 'streak')::int;
  v_freeze boolean := false;
  v_frame  text;
  v_key    text := case v_n when 7 then 'frame_seven' when 10 then 'frame_ten' end;
  v_n_ins  int;
  v_gear   text;
begin
  if new.kind <> 'celebration' or new.payload ->> 'type' <> 'streak_milestone' then return new; end if;
  if v_n = 3 then
    -- the resolver grants it on the same vote, just before
    v_freeze := exists (select 1 from core.streak_events e join core.freezes f on f.id = e.freeze_id
                         where e.user_id = new.user_id and e.kind = 'freeze_earned' and f.source = 'streak3'
                           and e.vote_id = (select id from core.votes where user_id = new.user_id and subject_type = 'match'
                                               and subject_id = (new.payload ->> 'match_id')::uuid));
  end if;
  if v_key is not null then
    insert into core.user_cosmetics (user_id, item_id, source)
    select new.user_id, id, 'earned' from core.cosmetic_items where key = v_key
    on conflict do nothing;
    get diagnostics v_n_ins = row_count;
    if v_n_ins > 0 then v_frame := v_key; end if;
  end if;
  -- 5 in a row: the lime headband (lime is earned, never bought)
  if v_n = 5 then
    insert into core.user_cosmetics (user_id, item_id, source)
    select new.user_id, id, 'earned' from core.cosmetic_items where key = 'gear_headband'
    on conflict do nothing;
    get diagnostics v_n_ins = row_count;
    if v_n_ins > 0 then v_gear := 'gear_headband'; end if;
  end if;
  new.payload := new.payload || jsonb_build_object('reward', jsonb_build_object('freeze', v_freeze, 'frame', v_frame, 'gear', v_gear));
  return new;
end;
$$;

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
             order by case c.category when 'frame' then 1 when 'background' then 2 when 'kit' then 3 when 'gear' then 4 else 5 end,
                      case c.kind when 'free' then 1 when 'earned' then 2 else 3 end, c.price_eur nulls first, c.key)
        from core.cosmetic_items c
        left join core.user_cosmetics uc on uc.user_id = v_uid and uc.item_id = c.id
        left join core.user_equipped e on e.user_id = v_uid and e.item_id = c.id
       where c.active and c.category in ('frame', 'background', 'kit', 'gear', 'win_effect')), '[]'::jsonb),
    'equipped', jsonb_build_object(
      'frame',      (select c.key from core.user_equipped e join core.cosmetic_items c on c.id = e.item_id where e.user_id = v_uid and e.category = 'frame'),
      'background', (select c.key from core.user_equipped e join core.cosmetic_items c on c.id = e.item_id where e.user_id = v_uid and e.category = 'background'),
      'kit',        coalesce((select c.key from core.user_equipped e join core.cosmetic_items c on c.id = e.item_id where e.user_id = v_uid and e.category = 'kit'), 'kit_green'),
      'gear',       (select c.key from core.user_equipped e join core.cosmetic_items c on c.id = e.item_id where e.user_id = v_uid and e.category = 'gear'),
      'win_effect', (select c.key from core.user_equipped e join core.cosmetic_items c on c.id = e.item_id where e.user_id = v_uid and e.category = 'win_effect')));
end;
$$;

create or replace function api.equip_item(p_category text, p_key text)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  c     core.cosmetic_items;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_category is null or p_category not in ('frame', 'background', 'kit', 'gear', 'win_effect') then
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
