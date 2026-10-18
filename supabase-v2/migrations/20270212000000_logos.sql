-- Logos for tournaments and clubs (founder, 18 Oct 2026: «so players can recognize which is which»).
-- A logo is an object in the public `logos` bucket; the row keeps its path, the app builds the public URL.
-- Every upload gets a new path (<kind>s/<id>/<stamp>.<ext>), so a replaced logo never comes back from a cache.
-- Only staff write the bucket; anyone reads it. Every api function that shows a tournament or club name now
-- carries its logo path next to it.

alter table core.tournaments add column logo_path text;
alter table core.clubs add column logo_path text;

-- ---------------------------------------------------------------------------
-- Storage: public read, staff write. PNG, JPG or WebP, 512 KB at most.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 524288, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "logos public read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'logos');
create policy "logos staff insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and core.is_staff());
create policy "logos staff update" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and core.is_staff())
  with check (bucket_id = 'logos' and core.is_staff());
create policy "logos staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and core.is_staff());

-- ---------------------------------------------------------------------------
-- Staff set or clear a logo. The path must sit in the row's own folder, so a row can never point at another
-- object. Returns the previous path, for the admin to remove the old file.
-- ---------------------------------------------------------------------------
create or replace function api.admin_set_logo(p_kind text, p_id uuid, p_path text)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_path text := nullif(btrim(coalesce(p_path, '')), '');
  v_old  text;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_kind is null or p_kind not in ('tournament', 'club') then
    raise exception 'bad_kind' using errcode = '22023';
  end if;
  if v_path is not null and v_path !~ ('^' || p_kind || 's/' || p_id::text || '/[a-z0-9_-]{1,40}\.(png|jpg|jpeg|webp)$') then
    raise exception 'bad_path' using errcode = '22023';
  end if;
  if p_kind = 'tournament' then
    select logo_path into v_old from core.tournaments where id = p_id for update;
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
    update core.tournaments set logo_path = v_path where id = p_id;
  else
    select logo_path into v_old from core.clubs where id = p_id for update;
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
    update core.clubs set logo_path = v_path where id = p_id;
  end if;
  return jsonb_build_object('logo_path', v_path, 'previous', case when v_old is distinct from v_path then v_old end);
end;
$$;

revoke all on function api.admin_set_logo(text, uuid, text) from public, anon;
grant execute on function api.admin_set_logo(text, uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- The logo next to every tournament and club name the app and admin show.
-- ---------------------------------------------------------------------------

-- from 20270127000000_feed_closed.sql (tournament.logo, club_logo)
create or replace function api.get_feed(p_limit int default 20)
returns jsonb
language plpgsql security definer stable set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_sport   text;
  v_area    text;
  v_areas   text[];
  v_claimed uuid;
  v_level   numeric;
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
  select primary_sport, area_id, claimed_player_id, array_remove(array[area_id] || area_ids, null)
    into v_sport, v_area, v_claimed, v_areas
    from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  select ps.level_value into v_level from core.player_sports ps where ps.player_id = v_claimed and ps.sport_id = v_sport;

  v_content := coalesce((
    select jsonb_agg(jsonb_build_object('kind', 'result', 'id', i.id, 'created_at', i.created_at, 'payload', i.payload)
                     order by i.created_at)
      from (select * from core.feed_inbox
             where user_id = v_uid and kind = 'result' and seen_at is null
             order by created_at limit v_limit) i), '[]'::jsonb);

  v_content := v_content || coalesce((
    with w as (select * from core.feed_weights()),
    -- where your claimed player plays
    mine as (
      select distinct m2.tournament_id, m2.club_id
        from core.match_participants mp2
        join core.matches m2 on m2.id = mp2.match_id
       where mp2.player_id = v_claimed and m2.status <> 'void'),
    -- your latest votes: what you choose to call
    hist as (
      select m3.id, m3.tournament_id, m3.club_id, e3.name as event
        from core.votes v3
        join core.matches m3 on m3.id = v3.subject_id
        left join core.tournament_events e3 on e3.id = m3.event_id
       where v3.user_id = v_uid and v3.subject_type = 'match'
       order by v3.created_at desc
       limit (select aff_history from w)),
    hist_players as (
      select mp4.player_id, count(*)::int as n
        from hist h join core.match_participants mp4 on mp4.match_id = h.id
       group by mp4.player_id)
    select jsonb_agg(q.card order by q.closed, q.voted, q.not_circle, q.score desc, q.starts_at nulls last, q.id)
      from (
        select m.id, m.starts_at, (mv.id is not null) as voted, not c.in_circle as not_circle,
               not core.match_is_open(m) as closed,
               (  w.area * coalesce(coalesce(m.area_id, cl.area_id, t.area_id) = any (v_areas), false)::int
                + w.level * coalesce(greatest(0, 1 - abs(p.lvl - v_level) / w.level_span), 0)
                + w.my_tournament * (m.tournament_id is not null
                                     and exists (select 1 from mine where mine.tournament_id = m.tournament_id))::int
                + w.my_club * (m.club_id is not null
                               and exists (select 1 from mine where mine.club_id = m.club_id))::int
                + w.hot_volume * least(s.total, w.hot_votes)::numeric / w.hot_votes
                + case when s.total >= w.close_min_votes
                       then w.hot_close * greatest(0, 1 - abs(s.s1 - s.s2)::numeric / s.total / 0.4) else 0 end
                + w.rematch * p.rematch::int
                + w.upset * coalesce(abs(p.lvl1 - p.lvl2) >= w.upset_gap, false)::int
                + w.aff_tournament * least((select count(*) from hist h where h.tournament_id = m.tournament_id), w.aff_cap)
                + w.aff_player * least(p.aff_players, w.aff_cap)
                + w.aff_club * least((select count(*) from hist h where h.club_id = m.club_id), w.aff_cap)
                + w.aff_event * least((select count(*) from hist h where h.event = e.name), w.aff_cap)
                + w.soon * coalesce(greatest(0, least(1, 1 - extract(epoch from (m.starts_at - now())) / 3600 / w.soon_hours)), 0)
               ) as score,
               jsonb_build_object(
                 'kind', 'match', 'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
                 'venue', m.venue, 'round', m.round, 'status', m.status,
                 'level', e.name, 'discipline', m.provenance ->> 'discipline',
                 'tournament', case when t.id is not null then jsonb_build_object('id', t.id, 'name', t.name, 'logo', t.logo_path) end,
                 'sides', core.match_sides_json(m.id),
                 'in_circle', c.in_circle,
                 'my_vote', mv.option,
                 -- started, no result yet: the card stays, without votes
                 'closed', not core.match_is_open(m),
                 'split', case when mv.id is not null or not core.match_is_open(m) then core.vote_split(m.id) end,
                 'moved_from', case when (m.provenance ->> 'moved_at')::timestamptz > now() - interval '3 days' then m.provenance -> 'moved_from_at' end,
                 'club', cl.name, 'club_logo', cl.logo_path, 'surface', coalesce(cl.surface, t.surface)) as card
          from core.matches m
          cross join w
          left join core.votes mv on mv.user_id = v_uid and mv.subject_type = 'match' and mv.subject_id = m.id
          left join core.tournaments t on t.id = m.tournament_id
          left join core.clubs cl on cl.id = m.club_id
          left join core.tournament_events e on e.id = m.event_id
          cross join lateral (
            select exists (select 1 from core.match_participants mp
                             join core.follows f on f.player_id = mp.player_id and f.user_id = v_uid
                            where mp.match_id = m.id) as in_circle) c
          -- the crowd so far
          cross join lateral (
            select count(*)::int as total,
                   count(*) filter (where vv.option = 1)::int as s1,
                   count(*) filter (where vv.option = 2)::int as s2
              from core.votes vv
             where vv.subject_type = 'match' and vv.subject_id = m.id) s
          -- the players: hidden levels per side, how often you voted on them, whether these sides met before
          cross join lateral (
            select avg(ps.level_value) as lvl,
                   avg(ps.level_value) filter (where mp.side = 1) as lvl1,
                   avg(ps.level_value) filter (where mp.side = 2) as lvl2,
                   coalesce(sum(hp.n), 0)::int as aff_players,
                   exists (select 1
                             from core.match_participants a1
                             join core.match_participants a2 on a2.match_id = m.id and a2.side = 2
                             join core.match_participants o1 on o1.player_id = a1.player_id and o1.match_id <> m.id
                             join core.match_participants o2 on o2.match_id = o1.match_id and o2.player_id = a2.player_id
                                                             and o2.side <> o1.side
                             join core.matches pm on pm.id = o1.match_id and pm.status <> 'void'
                            where a1.match_id = m.id and a1.side = 1) as rematch
              from core.match_participants mp
              left join core.player_sports ps on ps.player_id = mp.player_id and ps.sport_id = m.sport_id
              left join hist_players hp on hp.player_id = mp.player_id
             where mp.match_id = m.id) p
         where m.sport_id = v_sport and m.approved and (core.match_is_open(m) or core.match_vote_closed(m))
           and not exists (select 1 from core.match_participants mp
                             join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and (p.hidden or p.is_minor or mp.player_id = v_claimed))
           and not core.is_blocked(v_uid, m.logged_by)
         order by not core.match_is_open(m), (mv.id is not null), c.in_circle desc, score desc, m.starts_at nulls last, m.id
         limit v_limit) q), '[]'::jsonb);

  v_content := v_content || coalesce((
    select jsonb_agg(jsonb_build_object(
             'kind', 'postponed', 'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
             'tournament', case when t.id is not null then jsonb_build_object('id', t.id, 'name', t.name, 'logo', t.logo_path) end,
             'sides', core.match_sides_json(m.id), 'my_vote', mv.option) order by m.starts_at)
      from core.matches m
      left join core.tournaments t on t.id = m.tournament_id
      left join core.votes mv on mv.user_id = v_uid and mv.subject_type = 'match' and mv.subject_id = m.id
     where m.sport_id = v_sport and m.postponed_at is not null and m.postponed_at > now() - interval '2 days'
       and m.status in ('announced', 'scheduled')
       and (mv.id is not null or exists (select 1 from core.match_participants mp
                                          join core.follows f on f.player_id = mp.player_id and f.user_id = v_uid
                                         where mp.match_id = m.id))
       and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                        where mp.match_id = m.id and (p.hidden or p.is_minor))), '[]'::jsonb);

  select coalesce(jsonb_agg(jsonb_build_object('kind', 'sponsored', 'id', s.id, 'label', 'Χορηγούμενο',
                                               'sponsor', s.sponsor, 'title', s.title, 'subtitle', s.subtitle,
                                               'cta_url', s.cta_url,
                                               'image_url', s.image_url, 'art', s.art) order by s.weight desc, s.id), '[]'::jsonb)
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

-- from 20261224000000_m4_clubs.sql (club_logo)
create or replace function core.tournament_match_json(m core.matches)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
    'match_id', m.id, 'starts_at', m.starts_at, 'format', m.format, 'status', m.status,
    'level', e.name, 'discipline', m.provenance ->> 'discipline', 'round', m.round,
    'sides', core.match_sides_json(m.id),
    'winner_side', r.winner_side, 'sets', r.sets, 'retired', r.retired, 'walkover', r.walkover,
    'postponed', m.postponed_at is not null,
    'moved_from', case when (m.provenance ->> 'moved_at')::timestamptz > now() - interval '7 days' then m.provenance -> 'moved_from_at' end,
    'club', c.name, 'club_logo', c.logo_path, 'court', m.court, 'surface', coalesce(c.surface, t.surface))
    from (select 1) x
    left join core.tournament_events e on e.id = m.event_id
    left join core.match_results r on r.match_id = m.id
    left join core.clubs c on c.id = m.club_id
    left join core.tournaments t on t.id = m.tournament_id
$$;

-- from 20270209000000_moderate_player_matches.sql (tournament_logo)
create or replace function api.get_results(p_days int default 14, p_limit int default 60,
                                           p_tournament uuid default null, p_query text default null)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_q     text := nullif(core.normalize_search(btrim(coalesce(p_query, ''))), '');
  -- a tournament or a name looks further back: the whole tournament, a player's whole season so far
  v_days  int := case when p_tournament is not null or v_q is not null then 365
                      else least(greatest(coalesce(p_days, 14), 1), 90) end;
  v_limit int := least(greatest(coalesce(p_limit, 60), 1), 200);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  return coalesce((
    select jsonb_agg(row_to_json(d)::jsonb order by d.starts_at desc, d.match_id)
      from (
        select m.id as match_id, m.sport_id, m.format, m.starts_at, m.round, m.venue, m.area_id,
               t.id as tournament_id, t.name as tournament, t.logo_path as tournament_logo, e.name as level, m.provenance ->> 'discipline' as discipline,
               core.match_sides_json(m.id) as sides,
               r.winner_side, r.sets, r.score_summary, r.retired, r.walkover, m.review,
               case when s.total > 0 then jsonb_build_object('side1', s.side1, 'side2', s.side2, 'total', s.total) end
                 as split,
               core.is_upset(case r.winner_side when 1 then s.side1 else s.side2 end, s.total, core.sport_rules(m.sport_id))
                 as upset,
               case when v.option is not null then
                 jsonb_build_object('pick', v.option, 'outcome', v.outcome, 'points', v.points) end as my,
               core.reactions_json(m.id, v_uid) as reactions,
               case when m.status <> 'disputed' then core.kudo_target(v_uid, m.id) end as kudo_to
          from core.matches m
          join core.match_results r on r.match_id = m.id
          left join core.tournaments t on t.id = m.tournament_id
          left join core.tournament_events e on e.id = m.event_id
          cross join lateral (
            select count(*)::int as total,
                   count(*) filter (where vv.option = 1)::int as side1,
                   count(*) filter (where vv.option = 2)::int as side2
              from core.votes vv
             where vv.subject_type = 'match' and vv.subject_id = m.id
          ) s
          left join core.votes v on v.subject_type = 'match' and v.subject_id = m.id and v.user_id = v_uid
         where ((m.approved and m.review is distinct from 'pending') or (m.review = 'pending' and r.entered_by = v_uid))
           and m.status <> 'void'
           and not core.is_blocked(v_uid, m.logged_by)
           and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and p.is_minor)
           and m.starts_at is not null
           and m.starts_at >= now() - make_interval(days => v_days)
           and (p_tournament is null or m.tournament_id = p_tournament)
           and (v_q is null or exists (
                 select 1 from core.match_participants mq join core.players pq on pq.id = mq.player_id
                  where mq.match_id = m.id and not pq.hidden
                    and (position(v_q in core.normalize_search(coalesce(pq.first_name, '') || ' ' || coalesce(pq.surname, ''))) > 0
                         or position(v_q in core.normalize_search(coalesce(pq.surname, '') || ' ' || coalesce(pq.first_name, ''))) > 0)))
         order by m.starts_at desc
         limit v_limit
      ) d), '[]'::jsonb);
end;
$$;

-- from 20270126000000_results_filters.sql (logo)
create or replace function api.results_tournaments(p_days int default 60)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_me   uuid;
  v_days int := least(greatest(coalesce(p_days, 60), 1), 365);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select id into v_me from core.players where claimed_by_user_id = v_uid limit 1;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'logo', x.logo_path, 'results', x.n) order by x.mine desc, x.last_at desc)
      from (
        select t.id, t.name, t.logo_path, count(*)::int as n, max(m.starts_at) as last_at,
               bool_or(exists (select 1 from core.match_participants mp
                                where mp.match_id = m.id
                                  and (mp.player_id = v_me
                                       or mp.player_id in (select f.player_id from core.follows f where f.user_id = v_uid))))
                 as mine
          from core.matches m
          join core.match_results r on r.match_id = m.id
          join core.tournaments t on t.id = m.tournament_id and not t.is_minor_event
         where m.approved and m.status <> 'void' and m.starts_at >= now() - make_interval(days => v_days)
         group by t.id, t.name, t.logo_path
      ) x), '[]'::jsonb);
end;
$$;

-- from 20270209000000_moderate_player_matches.sql (logo, tournament_logo)
create or replace function api.get_tournaments()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me  uuid;
  v_pro boolean;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  v_pro := core.is_pro(v_uid);
  select claimed_player_id into v_me from core.profiles where user_id = v_uid;
  return jsonb_build_object(
    'pro', v_pro,
    'items', coalesce((
      select jsonb_agg(x.j order by x.ord, x.starts_on nulls last, x.name)
        from (
          select t.name, t.starts_on,
                 case core.tournament_state(t) when 'ongoing' then 1 when 'upcoming' then 2 else 3 end as ord,
                 jsonb_build_object(
                   'id', t.id, 'name', t.name, 'logo', t.logo_path, 'venue', t.venue, 'area_id', t.area_id, 'surface', t.surface,
                   'starts_on', t.starts_on, 'ends_on', t.ends_on, 'entry_deadline', t.entry_deadline,
                   'level_min', t.level_min, 'level_max', t.level_max, 'state', core.tournament_state(t),
                   'draws', (select count(*) from core.tournament_draws d where d.tournament_id = t.id),
                   'matches', (select count(*) from core.matches m where m.tournament_id = t.id and m.approved and m.status <> 'void'),
                   'today', (select count(*) from core.matches m where m.tournament_id = t.id and m.approved and m.status <> 'void'
                              and core.athens_day(m.starts_at) = core.athens_day(now())),
                   'in_it', v_me is not null and (
                     exists (select 1 from core.matches m join core.match_participants mp on mp.match_id = m.id
                              where m.tournament_id = t.id and m.approved and mp.player_id = v_me)
                     or exists (select 1 from core.tournament_draws d, jsonb_array_elements(d.draw -> 'entrants') en,
                                         jsonb_array_elements(en -> 'players') pl
                                 where d.tournament_id = t.id and pl ->> 'player_id' = v_me::text))) as j
            from core.tournaments t
           where not t.is_minor_event
             and (exists (select 1 from core.matches m where m.tournament_id = t.id and m.approved and m.status <> 'void')
                  or exists (select 1 from core.tournament_draws d where d.tournament_id = t.id))
             and (core.tournament_state(t) <> 'done'
                  or coalesce(t.ends_on, (select max(core.athens_day(m.starts_at)) from core.matches m where m.tournament_id = t.id and m.approved)) >= core.athens_day(now()) - 14)
        ) x), '[]'::jsonb),
    -- «Το πρόγραμμά σου»: my next tournament matches (Pro)
    'mine', case when v_pro and v_me is not null then coalesce((
      select jsonb_agg(jsonb_build_object('tournament_id', t.id, 'tournament', t.name, 'tournament_logo', t.logo_path) || core.tournament_match_json(m)
                       order by m.starts_at)
        from core.matches m
        join core.tournaments t on t.id = m.tournament_id
        join core.match_participants mp on mp.match_id = m.id and mp.player_id = v_me
       where m.approved and m.status in ('announced', 'scheduled') and m.starts_at >= now() - interval '2 hours'
         and m.starts_at < now() + interval '14 days'), '[]'::jsonb) end);
end;
$$;

-- from 20261217000000_m4_round_robin.sql (logo)
create or replace function api.get_tournament(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_t   core.tournaments;
  v_me  uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_t from core.tournaments where id = p_id and not is_minor_event;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select claimed_player_id into v_me from core.profiles where user_id = v_uid;
  return jsonb_build_object(
    'id', v_t.id, 'name', v_t.name, 'logo', v_t.logo_path, 'venue', v_t.venue, 'area_id', v_t.area_id, 'surface', v_t.surface,
    'starts_on', v_t.starts_on, 'ends_on', v_t.ends_on, 'entry_deadline', v_t.entry_deadline,
    'state', core.tournament_state(v_t), 'me', v_me,
    'draws', coalesce((
      select jsonb_agg(jsonb_build_object('tab', d.tab, 'title', d.title, 'discipline', d.discipline, 'level', d.level,
                                          'format', d.format, 'size', d.size, 'updated_at', d.updated_at,
                                          'entrants', d.draw -> 'entrants', 'rounds', d.draw -> 'rounds',
                                          'groups', coalesce(d.draw -> 'groups', '[]'::jsonb))
                       order by array_position(array['MS', 'WS', 'MD', 'WD', 'XD'], d.discipline), d.level, d.tab)
        from core.tournament_draws d where d.tournament_id = v_t.id), '[]'::jsonb),
    -- names in the draws that belong to hidden players or minors: the app masks them
    'masked', coalesce((
      select jsonb_agg(distinct pl ->> 'raw')
        from core.tournament_draws d, jsonb_array_elements(d.draw -> 'entrants') en, jsonb_array_elements(en -> 'players') pl
        join core.players p on p.id = (pl ->> 'player_id')::uuid
       where d.tournament_id = v_t.id and (p.hidden or p.is_minor)), '[]'::jsonb),
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('date', x.day, 'matches', x.ms) order by x.day)
        from (
          select core.athens_day(m.starts_at) as day,
                 jsonb_agg(core.tournament_match_json(m) order by m.starts_at, m.id) as ms
            from core.matches m
           where m.tournament_id = v_t.id and m.status <> 'void' and m.starts_at is not null
             and core.tournament_match_visible(m.id)
           group by 1
        ) x), '[]'::jsonb));
end;
$$;

-- from 20270201000000_next_tournament.sql (logo)
create or replace function core.upcoming_for(p_user uuid, p_today date default core.athens_day(now()))
returns table (id uuid, ord bigint, area_match boolean, doc jsonb)
language sql stable security definer set search_path = core, pg_temp
as $$
  with me as (
    select pr.user_id, pr.primary_sport, pr.area_id, pr.area_ids, pr.gender, pr.claimed_player_id
      from core.profiles pr where pr.user_id = p_user
  ),
  c as (
    select t.*,
           (t.area_id is not null and (t.area_id = me.area_id or t.area_id = any(me.area_ids))) as area_match,
           (t.entry_deadline is not null and t.entry_deadline >= p_today) as open_entry,
           -- fit: a category for the player's gender, or none that names one
           (me.gender is null
            or not exists (select 1 from core.tournament_events e where e.tournament_id = t.id and e.gender is not null)
            or exists (select 1 from core.tournament_events e where e.tournament_id = t.id
                        and (e.gender is null or e.gender = me.gender or e.gender = 'mixed'))) as fits,
           core.played_edition(me.claimed_player_id, t.id) as played,
           me.claimed_player_id
      from core.tournaments t, me
     where t.sport_id = me.primary_sport
       and not t.is_minor_event
       and ((t.starts_on is not null and t.starts_on > p_today) or (t.entry_deadline is not null and t.entry_deadline >= p_today))
  )
  select c.id,
         row_number() over (order by c.area_match desc, c.fits desc, c.open_entry desc, c.entry_deadline nulls last,
                                     c.starts_on nulls last, c.name, c.id) as ord,
         c.area_match,
         jsonb_build_object(
           'id', c.id, 'name', c.name, 'logo', c.logo_path, 'venue', c.venue, 'area_id', c.area_id,
           'area', (select a.name_el from core.areas a where a.id = c.area_id),
           'surface', c.surface, 'starts_on', c.starts_on, 'ends_on', c.ends_on,
           'entry_deadline', c.entry_deadline, 'entry_open', c.open_entry, 'entry_link', c.entry_link,
           'categories', coalesce((select jsonb_agg(x.name order by x.name)
                                     from (select distinct e.name from core.tournament_events e where e.tournament_id = c.id) x), '[]'::jsonb),
           'played_before', c.played,
           'near', c.area_match)
    from c
$$;

-- from 20261114000000_m2_log_match.sql (logo)
create or replace function api.list_tournaments()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'logo', t.logo_path, 'venue', t.venue, 'area_id', t.area_id,
                                        'starts_on', t.starts_on, 'ends_on', t.ends_on)
                     order by t.starts_on desc nulls last, t.name)
      from core.tournaments t
     where t.active and (t.ends_on is null or t.ends_on >= core.athens_day() - 14)), '[]'::jsonb);
end;
$$;

-- from 20270201000000_next_tournament.sql (logo_path)
create or replace function api.admin_tournaments()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', t.id, 'name', t.name, 'logo_path', t.logo_path, 'venue', t.venue, 'area_id', t.area_id, 'surface', t.surface,
             'starts_on', t.starts_on, 'ends_on', t.ends_on, 'active', t.active,
             'entry_deadline', t.entry_deadline, 'entry_link', t.entry_link,
             'source_kind', t.source_kind, 'source_url', t.source_url, 'draw_url', t.draw_url, 'ongoing', t.ongoing,
             'season_start_year', t.season_start_year, 'last_run_at', t.last_run_at,
             'matches', (select count(*) from core.matches m where m.tournament_id = t.id),
             'open_reviews', (select count(*) from core.ingest_reviews r where r.tournament_id = t.id and r.status = 'open'),
             'draws', (select count(*) from core.tournament_draws d where d.tournament_id = t.id),
             'last_run', (select jsonb_build_object('at', r.started_at, 'trigger', r.trigger, 'health', r.health,
                                                    'rows_seen', r.rows_seen, 'counts', r.counts, 'error', r.error)
                            from core.ingest_runs r where r.tournament_id = t.id and r.kind = 'schedule' order by r.started_at desc limit 1),
             'last_draw_run', (select jsonb_build_object('at', r.started_at, 'trigger', r.trigger, 'health', r.health,
                                                    'rows_seen', r.rows_seen, 'counts', r.counts, 'error', r.error)
                            from core.ingest_runs r where r.tournament_id = t.id and r.kind = 'draws' order by r.started_at desc limit 1))
           order by t.ongoing desc, t.active desc, t.starts_on desc nulls last, t.name)
      from core.tournaments t), '[]'::jsonb);
end;
$$;

-- from 20261224000000_m4_clubs.sql (logo_path)
create or replace function api.admin_clubs()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'surface', c.surface, 'logo_path', c.logo_path,
                                        'matches', (select count(*) from core.matches m where m.club_id = c.id),
                                        'courts', (select coalesce(jsonb_agg(distinct m.court) filter (where m.court is not null), '[]'::jsonb)
                                                     from core.matches m where m.club_id = c.id))
                     order by c.surface is not null, c.name)
      from core.clubs c), '[]'::jsonb);
end;
$$;
