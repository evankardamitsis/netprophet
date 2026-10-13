-- M4: rain. Organisers empty a day's tab when it rains and put the matches on later days. A match the sheet stops
-- listing is now postponed after two runs (not cancelled): it keeps its votes, the feed tells the people who voted on
-- it or follow its players («Αναβλήθηκε»), and when it comes back on another day within three weeks it moves there
-- («Νέα μέρα»), votes carried over. Only a match postponed three weeks and never back is cancelled. A sheet that writes
-- ΑΝΑΒΟΛΗ / ΒΡΟΧΗ in the score column postpones the match straight away (rows carry `postponed`). A postponed match is
-- not open for votes until it has a new time.

alter table core.matches add column postponed_at timestamptz;

create or replace function core.match_is_open(m core.matches)
returns boolean language sql stable set search_path = core, pg_temp
as $$
  select m.postponed_at is null
     and core.vote_gate(m.status, m.starts_at, m.locked_at, 1, now()) = 'ok'
     and not exists (select 1 from core.match_results r where r.match_id = m.id)
$$;

create or replace function core.ingest_missing(p_tournament_id uuid, p_rows jsonb)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_seen  text[] := array(select x ->> 'fingerprint' from jsonb_array_elements(p_rows) x);
  v_id    uuid;
  v_miss  int := 0;
  v_void  int := 0;
  v_post  int := 0;
begin
  update core.matches set provenance = provenance - 'missing_runs'
   where tournament_id = p_tournament_id and source = 'import' and source_ref = any (v_seen) and provenance ? 'missing_runs';
  for v_id in
    update core.matches m
       set provenance = provenance || jsonb_build_object('missing_runs', coalesce((provenance ->> 'missing_runs')::int, 0) + 1)
     where m.tournament_id = p_tournament_id and m.source = 'import' and m.status in ('announced', 'scheduled')
       and m.resolved_at is null and not exists (select 1 from core.match_results x where x.match_id = m.id)
       and m.starts_at >= now() - interval '1 day' and m.postponed_at is null
       and not (m.source_ref = any (v_seen))
    returning m.id
  loop
    v_miss := v_miss + 1;
  end loop;
  -- missing twice in a row: postponed (rain, a moved day); it keeps its votes and can come back on another day
  update core.matches set postponed_at = now()
   where tournament_id = p_tournament_id and source = 'import' and status in ('announced', 'scheduled')
     and coalesce((provenance ->> 'missing_runs')::int, 0) >= 2 and postponed_at is null;
  get diagnostics v_post = row_count;
  -- postponed three weeks and never back: cancelled
  for v_id in
    select id from core.matches
     where tournament_id = p_tournament_id and source = 'import' and status in ('announced', 'scheduled')
       and postponed_at is not null and postponed_at < now() - interval '21 days'
  loop
    update core.matches set status = 'void', updated_at = now(),
                            provenance = provenance || jsonb_build_object('cancelled_at', now())
     where id = v_id;
    insert into core.outbox (kind, payload, idempotency_key)
    values ('resolve_match', jsonb_build_object('match_id', v_id), 'resolve:' || v_id || ':void')
    on conflict (idempotency_key) do nothing;
    v_void := v_void + 1;
  end loop;
  return jsonb_build_object('missing', v_miss, 'postponed', v_post, 'cancelled', v_void);
end;
$$;

create or replace function core.ingest_apply(p_tournament_id uuid, p_rows jsonb, p_by uuid, p_run uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_t       core.tournaments;
  r         jsonb;
  v_m       core.matches;
  v_event   uuid;
  v_format  text;
  v_gender  text;
  v_starts  timestamptz;
  v_people  int := (select count(*) from core.players);
  v_new     int := 0;
  v_upd     int := 0;
  v_res     int := 0;
  v_skip    int := 0;
  v_held    int := 0;
  v_wo      int := 0;
  v_linked  int := 0;
  v_side    int;
  v_pos     int;
  v_person  jsonb;
  v_dec     jsonb;
  v_sides   jsonb;
  v_unclear jsonb;
  v_known   boolean;
  v_key     text;
  v_fresh   boolean;
  v_used    text[];
  v_moved   int := 0;
  v_attached int := 0;
  v_conflict int := 0;
begin
  select * into v_t from core.tournaments where id = p_tournament_id;
  if not found then raise exception 'tournament_not_found' using errcode = 'P0002'; end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    v_known := core.ingest_match_by_ref(r ->> 'fingerprint', p_tournament_id) is not null;

    -- resolve the people the desk did not decide; an unclear one near an active user holds the row for review
    v_sides := jsonb_build_object('side1', r -> 'side1', 'side2', r -> 'side2');
    v_unclear := '[]'::jsonb;
    v_used := array(select x ->> 'player_id' from jsonb_array_elements(coalesce(r -> 'side1', '[]'::jsonb) || coalesce(r -> 'side2', '[]'::jsonb)) x
                     where x ? 'player_id');
    if not v_known then
      for v_side in 1..2 loop
        v_pos := 0;
        for v_person in select * from jsonb_array_elements(r -> ('side' || v_side)) loop
          if v_person ? 'player_id' or v_person ? 'new' then
            null;
          else
            v_dec := core.ingest_person(v_person, p_tournament_id);
            if v_dec ->> 'how' in ('alias', 'match', 'tournament', 'surname') and (v_dec ->> 'player_id') = any (v_used) then
              -- two people on one row cannot be the same player (brothers with initials): staff decide
              v_unclear := v_unclear || jsonb_build_array(v_person || jsonb_build_object('candidates', core.ingest_candidates(v_person)));
            elsif v_dec ->> 'how' in ('alias', 'match', 'tournament', 'surname') then
              v_used := v_used || (v_dec ->> 'player_id');
              v_sides := jsonb_set(v_sides, array['side' || v_side, v_pos::text],
                                   jsonb_build_object('player_id', v_dec ->> 'player_id', 'raw', v_person ->> 'raw'));
              v_linked := v_linked + 1;
            elsif v_dec ->> 'how' = 'new' then
              v_sides := jsonb_set(v_sides, array['side' || v_side, v_pos::text],
                                   jsonb_build_object('new', jsonb_build_object('surname', v_person ->> 'surname', 'first', v_person ->> 'first'),
                                                      'raw', v_person ->> 'raw'));
            else
              v_unclear := v_unclear || jsonb_build_array(v_person || jsonb_build_object('candidates', v_dec -> 'candidates'));
            end if;
          end if;
          v_pos := v_pos + 1;
        end loop;
      end loop;
      if jsonb_array_length(v_unclear) > 0 then
        insert into core.ingest_reviews (tournament_id, run_id, kind, fingerprint, payload)
        values (p_tournament_id, p_run, 'people', r ->> 'fingerprint', jsonb_build_object('row', r, 'unclear', v_unclear))
        on conflict (tournament_id, kind, fingerprint) where status = 'open'
        do update set payload = excluded.payload, run_id = excluded.run_id, updated_at = now();
        v_held := v_held + 1;
        continue;
      end if;
    end if;

    v_format := case r ->> 'discipline' when 'XD' then 'mixed' when 'MD' then 'doubles' when 'WD' then 'doubles' else 'singles' end;
    v_gender := case r ->> 'discipline' when 'XD' then 'mixed' when 'WS' then 'f' when 'WD' then 'f' else 'm' end;
    v_starts := ((r ->> 'date')::date + coalesce(nullif(r ->> 'time', '')::time, time '00:00')) at time zone 'Europe/Athens';

    -- the event is the organiser's category (level) in its format
    select id into v_event from core.tournament_events
     where tournament_id = p_tournament_id and name = coalesce(r ->> 'level', 'OPEN') and format = v_format;
    if v_event is null then
      insert into core.tournament_events (tournament_id, name, format, gender)
      values (p_tournament_id, coalesce(r ->> 'level', 'OPEN'), v_format, v_gender) returning id into v_event;
    end if;

    v_m := null;
    v_fresh := false;
    select * into v_m from core.matches where id = core.ingest_match_by_ref(r ->> 'fingerprint', p_tournament_id);
    if v_m.id is null then
      v_key := core.ingest_row_key(v_sides);
      if v_key is not null then
        -- moved: the same people in the same category, still to play, under another day's fingerprint the sheet
        -- no longer has; it takes the new day and fingerprint, votes carry over
        select * into v_m from core.matches m
         where m.tournament_id = p_tournament_id and m.source = 'import' and m.event_id = v_event
           and m.status in ('announced', 'scheduled') and m.resolved_at is null
           and not exists (select 1 from core.match_results x where x.match_id = m.id)
           and core.match_people_key(m.id) = v_key
           and abs(extract(epoch from m.starts_at - v_starts)) < 21 * 86400
           and m.source_ref not in (select x ->> 'fingerprint' from jsonb_array_elements(p_rows) x)
         order by abs(extract(epoch from m.starts_at - v_starts))
         limit 1;
        if v_m.id is not null then
          update core.matches
             set starts_at = v_starts, source_ref = r ->> 'fingerprint', updated_at = now(), postponed_at = null,
                 provenance = provenance - 'missing_runs' || jsonb_build_object('moved_from', v_m.source_ref, 'moved_at', now(),
                                                                                'moved_from_at', v_m.starts_at,
                                                                                'tab', r ->> 'tab', 'row', r -> 'row')
           where id = v_m.id returning * into v_m;
          v_moved := v_moved + 1;
          v_fresh := true;
        else
          -- a match a player logged: the same people, format and day (a day either way); the sheet becomes its
          -- official source, no second match
          select * into v_m from core.matches m
           where m.source = 'user' and m.status <> 'void' and m.format = v_format and m.source_ref is null
             and m.starts_at is not null
             and core.athens_day(m.starts_at) between (r ->> 'date')::date - 1 and (r ->> 'date')::date + 1
             and core.match_people_key(m.id) = v_key
           order by m.created_at
           limit 1;
          if v_m.id is not null then
            update core.matches
               set tournament_id = p_tournament_id, event_id = v_event, source_ref = r ->> 'fingerprint', updated_at = now(),
                   provenance = provenance || jsonb_build_object('official', jsonb_build_object(
                                  'tab', r ->> 'tab', 'row', r -> 'row', 'category_raw', r ->> 'category_raw',
                                  'level', r ->> 'level', 'discipline', r ->> 'discipline', 'attached_at', now(), 'run_id', p_run))
             where id = v_m.id returning * into v_m;
            v_attached := v_attached + 1;
            v_fresh := true;
          end if;
        end if;
      end if;
    end if;
    if v_fresh then
      null;  -- just moved or attached above
    elsif v_m.id is not null then
      -- a known match: follow the sheet's time while it is still to play; the sheet may say it is off for now
      if v_m.resolved_at is null and not exists (select 1 from core.match_results x where x.match_id = v_m.id) then
        update core.matches set starts_at = v_starts where id = v_m.id and starts_at is distinct from v_starts;
        if coalesce((r ->> 'postponed')::boolean, false) then
          update core.matches set postponed_at = coalesce(postponed_at, now()) where id = v_m.id;
        elsif v_m.postponed_at is not null then
          update core.matches set postponed_at = null where id = v_m.id;
        end if;
      end if;
      v_upd := v_upd + 1;
    else
      insert into core.matches (sport_id, format, status, starts_at, venue, area_id, tournament_id, event_id,
                                source, source_ref, counts_for_levels, provenance)
      values (v_t.sport_id, v_format, 'scheduled', v_starts, v_t.venue, v_t.area_id, p_tournament_id, v_event,
              'import', r ->> 'fingerprint', true,
              jsonb_build_object('tab', r ->> 'tab', 'row', r -> 'row', 'category_raw', r ->> 'category_raw',
                                 'level', r ->> 'level', 'discipline', r ->> 'discipline', 'flags', r -> 'flags',
                                 'imported_by', p_by, 'imported_at', now(), 'run_id', p_run))
      returning * into v_m;
      if coalesce((r ->> 'postponed')::boolean, false) then
        update core.matches set postponed_at = now() where id = v_m.id;
      end if;
      for v_side in 1..2 loop
        v_pos := 0;
        for v_person in select * from jsonb_array_elements(v_sides -> ('side' || v_side)) loop
          v_pos := v_pos + 1;
          insert into core.match_participants (match_id, side, player_id, position)
          values (v_m.id, v_side, core.import_person(v_person, p_by), v_pos);
        end loop;
      end loop;
      v_new := v_new + 1;
    end if;

    -- the organiser's score is the result; it cannot change a match that already resolved
    if r -> 'result' is not null and jsonb_typeof(r -> 'result') = 'object' then
      if coalesce((r -> 'result' ->> 'walkover')::boolean, false) and r -> 'result' ->> 'winner_side' is null then
        -- the sheet says «wo» and not who: staff pick the winner
        if not exists (select 1 from core.match_results x where x.match_id = v_m.id) then
          insert into core.ingest_reviews (tournament_id, run_id, kind, fingerprint, match_id, payload)
          values (p_tournament_id, p_run, 'walkover', r ->> 'fingerprint', v_m.id, jsonb_build_object('row', r))
          on conflict (tournament_id, kind, fingerprint) where status = 'open' do nothing;
          if found then v_wo := v_wo + 1; end if;
        end if;
      elsif exists (select 1 from core.match_results x
                     where x.match_id = v_m.id and x.winner_side = (r -> 'result' ->> 'winner_side')::int
                       and x.sets = r -> 'result' -> 'sets') then
        null;  -- the same score as last time: nothing to do
      elsif v_m.resolved_at is null then
        perform core.set_result(v_m.id, (r -> 'result' ->> 'winner_side')::int, r -> 'result' -> 'sets', null, null,
                                false, coalesce((r -> 'result' ->> 'walkover')::boolean, false), p_by);
        v_res := v_res + 1;
      elsif v_m.source = 'user' then
        -- the organiser's score differs from what the players settled: staff decide (corrections of a resolved
        -- match go through the moderation desk)
        insert into core.ingest_reviews (tournament_id, run_id, kind, fingerprint, match_id, payload)
        values (p_tournament_id, p_run, 'score_conflict', r ->> 'fingerprint', v_m.id, jsonb_build_object('row', r))
        on conflict (tournament_id, kind, fingerprint) where status = 'open' do nothing;
        if found then v_conflict := v_conflict + 1; end if;
      else
        v_skip := v_skip + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object('created', v_new, 'updated', v_upd, 'results', v_res, 'results_skipped', v_skip,
                            'new_players', (select count(*) from core.players) - v_people,
                            'linked', v_linked, 'held_for_review', v_held, 'walkovers_to_decide', v_wo,
                            'moved', v_moved, 'attached', v_attached, 'score_conflicts', v_conflict);
end;
$$;

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
    'moved_from', case when (m.provenance ->> 'moved_at')::timestamptz > now() - interval '7 days' then m.provenance -> 'moved_from_at' end)
    from (select 1) x
    left join core.tournament_events e on e.id = m.event_id
    left join core.match_results r on r.match_id = m.id
$$;

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
                 'split', case when mv.id is not null then core.vote_split(m.id) end,
                 'moved_from', case when (m.provenance ->> 'moved_at')::timestamptz > now() - interval '3 days' then m.provenance -> 'moved_from_at' end) as card
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

  v_content := v_content || coalesce((
    select jsonb_agg(jsonb_build_object(
             'kind', 'postponed', 'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
             'tournament', case when t.id is not null then jsonb_build_object('id', t.id, 'name', t.name) end,
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
