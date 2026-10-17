-- The Baller wardrobe (founder, 17 Oct 2026: "yes add new gear and kits"). Seven new things for the dressing room,
-- looks only, never an advantage: headphones and a beanie (0.99), four kits (0.99), and a lime crown that is earned,
-- never sold: first in your Ladder group with points when the month closes. league_close is the M3 one with the crown.

insert into core.cosmetic_items (category, key, name_el, name_en, kind, price_eur, earn_rule_text) values
('gear', 'gear_phones', 'Ακουστικά',          'Headphones',     'buy',    0.99, null),
('gear', 'gear_beanie', 'Σκουφί',             'Beanie',         'buy',    0.99, null),
('gear', 'gear_crown',  'Στέμμα',             'Crown',          'earned', null, 'Το κερδίζεις πρώτος στον όμιλό σου για έναν μήνα'),
('kit',  'kit_retro',   'Σετ Ρετρό',          'Retro set',      'buy',    0.99, null),
('kit',  'kit_ocean',   'Σετ Θάλασσα',        'Ocean set',      'buy',    0.99, null),
('kit',  'kit_sunset',  'Σετ Ηλιοβασίλεμα',   'Sunset set',     'buy',    0.99, null),
('kit',  'kit_hard',    'Σετ Σκληρό',         'Hard court set', 'buy',    0.99, null)
on conflict (key) do nothing;

create or replace function core.league_close(p_league uuid)
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_l     core.leagues;
  v_res   jsonb;
  r       jsonb;
  v_pts   int;
  v_n     int := 0;
begin
  select * into v_l from core.leagues where id = p_league for update;
  if v_l.id is null or v_l.closed_at is not null then return 0; end if;

  v_res := core.league_close_group((
    select coalesce(jsonb_agg(jsonb_build_object('userId', m.user_id, 'points', coalesce(p.points, 0),
                                                 'lastPointAt', p.last_at, 'league', v_l.tier, 'groupId', v_l.id)), '[]'::jsonb)
      from core.league_members m
      left join (select user_id, sum(delta)::int as points, max(created_at) as last_at
                   from core.points_ledger where month_key = v_l.month_key group by user_id) p on p.user_id = m.user_id
     where m.league_id = v_l.id));

  for r in select value from jsonb_array_elements(v_res) loop
    v_pts := coalesce((select sum(delta)::int from core.points_ledger
                        where user_id = (r ->> 'userId')::uuid and month_key = v_l.month_key), 0);
    update core.league_members
       set final_rank = (r ->> 'position')::int, final_points = v_pts,
           outcome = case r ->> 'movement' when 'promote' then 'promoted' when 'relegate' then 'relegated' else 'stayed' end
     where league_id = v_l.id and user_id = (r ->> 'userId')::uuid;
    -- first in the group with points: the lime crown (founder, 17 Oct), earned, never sold
    if (r ->> 'position')::int = 1 and v_pts > 0 then
      insert into core.user_cosmetics (user_id, item_id, source)
      select (r ->> 'userId')::uuid, id, 'earned' from core.cosmetic_items where key = 'gear_crown'
      on conflict do nothing;
    end if;
    if (r ->> 'topThreeAward')::boolean then
      insert into core.user_cosmetics (user_id, item_id, source)
      select (r ->> 'userId')::uuid, id, 'earned' from core.cosmetic_items where key = 'frame_month_top'
      on conflict do nothing;
    end if;
    if v_pts > 0 then
      insert into core.feed_inbox (user_id, kind, ref, payload)
      values ((r ->> 'userId')::uuid, 'celebration', 'league:' || v_l.id,
              jsonb_build_object('type', 'league', 'month', v_l.month_key, 'tier', v_l.tier,
                                 'position', (r ->> 'position')::int, 'movement', r ->> 'movement',
                                 'next_tier', r ->> 'nextLeague', 'award', (r ->> 'topThreeAward')::boolean))
      on conflict (user_id, kind, ref) do nothing;
    end if;
    v_n := v_n + 1;
  end loop;
  update core.leagues set closed_at = now() where id = v_l.id;
  -- the top 3 count towards «Κορυφαίος του μήνα»
  perform core.badges_refresh((x ->> 'userId')::uuid) from jsonb_array_elements(v_res) x;
  return v_n;
end;
$$;

revoke all on function core.league_close(uuid) from public;
