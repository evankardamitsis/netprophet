-- M3 part 2: celebrations. The resolver already queues one feed_inbox 'celebration' per σερί milestone (3, 5, 7,
-- 10) and grants the first free freeze at σερί 3. Here the rewards from product-spec section 3 land with the
-- milestone and the celebration says what was actually given:
--   3: the free freeze the resolver granted (first time only); 5: nothing; 7: Frame «Επτά»; 10: Frame «Δέκα».
--   No extra freeze at 10: freezes stay with the core rules (σερί 3 once, then one every 15 votes), which the spec's
--   «free freeze path» refers to. A frame is given once; a later milestone shows only what it gave.
-- get_feed now also returns the unseen celebrations; the app plays them after the result cards and marks them seen.

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
  new.payload := new.payload || jsonb_build_object('reward', jsonb_build_object('freeze', v_freeze, 'frame', v_frame));
  return new;
end;
$$;
create trigger feed_inbox_reward_milestone before insert on core.feed_inbox
  for each row execute function core.reward_milestone();

-- the feed also hands over the celebrations
create or replace function api.get_feed(p_limit int default 20)
returns jsonb
language plpgsql security definer stable set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_sport   text;
  v_area    text;
  v_claimed uuid;
  v_limit   int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_content jsonb;
  v_ads     jsonb;
  v_ad_n    int;
  v_out     jsonb := '[]'::jsonb;
  v_el      jsonb;
  v_i       int := 0;
  v_offset  int := extract(doy from core.athens_day())::int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select primary_sport, area_id, claimed_player_id into v_sport, v_area, v_claimed
    from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;

  v_content := coalesce((
    select jsonb_agg(jsonb_build_object('kind', 'result', 'id', i.id, 'created_at', i.created_at, 'payload', i.payload)
                     order by i.created_at)
      from (select * from core.feed_inbox
             where user_id = v_uid and kind = 'result' and seen_at is null
             order by created_at limit v_limit) i), '[]'::jsonb);

  v_content := v_content || coalesce((
    select jsonb_agg(q.card order by q.voted, q.not_circle, q.starts_at nulls last, q.id)
      from (
        select m.id, m.starts_at, (mv.id is not null) as voted, not c.in_circle as not_circle,
               jsonb_build_object(
                 'kind', 'match', 'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
                 'venue', m.venue, 'round', m.round, 'status', m.status,
                 'tournament', case when t.id is not null then jsonb_build_object('id', t.id, 'name', t.name) end,
                 'sides', core.match_sides_json(m.id),
                 'in_circle', c.in_circle,
                 'my_vote', mv.option,
                 'split', case when mv.id is not null then core.vote_split(m.id) end) as card
          from core.matches m
          left join core.votes mv on mv.user_id = v_uid and mv.subject_type = 'match' and mv.subject_id = m.id
          left join core.tournaments t on t.id = m.tournament_id
          cross join lateral (
            select exists (select 1 from core.match_participants mp
                             join core.follows f on f.player_id = mp.player_id and f.user_id = v_uid
                            where mp.match_id = m.id) as in_circle) c
         where m.sport_id = v_sport and m.approved and core.match_is_open(m)
           and not exists (select 1 from core.match_participants mp
                             join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and (p.hidden or p.is_minor or mp.player_id = v_claimed))
           and not core.is_blocked(v_uid, m.logged_by)
         order by (mv.id is not null), c.in_circle desc, m.starts_at nulls last, m.id
         limit v_limit) q), '[]'::jsonb);

  select coalesce(jsonb_agg(jsonb_build_object('kind', 'sponsored', 'id', s.id, 'label', 'Χορηγούμενο',
                                               'sponsor', s.sponsor, 'title', s.title, 'subtitle', s.subtitle,
                                               'cta_url', s.cta_url) order by s.weight desc, s.id), '[]'::jsonb)
    into v_ads
    from core.sponsored_cards s
   where s.status = 'active' and s.placement = 'feed'
     and (s.starts_at is null or s.starts_at <= now()) and (s.ends_at is null or s.ends_at > now())
     and (cardinality(s.area_ids) = 0 or v_area = any (s.area_ids));
  v_ad_n := jsonb_array_length(v_ads);

  for v_el in select * from jsonb_array_elements(v_content) loop
    v_out := v_out || jsonb_build_array(v_el);
    v_i := v_i + 1;
    if v_ad_n > 0 and v_i % 4 = 0 then
      v_out := v_out || jsonb_build_array(v_ads -> (((v_i / 4) - 1 + v_offset) % v_ad_n));
    end if;
  end loop;

  return jsonb_build_object('items', v_out, 'count', jsonb_array_length(v_out),
    -- celebrations wait for the result cards, then play one by one (prototype celOn)
    'celebrations', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'created_at', i.created_at, 'payload', i.payload)
                                               order by i.created_at)
                                from core.feed_inbox i
                               where i.user_id = v_uid and i.kind = 'celebration' and i.seen_at is null), '[]'::jsonb));
end;
$$;
