-- Faster feed, tournament page and results (measured on the hosted DB, 20 Oct 2026: get_tournament 315 ms for a
-- 338-match tournament, get_results 82 ms for 60 rows, get_feed scanning every match). The output is the same,
-- key for key and in the same order; only how it is built changes:
--   * the sides of every match in a reply come from one query (core.match_sides_for) instead of one
--     core.match_sides_json + core.player_avatar call per match and per player (SQL functions with their own
--     search_path are never inlined, so each call was a separate plan);
--   * get_feed narrows to matches that can still be open or just closed (status announced/scheduled, not
--     postponed, no result) with plain conditions, so matches_open_idx is used instead of a scan of all matches,
--     and runs match_is_open / match_vote_closed once per match instead of up to four times;
--   * the vote split of a feed card reuses the counts already taken for the ranking;
--   * sponsored cards are placed with one query instead of a loop that copied the list on every step.
-- Two privacy fixes ride along, since these functions are redefined here anyway:
--   * get_feed never shows a match of a minors' event (tournaments.is_minor_event);
--   * get_tournament no longer sends the draw names of minors and hidden players (see core.draw_mask below).
-- core.match_sides_json and core.tournament_match_json stay as they are for their other callers.

create or replace function core.match_sides_for(p_matches uuid[])
returns table (match_id uuid, sides jsonb)
language sql stable set search_path = core, pg_temp
as $$
  -- same shape as core.match_sides_json, for many matches at once; a match without participants has no row
  select s.match_id, jsonb_agg(jsonb_build_object('side', s.side, 'players', s.players) order by s.side)
    from (
      select mp.match_id, mp.side,
             jsonb_agg(jsonb_build_object(
               'id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'photo_path', p.photo_path,
               'area_id', p.area_id, 'level_tier', ps.level_tier, 'level_direction', ps.level_direction,
               'gender', p.gender,
               -- as core.player_avatar: only a player with a visible account shows a drawn player
               'avatar', case when pr.user_id is not null then coalesce(pr.avatar, 'default') end
             ) order by mp.position) as players
        from core.matches m
        join core.match_participants mp on mp.match_id = m.id
        join core.players p on p.id = mp.player_id
        left join core.player_sports ps on ps.player_id = p.id and ps.sport_id = m.sport_id
        left join core.profiles pr on pr.user_id = p.claimed_by_user_id and pr.deleted_at is null and not pr.hidden
       where m.id = any (p_matches)
       group by mp.match_id, mp.side
    ) s
   group by s.match_id
$$;
revoke all on function core.match_sides_for(uuid[]) from public, anon;
grant execute on function core.match_sides_for(uuid[]) to authenticated, service_role;

-- from 20270218000000_feed_whole_day.sql
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
  v_out     jsonb;
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
       group by mp4.player_id),
    q as (
      select q0.*, row_number() over (partition by q0.today order by q0.closed, q0.voted, q0.not_circle, q0.score desc, q0.starts_at nulls last, q0.id) as rn
        from (
        select m.id, m.starts_at,
               -- the feed's day (from 23:00 Athens it is already tomorrow, as on the app's Σήμερα)
               coalesce((m.starts_at at time zone 'Europe/Athens')::date
                          <= ((now() + interval '1 hour') at time zone 'Europe/Athens')::date, false) as today, (mv.id is not null) as voted, not c.in_circle as not_circle,
               not g.is_open as closed,
               s.total, s.s1, s.s2,
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
               -- sides and split are added once the cards are picked
               jsonb_build_object(
                 'kind', 'match', 'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
                 'venue', m.venue, 'round', m.round, 'status', m.status,
                 'level', e.name, 'discipline', m.provenance ->> 'discipline',
                 'tournament', case when t.id is not null then jsonb_build_object('id', t.id, 'name', t.name, 'logo', t.logo_path) end,
                 'in_circle', c.in_circle,
                 'my_vote', mv.option,
                 -- started, no result yet: the card stays, without votes
                 'closed', not g.is_open,
                 'moved_from', case when (m.provenance ->> 'moved_at')::timestamptz > now() - interval '3 days' then m.provenance -> 'moved_from_at' end,
                 'club', cl.name, 'club_logo', cl.logo_path, 'surface', coalesce(cl.surface, t.surface)) as card
          from core.matches m
          -- the two gates, once per match (offset 0 keeps the planner from copying the calls into every use)
          cross join lateral (select core.match_is_open(m) as is_open, core.match_vote_closed(m) as vote_closed offset 0) g
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
         where m.sport_id = v_sport and m.approved
           -- what both gates ask anyway, written so matches_open_idx can narrow the scan
           and m.status in ('announced', 'scheduled') and m.postponed_at is null
           and not exists (select 1 from core.match_results r where r.match_id = m.id)
           and (g.is_open or g.vote_closed)
           -- never a match of a minors' event
           and not coalesce(t.is_minor_event, false)
           and not exists (select 1 from core.match_participants mp
                             join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and (p.hidden or p.is_minor or mp.player_id = v_claimed))
           -- core.is_blocked, inline
           and not exists (select 1 from core.blocks b where b.user_id = v_uid and b.blocked_user_id = m.logged_by)
        ) q0),
    -- every match of the day comes, whoever plays (founder, 19 Oct: «Όσο κατεβαίνεις, βλέπεις ματς από παίκτες που
    -- ίσως δεν ξέρεις»); the limit only trims the later days, most relevant first, as many as p_limit
    picked as (select * from q where q.today or q.rn <= v_limit),
    sd as (select * from core.match_sides_for(array(select id from picked)))
    select jsonb_agg(
             q.card || jsonb_build_object(
               'sides', coalesce(sd.sides, '[]'::jsonb),
               -- as core.vote_split, from the same counts
               'split', case when q.voted or q.closed then jsonb_build_object(
                          'total', q.total, 'side1', q.s1, 'side2', q.s2,
                          'pct1', case when q.total = 0 then 0 else round(100.0 * q.s1 / q.total)::int end,
                          'pct2', case when q.total = 0 then 0 else 100 - round(100.0 * q.s1 / q.total)::int end) end)
             order by q.closed, q.voted, q.not_circle, q.score desc, q.starts_at nulls last, q.id)
      from picked q
      left join sd on sd.match_id = q.id), '[]'::jsonb);

  v_content := v_content || coalesce((
    with pp as (
      select m.id, m.format, m.starts_at, t.id as t_id, t.name as t_name, t.logo_path as t_logo, mv.option
        from core.matches m
        left join core.tournaments t on t.id = m.tournament_id
        left join core.votes mv on mv.user_id = v_uid and mv.subject_type = 'match' and mv.subject_id = m.id
       where m.sport_id = v_sport and m.postponed_at is not null and m.postponed_at > now() - interval '2 days'
         and m.status in ('announced', 'scheduled')
         and not coalesce(t.is_minor_event, false)
         and (mv.id is not null or exists (select 1 from core.match_participants mp
                                            join core.follows f on f.player_id = mp.player_id and f.user_id = v_uid
                                           where mp.match_id = m.id))
         and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                          where mp.match_id = m.id and (p.hidden or p.is_minor))),
    sd as (select * from core.match_sides_for(array(select id from pp)))
    select jsonb_agg(jsonb_build_object(
             'kind', 'postponed', 'match_id', pp.id, 'format', pp.format, 'starts_at', pp.starts_at,
             'tournament', case when pp.t_id is not null then jsonb_build_object('id', pp.t_id, 'name', pp.t_name, 'logo', pp.t_logo) end,
             'sides', coalesce(sd.sides, '[]'::jsonb), 'my_vote', pp.option) order by pp.starts_at)
      from pp left join sd on sd.match_id = pp.id), '[]'::jsonb);

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

  -- a sponsored card after every 4th item, rotating by the day of the year
  v_out := coalesce((
    select jsonb_agg(x.el order by x.i, x.ad)
      from (
        select e.el, e.i, 0 as ad from jsonb_array_elements(v_content) with ordinality e(el, i)
        union all
        select v_ads -> ((((e.i / 4) - 1 + v_offset) % v_ad_n)::int), e.i, 1
          from jsonb_array_elements(v_content) with ordinality e(el, i)
         where v_ad_n > 0 and e.i % 4 = 0
      ) x), '[]'::jsonb);

  return jsonb_build_object('items', v_out, 'count', jsonb_array_length(v_out),
    -- celebrations wait for the result cards, then play one by one (prototype celOn)
    'celebrations', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'created_at', i.created_at, 'payload', i.payload)
                                               order by i.created_at)
                                from core.feed_inbox i
                               where i.user_id = v_uid and i.kind = 'celebration' and i.seen_at is null), '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- Draw names of minors and hidden players never leave the server. Until now get_tournament sent the draws as
-- written, with a `masked` list of exactly those names for the app to cover. Now each such name is replaced in the
-- draw by a placeholder (#1, #2, ...), its player_id is dropped, and `masked` lists the placeholders, so the app
-- keeps showing «masked» where they stand and the entrant slots (seeds, byes, shape) stay as they were.
-- ---------------------------------------------------------------------------

-- the key the app compares draw names by (apps/app/src/lib/tournaments.ts norm): no accents, lower case, ς as σ,
-- single spaces; written out letter by letter so it does not depend on the database locale
create or replace function core.draw_name_key(p text)
returns text language sql immutable parallel safe set search_path = ''
as $$
  select btrim(regexp_replace(translate(lower(coalesce(p, '')),
    'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΆΈΉΊΌΎΏΪΫάέήίόύώϊϋΐΰςàáâäãåçèéêëìíîïñòóôöõùúûüýÿ',
    'αβγδεζηθικλμνξοπρστυφχψωαεηιουωιυαεηιουωιυιυσaaaaaaceeeeiiiinooooouuuuyy'), '\s+', ' ', 'g'))
$$;

-- a side as written («Α Β / Γ Δ»): every masked name in it becomes its placeholder; other text is left as it is
create or replace function core.draw_mask_text(p_text text, p_masks jsonb)
returns text language sql immutable parallel safe set search_path = ''
as $$
  select case
    when p_text is null or p_masks is null or p_masks = '{}'::jsonb then p_text
    when p_masks ? core.draw_name_key(p_text) then p_masks ->> core.draw_name_key(p_text)
    when not exists (select 1 from unnest(string_to_array(p_text, '/')) x where p_masks ? core.draw_name_key(x)) then p_text
    else (select string_agg(coalesce(p_masks ->> core.draw_name_key(x), btrim(x)), ' / ' order by o)
            from unnest(string_to_array(p_text, '/')) with ordinality u(x, o))
  end
$$;

-- one draw with the masked names replaced: entrants (raw, players), bracket sides, group teams and people
create or replace function core.draw_mask(p_draw jsonb, p_masks jsonb)
returns jsonb language plpgsql immutable set search_path = ''
as $$
declare
  v    jsonb := p_draw;
  i    int;
  j    int;
  side text;
  k    text;
  path text[];
begin
  if p_draw is null or p_masks is null or p_masks = '{}'::jsonb then return p_draw; end if;

  if jsonb_typeof(v -> 'entrants') = 'array' then
    for i in 0 .. jsonb_array_length(v -> 'entrants') - 1 loop
      path := array['entrants', i::text, 'raw'];
      if jsonb_typeof(v #> path) = 'string' then
        v := jsonb_set(v, path, to_jsonb(core.draw_mask_text(v #>> path, p_masks)));
      end if;
      path := array['entrants', i::text, 'players'];
      if jsonb_typeof(v #> path) = 'array' then
        for j in 0 .. jsonb_array_length(v #> path) - 1 loop
          k := core.draw_name_key(v #>> (path || array[j::text, 'raw']));
          if p_masks ? k then
            v := jsonb_set(v, path || array[j::text],
                           (v #> (path || array[j::text])) || jsonb_build_object('raw', p_masks ->> k, 'player_id', null));
          end if;
        end loop;
      end if;
    end loop;
  end if;

  if jsonb_typeof(v -> 'rounds') = 'array' then
    for i in 0 .. jsonb_array_length(v -> 'rounds') - 1 loop
      if jsonb_typeof(v #> array['rounds', i::text]) = 'array' then
        for j in 0 .. jsonb_array_length(v #> array['rounds', i::text]) - 1 loop
          foreach side in array array['side1', 'side2'] loop
            path := array['rounds', i::text, j::text, side];
            if jsonb_typeof(v #> path) = 'string' then
              v := jsonb_set(v, path, to_jsonb(core.draw_mask_text(v #>> path, p_masks)));
            end if;
          end loop;
        end loop;
      end if;
    end loop;
  end if;

  if jsonb_typeof(v -> 'groups') = 'array' then
    for i in 0 .. jsonb_array_length(v -> 'groups') - 1 loop
      if jsonb_typeof(v #> array['groups', i::text, 'teams']) = 'array' then
        for j in 0 .. jsonb_array_length(v #> array['groups', i::text, 'teams']) - 1 loop
          path := array['groups', i::text, 'teams', j::text];
          if jsonb_typeof(v #> (path || array['raw'])) = 'string' then
            v := jsonb_set(v, path || array['raw'], to_jsonb(core.draw_mask_text(v #>> (path || array['raw']), p_masks)));
          end if;
          if jsonb_typeof(v #> (path || array['people'])) = 'array' then
            v := jsonb_set(v, path || array['people'], (
              select jsonb_agg(case when p_masks ? core.draw_name_key(concat_ws(' ', pp ->> 'surname', pp ->> 'first'))
                                    then pp || jsonb_build_object(
                                           'surname', p_masks ->> core.draw_name_key(concat_ws(' ', pp ->> 'surname', pp ->> 'first')),
                                           'first', '',
                                           'key', p_masks ->> core.draw_name_key(concat_ws(' ', pp ->> 'surname', pp ->> 'first')))
                                    else pp end order by o)
                from jsonb_array_elements(v #> (path || array['people'])) with ordinality x(pp, o)));
          end if;
        end loop;
      end if;
    end loop;
  end if;

  return v;
end;
$$;

revoke all on function core.draw_name_key(text) from public, anon;
revoke all on function core.draw_mask_text(text, jsonb) from public, anon;
revoke all on function core.draw_mask(jsonb, jsonb) from public, anon;
grant execute on function core.draw_name_key(text) to authenticated, service_role;
grant execute on function core.draw_mask_text(text, jsonb) to authenticated, service_role;
grant execute on function core.draw_mask(jsonb, jsonb) to authenticated, service_role;

-- from 20270212000000_logos.sql: the days build every match card (core.tournament_match_json) and check
-- visibility (core.tournament_match_visible) in one query; draw names of minors and hidden players are replaced
create or replace function api.get_tournament(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_t     core.tournaments;
  v_me    uuid;
  v_masks jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_t from core.tournaments where id = p_id and not is_minor_event;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  select claimed_player_id into v_me from core.profiles where user_id = v_uid;
  -- names in the draws that belong to hidden players or minors, each with its placeholder
  select coalesce(jsonb_object_agg(y.k, '#' || y.n), '{}'::jsonb) into v_masks
    from (select x.k, row_number() over (order by x.k) as n
            from (select distinct core.draw_name_key(pl ->> 'raw') as k
                    from core.tournament_draws d, jsonb_array_elements(d.draw -> 'entrants') en, jsonb_array_elements(en -> 'players') pl
                    join core.players p on p.id = (pl ->> 'player_id')::uuid
                   where d.tournament_id = v_t.id and (p.hidden or p.is_minor)) x
           where x.k <> '') y;
  return jsonb_build_object(
    'id', v_t.id, 'name', v_t.name, 'logo', v_t.logo_path, 'venue', v_t.venue, 'area_id', v_t.area_id, 'surface', v_t.surface,
    'starts_on', v_t.starts_on, 'ends_on', v_t.ends_on, 'entry_deadline', v_t.entry_deadline,
    'state', core.tournament_state(v_t), 'me', v_me,
    'draws', coalesce((
      select jsonb_agg(jsonb_build_object('tab', d.tab, 'title', d.title, 'discipline', d.discipline, 'level', d.level,
                                          'format', d.format, 'size', d.size, 'updated_at', d.updated_at,
                                          'entrants', d.md -> 'entrants', 'rounds', d.md -> 'rounds',
                                          'groups', coalesce(d.md -> 'groups', '[]'::jsonb))
                       order by array_position(array['MS', 'WS', 'MD', 'WD', 'XD'], d.discipline), d.level, d.tab)
        from (select d0.*, core.draw_mask(d0.draw, v_masks) as md
                from core.tournament_draws d0 where d0.tournament_id = v_t.id) d), '[]'::jsonb),
    -- the placeholders standing for hidden players and minors: the app shows «masked» there
    'masked', coalesce((select jsonb_agg(m.value order by substr(m.value, 2)::int) from jsonb_each_text(v_masks) m), '[]'::jsonb),
    'days', coalesce((
      with ms as (
        select m.*
          from core.matches m
         where m.tournament_id = v_t.id and m.status <> 'void' and m.starts_at is not null
           -- core.tournament_match_visible, inline
           and m.approved
           and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and (p.is_minor or p.hidden))),
      sd as (select * from core.match_sides_for(array(select id from ms)))
      select jsonb_agg(jsonb_build_object('date', x.day, 'matches', x.ms) order by x.day)
        from (
          select core.athens_day(m.starts_at) as day,
                 -- core.tournament_match_json, inline
                 jsonb_agg(jsonb_build_object(
                   'match_id', m.id, 'starts_at', m.starts_at, 'format', m.format, 'status', m.status,
                   'level', e.name, 'discipline', m.provenance ->> 'discipline', 'round', m.round,
                   'sides', coalesce(sd.sides, '[]'::jsonb),
                   'winner_side', r.winner_side, 'sets', r.sets, 'retired', r.retired, 'walkover', r.walkover,
                   'postponed', m.postponed_at is not null,
                   'moved_from', case when (m.provenance ->> 'moved_at')::timestamptz > now() - interval '7 days' then m.provenance -> 'moved_from_at' end,
                   'club', c.name, 'club_logo', c.logo_path, 'court', m.court, 'surface', coalesce(c.surface, v_t.surface))
                   order by m.starts_at, m.id) as ms
            from ms m
            left join sd on sd.match_id = m.id
            left join core.tournament_events e on e.id = m.event_id
            left join core.match_results r on r.match_id = m.id
            left join core.clubs c on c.id = m.club_id
           group by 1
        ) x), '[]'::jsonb));
end;
$$;

-- from 20270212000000_logos.sql: the 60 rows are picked first, then their sides, split and reactions are built
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
    with picked as (
      select m.id, m.sport_id, m.format, m.starts_at, m.round, m.venue, m.area_id, m.status, m.review, m.provenance,
             t.id as tournament_id, t.name as tournament, t.logo_path as tournament_logo, e.name as level,
             r.winner_side, r.sets, r.score_summary, r.retired, r.walkover
        from core.matches m
        join core.match_results r on r.match_id = m.id
        left join core.tournaments t on t.id = m.tournament_id
        left join core.tournament_events e on e.id = m.event_id
       where ((m.approved and m.review is distinct from 'pending') or (m.review = 'pending' and r.entered_by = v_uid))
         and m.status <> 'void'
         -- core.is_blocked, inline
         and not exists (select 1 from core.blocks b where b.user_id = v_uid and b.blocked_user_id = m.logged_by)
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
       -- the id settles matches at the same time, as in the list itself (before, the cut among them was up to the plan)
       order by m.starts_at desc, m.id
       limit v_limit),
    sd as (select * from core.match_sides_for(array(select id from picked)))
    select jsonb_agg(row_to_json(d)::jsonb order by d.starts_at desc, d.match_id)
      from (
        select m.id as match_id, m.sport_id, m.format, m.starts_at, m.round, m.venue, m.area_id,
               m.tournament_id, m.tournament, m.tournament_logo, m.level, m.provenance ->> 'discipline' as discipline,
               coalesce(sd.sides, '[]'::jsonb) as sides,
               m.winner_side, m.sets, m.score_summary, m.retired, m.walkover, m.review,
               case when s.total > 0 then jsonb_build_object('side1', s.side1, 'side2', s.side2, 'total', s.total) end
                 as split,
               core.is_upset(case m.winner_side when 1 then s.side1 else s.side2 end, s.total, core.sport_rules(m.sport_id))
                 as upset,
               case when v.option is not null then
                 jsonb_build_object('pick', v.option, 'outcome', v.outcome, 'points', v.points) end as my,
               core.reactions_json(m.id, v_uid) as reactions,
               case when m.status <> 'disputed' then core.kudo_target(v_uid, m.id) end as kudo_to
          from picked m
          left join sd on sd.match_id = m.id
          cross join lateral (
            select count(*)::int as total,
                   count(*) filter (where vv.option = 1)::int as side1,
                   count(*) filter (where vv.option = 2)::int as side2
              from core.votes vv
             where vv.subject_type = 'match' and vv.subject_id = m.id
          ) s
          left join core.votes v on v.subject_type = 'match' and v.subject_id = m.id and v.user_id = v_uid
      ) d), '[]'::jsonb);
end;
$$;
