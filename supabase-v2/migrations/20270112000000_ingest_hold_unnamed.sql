-- One row must never stop a tournament's run (founder, 16 Oct 2026: «Couldn't read the link today at 08:00:
-- person_unresolved» for ΑΟΚ Tennis Open; every schedule run since 22:00 on 15 Oct had failed while the draws went on).
-- A new match with a place that has no usable name (an empty cell, a doubles «/» with nobody after it) is now held as
-- a decision on the Tournaments page with the sheet's words, and the rest of the sheet goes in.

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
  v_club    uuid;
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
        if coalesce((r ->> 'postponed')::boolean, false) then
          update core.matches set starts_at = v_starts, postponed_at = coalesce(postponed_at, now()) where id = v_m.id;
        elsif v_m.postponed_at is not null and v_m.provenance ->> 'postponed_by' in ('staff', 'auto') and v_m.starts_at = v_starts then
          null;  -- called off for rain (by staff, or by the 15:00 rule) and the sheet still shows the old day: it stays off until the sheet moves it
        else
          update core.matches set starts_at = v_starts, postponed_at = null, provenance = provenance - 'postponed_by'
           where id = v_m.id and (starts_at is distinct from v_starts or postponed_at is not null);
        end if;
      end if;
      v_upd := v_upd + 1;
    elsif exists (select 1 from jsonb_array_elements(coalesce(v_sides -> 'side1', '[]'::jsonb) || coalesce(v_sides -> 'side2', '[]'::jsonb)) x
                   where not (x ? 'player_id')
                     and coalesce(btrim(x -> 'new' ->> 'surname'), '') = '') then
      -- a place on the card with no name we can use (an empty cell, a «/» with nobody after it): one row like this
      -- stopped the whole tournament's run (15 Oct, ΑΟΚ: «person_unresolved»). It waits for staff instead, showing
      -- what the sheet says; every other row goes on.
      insert into core.ingest_reviews (tournament_id, run_id, kind, fingerprint, payload)
      values (p_tournament_id, p_run, 'people', r ->> 'fingerprint',
              jsonb_build_object('row', r, 'unclear', (
                select coalesce(jsonb_agg(x || jsonb_build_object('candidates', '[]'::jsonb, 'reason', 'no_name')), '[]'::jsonb)
                  from jsonb_array_elements(coalesce(v_sides -> 'side1', '[]'::jsonb) || coalesce(v_sides -> 'side2', '[]'::jsonb)) x
                 where not (x ? 'player_id') and coalesce(btrim(x -> 'new' ->> 'surname'), '') = '')))
      on conflict (tournament_id, kind, fingerprint) where status = 'open'
      do update set payload = excluded.payload, run_id = excluded.run_id, updated_at = now();
      v_held := v_held + 1;
    else
      insert into core.matches (sport_id, format, status, starts_at, venue, area_id, tournament_id, event_id,
                                source, source_ref, counts_for_levels, provenance, club_id, court)
      values (v_t.sport_id, v_format, 'scheduled', v_starts, coalesce(nullif(btrim(r ->> 'club'), ''), v_t.venue), v_t.area_id, p_tournament_id, v_event,
              'import', r ->> 'fingerprint', true,
              jsonb_build_object('tab', r ->> 'tab', 'row', r -> 'row', 'category_raw', r ->> 'category_raw',
                                 'level', r ->> 'level', 'discipline', r ->> 'discipline', 'flags', r -> 'flags',
                                 'imported_by', p_by, 'imported_at', now(), 'run_id', p_run),
              core.club_for(r ->> 'club'), nullif(btrim(r ->> 'court'), ''))
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

    -- the source names the club and court (athenstennis.gr): the club decides the surface
    v_club := core.club_for(r ->> 'club');
    if v_club is not null then
      update core.matches set club_id = v_club, court = coalesce(nullif(btrim(r ->> 'court'), ''), court),
                              venue = btrim(r ->> 'club')
       where id = v_m.id and (club_id is distinct from v_club or court is distinct from coalesce(nullif(btrim(r ->> 'court'), ''), court));
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
