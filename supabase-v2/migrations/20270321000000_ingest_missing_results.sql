-- Results the sheets post come over by themselves (founder, 25 Oct 2026: "you miss results that are posted: the sheets
-- have them but you don't bring them over to admin").
--
-- What a read of every active sheet against the database showed on 25 Oct (read only):
--   * the schedule sheet's results column: 4 played ΑΟΚ matches of 24 Oct with no result, and 13 more since 10 Oct that
--     staff typed in by hand because the parser did not read the score (6 retirements, 6 tie-breaks, 1 dashed run):
--     retirements («46 34 ret», «26-01 RET»,
--     «3-0 ret»), a match tie-break written without a dash («63 46 810», «57 61 107», «61 26 1210») and sets run
--     together («36-64-10-8», «63-5710-5»). packages/ingest reads them now (score.ts); the parts here are the database
--     side of it.
--   * the draw sheet: the bracket says who went through, also for walkovers (the schedule's bare «wo» never says who),
--     and it was stored but never used for results. 14 ΑΟΚ matches waited with no result while the draw had it: 11
--     walkovers whose row the organiser then took off the schedule (the match went «off the sheet»), 3 scores.
--   * the ingest itself is healthy: every cron read since 21 Oct ran at 08:00, 15:00 and 22:00 Athens, all `ok`.
--
-- 1. core.ingest_apply passes the sheet's «retired» to core.set_result (it always sent false, and the database only
--    takes an unfinished last set from a retirement). A row with a result but no match (held for staff) no longer
--    reaches set_result.
-- 2. core.ingest_draw_results, run by every draw read (cron and «Update now»; the dry run reports it and rolls back):
--    a knockout match the draw gives a winner for (a walkover, or a score) goes to the one match of this tournament,
--    same format and category, whose two sides are the draw's two pairs (each person by player id or by surname, both
--    ways round, so brothers on one side need no telling apart). Only a match with no result that is not resolved; never
--    when any match of those people already has a result (a stale twin stays for staff); never when two matches fit.
--    The draw's winner and its games (winner first, 7-6 marked tb, a match tie-break stb), walkover and retired as the
--    draw says. An open walkover card for that match closes (`draw_result`), and the match is no longer «off the
--    sheet» (it has its result). One score the database refuses skips that match only.
--    Only matches from 26 Oct 2026 (Athens day) on: earlier waiting ones are left alone (founder, 25 Oct: «ignore past
--    walkovers, we fix from now on»); draw results with no match are never turned into matches.
--    Decision recorded: the founder's 12 Oct rule «the admin picks a wo winner» was about the schedule's bare «wo»;
--    the draw names who went through, and «the organiser's score always overrides» (same day), so the draw decides.
-- No data is written by this migration: the next read (cron, or «Update now» on the tournament) brings them in.

-- ---------------------------------------------------------------------------
-- 2. draw results
-- ---------------------------------------------------------------------------

-- a draw side's people ({id, sn}: the player id when the draw linked one, the surname as search text) are exactly the
-- players on one side of a match: as many, each draw person there by id or surname, each player there a draw person
create or replace function core.draw_side_fits(p_people jsonb, p_match uuid, p_side int)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  with mp as (
    select pl.id, pl.surname_norm from core.match_participants x join core.players pl on pl.id = x.player_id
     where x.match_id = p_match and x.side = p_side
  ), d as (
    select nullif(x ->> 'id', '')::uuid as id, x ->> 'sn' as sn from jsonb_array_elements(coalesce(p_people, '[]'::jsonb)) x
  )
  select (select count(*) from d) > 0
     and (select count(*) from d) = (select count(*) from mp)
     and not exists (select 1 from d where not exists (select 1 from mp where mp.id = d.id or mp.surname_norm = d.sn))
     and not exists (select 1 from mp where not exists (select 1 from d where mp.id = d.id or mp.surname_norm = d.sn))
$$;

-- the draw's sets (side 1 of the draw first) as the database keeps them for that winner (toDbSets in packages/ingest)
create or replace function core.draw_db_sets(p_sets jsonb, p_winner int)
returns jsonb
language sql immutable set search_path = core, pg_temp
as $$
  select coalesce(jsonb_agg(
           case when coalesce((s ->> 'tb')::boolean, false) then jsonb_build_object('w', w, 'l', l, 'stb', true)
                when greatest(w, l) = 7 and least(w, l) = 6 then jsonb_build_object('w', w, 'l', l, 'tb', true)
                else jsonb_build_object('w', w, 'l', l) end order by n), '[]'::jsonb)
    from jsonb_array_elements(coalesce(p_sets, '[]'::jsonb)) with ordinality x(s, n),
         lateral (select case when p_winner = 1 then (s -> 'g' ->> 0)::int else (s -> 'g' ->> 1)::int end as w,
                         case when p_winner = 1 then (s -> 'g' ->> 1)::int else (s -> 'g' ->> 0)::int end as l) g
$$;

create or replace function core.ingest_draw_results(p_tournament_id uuid, p_by uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  d        record;
  c        record;
  v_n      int;
  v_known  boolean;
  v_m      uuid;
  v_orient int;
  v_win    int;
  v_wo     boolean;
  v_ret    boolean;
  v_done   int := 0;
  v_amb    int := 0;
  v_failed int := 0;
  v_format text;
  -- founder, 25 Oct: «ignore past walkovers, we fix from now on». The draw fills only matches from this Athens day
  -- on; earlier waiting matches stay as they are (staff can still decide them by hand)
  c_from   constant date := date '2026-10-26';
begin
  for d in
    with dm as (
      select t.tab, t.discipline, t.level, t.draw, (rm ->> 'round')::int as rnd, (rm ->> 'slot')::int as slot, rm
        from core.tournament_draws t,
             jsonb_array_elements(coalesce(t.draw -> 'rounds', '[]'::jsonb)) rr, jsonb_array_elements(rr) rm
       where t.tournament_id = p_tournament_id and t.format = 'knockout'
         and rm ->> 'winner' in ('1', '2') and not coalesce((rm ->> 'bye')::boolean, false)
         and (coalesce((rm ->> 'walkover')::boolean, false)
              or jsonb_array_length(coalesce(rm -> 'sets', '[]'::jsonb)) >= case when coalesce((rm ->> 'retired')::boolean, false) then 1 else 2 end)
    ), sides as (
      -- the entrant behind each side: the one in that side's part of the bracket whose surname the side starts with
      select dm.*, k.k,
             (select jsonb_agg(e -> 'players')
                from jsonb_array_elements(coalesce(dm.draw -> 'entrants', '[]'::jsonb)) e
               where (e ->> 'pos')::int between (dm.slot - 1) * (1 << dm.rnd) + 1 + (k.k - 1) * (1 << (dm.rnd - 1))
                                            and (dm.slot - 1) * (1 << dm.rnd) + k.k * (1 << (dm.rnd - 1))
                 and not coalesce((e ->> 'bye')::boolean, false)
                 and core.normalize_search(split_part(core.fold_lookalikes(btrim(e ->> 'raw')), ' ', 1))
                   = core.normalize_search(split_part(core.fold_lookalikes(btrim(coalesce(dm.rm ->> ('side' || k.k), ''))), ' ', 1))) as found
        from dm, (values (1), (2)) k(k)
    )
    select a.tab, a.discipline, a.level, a.rnd, a.slot, a.rm,
           (select jsonb_agg(jsonb_build_object('id', core.current_player(nullif(x ->> 'player_id', '')::uuid),
                                                'sn', core.normalize_search(split_part(core.fold_lookalikes(btrim(x ->> 'raw')), ' ', 1))))
              from jsonb_array_elements(a.found -> 0) x) as p1,
           (select jsonb_agg(jsonb_build_object('id', core.current_player(nullif(x ->> 'player_id', '')::uuid),
                                                'sn', core.normalize_search(split_part(core.fold_lookalikes(btrim(x ->> 'raw')), ' ', 1))))
              from jsonb_array_elements(b.found -> 0) x) as p2
      from sides a join sides b on b.tab = a.tab and b.rnd = a.rnd and b.slot = a.slot and b.k = 2
     where a.k = 1 and jsonb_array_length(coalesce(a.found, '[]'::jsonb)) = 1 and jsonb_array_length(coalesce(b.found, '[]'::jsonb)) = 1
  loop
    continue when d.p1 is null or d.p2 is null;
    v_format := case d.discipline when 'XD' then 'mixed' when 'MD' then 'doubles' when 'WD' then 'doubles' else 'singles' end;
    v_n := 0;
    v_known := false;
    v_m := null;
    v_orient := null;
    for c in
      select m.id, m.source, m.resolved_at, m.status, core.athens_day(m.starts_at) as day,
             exists (select 1 from core.match_results x where x.match_id = m.id) as has_res,
             case when core.draw_side_fits(d.p1, m.id, 1) and core.draw_side_fits(d.p2, m.id, 2) then 1
                  when core.draw_side_fits(d.p1, m.id, 2) and core.draw_side_fits(d.p2, m.id, 1) then 2 end as orient
        from core.matches m left join core.tournament_events e on e.id = m.event_id
       where m.tournament_id = p_tournament_id and m.status <> 'void' and m.format = v_format
         and core.level_close(coalesce(e.name, m.provenance ->> 'level', ''), d.level)
         -- cheap first: someone of the draw's side 1 plays in it
         and exists (select 1 from core.match_participants mp join core.players pl on pl.id = mp.player_id
                      where mp.match_id = m.id
                        and (pl.id in (select nullif(x ->> 'id', '')::uuid from jsonb_array_elements(d.p1) x)
                             or pl.surname_norm in (select x ->> 'sn' from jsonb_array_elements(d.p1) x)))
    loop
      continue when c.orient is null;
      if c.has_res or c.resolved_at is not null then
        v_known := true;
      elsif c.source = 'import' and c.day >= c_from then
        v_n := v_n + 1;
        v_m := c.id;
        v_orient := c.orient;
      end if;
    end loop;
    continue when v_known or v_n = 0;
    if v_n > 1 then
      v_amb := v_amb + 1;
      continue;
    end if;
    v_win := case when v_orient = 1 then (d.rm ->> 'winner')::int else 3 - (d.rm ->> 'winner')::int end;
    v_wo := coalesce((d.rm ->> 'walkover')::boolean, false);
    v_ret := coalesce((d.rm ->> 'retired')::boolean, false) and not v_wo;
    begin
      perform core.set_result(v_m, v_win,
                              case when v_wo then '[]'::jsonb else core.draw_db_sets(d.rm -> 'sets', (d.rm ->> 'winner')::int) end,
                              null, null, v_ret, v_wo, p_by);
      update core.matches
         set postponed_at = null, updated_at = now(),
             provenance = (provenance - 'missing_runs' - 'postponed_by')
                          || jsonb_build_object('result_from_draw', jsonb_build_object('tab', d.tab, 'round', d.rnd, 'slot', d.slot,
                                                                                       'score_raw', d.rm ->> 'scoreRaw', 'at', now()))
       where id = v_m;
      update core.ingest_reviews
         set status = 'done', resolved_by = p_by, resolved_at = now(), updated_at = now(),
             payload = payload || jsonb_build_object('closed', jsonb_build_object('reason', 'draw_result', 'by', 'sheet', 'at', now()))
       where match_id = v_m and kind = 'walkover' and status = 'open';
      v_done := v_done + 1;
    exception when others then
      v_failed := v_failed + 1;
    end;
  end loop;
  return jsonb_build_object('draw_results', v_done, 'draw_results_unclear', v_amb, 'draw_results_failed', v_failed);
end;
$$;
revoke all on function core.draw_side_fits(jsonb, uuid, int) from public;
revoke all on function core.draw_db_sets(jsonb, int) from public;
revoke all on function core.ingest_draw_results(uuid, uuid) from public;

-- every draw read applies what the draw says (the dry run counts it and rolls it back with the rest)
create or replace function core.ingest_draw_run(p_tournament_id uuid, p_draws jsonb, p_trigger text, p_by uuid, p_error text default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_counts jsonb;
  v_seen   int := coalesce(jsonb_array_length(p_draws), 0);
  v_run    uuid;
begin
  if p_error is not null then
    insert into core.ingest_runs (tournament_id, kind, trigger, started_by, health, error)
    values (p_tournament_id, 'draws', p_trigger, p_by, 'error', left(p_error, 500)) returning id into v_run;
    return jsonb_build_object('run_id', v_run, 'health', 'error');
  end if;
  if p_trigger = 'dry' then
    begin
      v_counts := core.ingest_draws(p_tournament_id, p_draws);
      v_counts := v_counts || core.ingest_draw_results(p_tournament_id, p_by);
      raise exception 'np_dry_run' using detail = v_counts::text;
    exception when raise_exception then
      if sqlerrm <> 'np_dry_run' then raise; end if;
      get stacked diagnostics v_counts = pg_exception_detail;
    end;
  else
    v_counts := core.ingest_draws(p_tournament_id, p_draws);
    -- an empty read (a sheet that could not be parsed) keeps the stored draws, and decides nothing new from them
    if v_seen > 0 then
      v_counts := v_counts || core.ingest_draw_results(p_tournament_id, p_by);
    end if;
  end if;
  insert into core.ingest_runs (tournament_id, kind, trigger, started_by, rows_seen, counts, health)
  values (p_tournament_id, 'draws', p_trigger, p_by, v_seen, v_counts, case when v_seen = 0 then 'empty' else 'ok' end)
  returning id into v_run;
  return jsonb_build_object('run_id', v_run, 'dry', p_trigger = 'dry', 'rows_seen', v_seen) || v_counts;
end;
$$;
revoke all on function core.ingest_draw_run(uuid, jsonb, text, uuid, text) from public;

-- ---------------------------------------------------------------------------
-- 1. the schedule's results: a retirement is a retirement
-- ---------------------------------------------------------------------------
-- core.ingest_apply as in 20270216000000_ingest_row_identity.sql, two changes in the result step at the end: the row's
-- `retired` reaches set_result, and a row with no match (held for staff) is not sent there.
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
  v_smart   jsonb;
  v_picks   jsonb;
  v_hold    jsonb;
  v_pick    jsonb;
  v_auto    jsonb := '{}'::jsonb;
  v_recat   int := 0;
  v_people_j jsonb;
  v_cand    uuid;
  v_twin    uuid;
  v_lu      jsonb;
  v_place   jsonb;
  v_newp    uuid;
  v_oldp    uuid;
  v_changed jsonb;
  v_typos   jsonb;
  v_relink  int := 0;
  v_replace int := 0;
  v_ename   text;
begin
  select * into v_t from core.tournaments where id = p_tournament_id;
  if not found then raise exception 'tournament_not_found' using errcode = 'P0002'; end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    v_known := core.ingest_match_by_ref(r ->> 'fingerprint', p_tournament_id) is not null;
    v_picks := '[]'::jsonb;

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
            -- Latin look-alikes inside a Greek name are Greek («ΖΑΝNΗΣ»)
            v_person := core.fold_person(v_person);
            v_dec := core.ingest_person(v_person, p_tournament_id);
            if v_dec ->> 'how' in ('alias', 'match', 'tournament', 'surname') and (v_dec ->> 'player_id') = any (v_used) then
              -- two people on one row cannot be the same player (brothers with initials): staff decide
              v_unclear := v_unclear || jsonb_build_array(v_person || jsonb_build_object('slot', v_side || ':' || v_pos, 'candidates', core.ingest_candidates(v_person)));
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
              v_unclear := v_unclear || jsonb_build_array(v_person || jsonb_build_object('slot', v_side || ':' || v_pos, 'candidates', v_dec -> 'candidates'));
            end if;
          end if;
          v_pos := v_pos + 1;
        end loop;
      end loop;
      -- the safe rules first (brothers, a known pair, the only one who played this category); never more
      v_picks := '[]'::jsonb;
      if jsonb_array_length(v_unclear) > 0 then
        v_smart := core.ingest_smart_names(p_tournament_id, r, v_sides, v_unclear);
        v_sides := v_smart -> 'sides';
        v_unclear := v_smart -> 'unclear';
        v_picks := v_smart -> 'picks';
      end if;
      if jsonb_array_length(v_unclear) > 0 then
        -- held: what a rule decided stays decided on the card; each name left gets its candidates with context
        v_hold := r;
        for v_pick in select * from jsonb_array_elements(v_picks) loop
          v_hold := jsonb_set(v_hold, array['side' || split_part(v_pick ->> 'slot', ':', 1), split_part(v_pick ->> 'slot', ':', 2)],
                              v_sides -> ('side' || split_part(v_pick ->> 'slot', ':', 1)) -> split_part(v_pick ->> 'slot', ':', 2)::int);
        end loop;
        insert into core.ingest_reviews (tournament_id, run_id, kind, fingerprint, payload)
        values (p_tournament_id, p_run, 'people', r ->> 'fingerprint',
                jsonb_build_object('row', v_hold, 'unclear', core.ingest_enrich_unclear(p_tournament_id, r, v_sides, v_unclear)))
        on conflict (tournament_id, kind, fingerprint) where status = 'open'
        do update set payload = excluded.payload, run_id = excluded.run_id, updated_at = now();
        v_held := v_held + 1;
        continue;
      end if;
      for v_pick in select * from jsonb_array_elements(v_picks) loop
        v_auto := jsonb_set(v_auto, array[v_pick ->> 'rule'], to_jsonb(coalesce((v_auto ->> (v_pick ->> 'rule'))::int, 0) + 1));
        v_linked := v_linked + 1;
      end loop;
      if jsonb_array_length(v_picks) > 0 then
        -- the decision this row waited for was taken by a rule: it leaves the list, saying which
        update core.ingest_reviews
           set status = 'done', resolved_at = now(), updated_at = now(), payload = payload || jsonb_build_object('auto', v_picks)
         where tournament_id = p_tournament_id and kind = 'people' and fingerprint = r ->> 'fingerprint' and status = 'open';
      end if;
    end if;

    v_format := case r ->> 'discipline' when 'XD' then 'mixed' when 'MD' then 'doubles' when 'WD' then 'doubles' else 'singles' end;
    v_gender := case r ->> 'discipline' when 'XD' then 'mixed' when 'WS' then 'f' when 'WD' then 'f' else 'm' end;
    v_starts := ((r ->> 'date')::date + coalesce(nullif(r ->> 'time', '')::time, time '00:00')) at time zone 'Europe/Athens';

    -- the event is the organiser's category (level) in its format
    -- (a typo of one it already has, «MMEDIUM», is that one)
    v_event := core.snap_event(p_tournament_id, coalesce(r ->> 'level', 'OPEN'), v_format);
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
      if v_m.id is null then
        -- the organiser edited the row (a substitute, a category or name typo): the match at the same time with
        -- these players is this row, not a new one
        v_people_j := core.ingest_row_people(r, v_sides);
        v_twin := null;
        for v_cand in
          select m.id from core.matches m left join core.tournament_events e on e.id = m.event_id
           where m.tournament_id = p_tournament_id and m.source = 'import' and m.status <> 'void'
             and m.starts_at = v_starts and m.format = v_format
             and (m.court is null or nullif(btrim(r ->> 'court'), '') is null or m.court = btrim(r ->> 'court'))
             and core.level_close(coalesce(e.name, m.provenance ->> 'level', ''), coalesce(r ->> 'level', 'OPEN'))
             and m.source_ref not in (select x ->> 'fingerprint' from jsonb_array_elements(p_rows) x)
           order by m.created_at
        loop
          v_lu := core.lineup_match(v_cand, v_people_j);
          -- a match with a result takes the row only when everyone is the same (a new spelling or category of a
          -- played match, never a second copy of it); its players are never changed
          if core.lineup_same_match(v_lu, v_format)
             and ((v_lu ->> 'kept')::int = (v_lu ->> 'total')::int
                  and (v_lu ->> 'total')::int = (select count(*) from core.match_participants where match_id = v_cand)
                  or (not exists (select 1 from core.match_results x where x.match_id = v_cand)
                      and (select resolved_at is null and status in ('announced', 'scheduled') from core.matches where id = v_cand))) then
            v_twin := v_cand;
            exit;
          end if;
        end loop;
        if v_twin is not null then
          if ((v_lu ->> 'kept')::int = (v_lu ->> 'total')::int
              and (v_lu ->> 'total')::int = (select count(*) from core.match_participants where match_id = v_twin))
             or (v_format <> 'singles' and (v_lu ->> 'sides_kept')::int = 2) then
            -- everyone is still there, or one partner changed on a side that keeps someone: the same match, its
            -- votes stay
            v_changed := '[]'::jsonb;
            for v_place in select * from jsonb_array_elements(v_lu -> 'places') loop
              if v_place ->> 'player_id' is null then
                v_side := split_part(v_place ->> 'slot', ':', 1)::int;
                v_oldp := (select mp.player_id from core.match_participants mp
                            where mp.match_id = v_twin and mp.side = v_side
                              and mp.player_id not in (select (x ->> 'player_id')::uuid from jsonb_array_elements(v_lu -> 'places') x
                                                        where x ->> 'player_id' is not null)
                            limit 1);
                v_newp := core.import_person(v_sides -> ('side' || v_side) -> split_part(v_place ->> 'slot', ':', 2)::int, p_by);
                update core.match_participants set player_id = v_newp where match_id = v_twin and side = v_side and player_id = v_oldp;
                v_changed := v_changed || jsonb_build_array(jsonb_build_object('slot', v_place ->> 'slot', 'from', v_oldp, 'to', v_newp));
              end if;
            end loop;
            v_typos := (select coalesce(jsonb_agg(x ->> 'slot'), '[]'::jsonb) from jsonb_array_elements(v_lu -> 'places') x where (x ->> 'typo')::boolean);
            select e.name into v_ename from core.matches m left join core.tournament_events e on e.id = m.event_id where m.id = v_twin;
            update core.matches
               set source_ref = r ->> 'fingerprint', event_id = v_event, updated_at = now(), postponed_at = null,
                   provenance = (provenance - 'missing_runs') || jsonb_build_object('level', r ->> 'level', 'row_identity', jsonb_strip_nulls(jsonb_build_object(
                                  'from_ref', source_ref, 'at', now(), 'run_id', p_run,
                                  'lineup_changed', case when jsonb_array_length(v_changed) > 0 then v_changed end,
                                  'name_typo', case when jsonb_array_length(v_typos) > 0 then v_typos end,
                                  'category_changed', case when event_id is distinct from v_event
                                                           then jsonb_build_object('from', v_ename, 'to', r ->> 'level') end)))
             where id = v_twin returning * into v_m;
            v_relink := v_relink + 1;
            v_fresh := true;
          else
            -- a singles player or a whole side changed: another match; the old one is voided (its votes close with
            -- no points) and this row makes a new one people can vote on
            perform core.void_stale_match(v_twin, jsonb_build_object('replaced_by_ref', r ->> 'fingerprint', 'replaced_at', now(),
                                                                     'reason', 'lineup_changed'));
            v_replace := v_replace + 1;
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
      -- the draw sheet put this row in another category (packages/ingest, level_from_draw): the match moves there
      if coalesce(r -> 'flags', '[]'::jsonb) ? 'level_from_draw' and v_m.event_id is distinct from v_event then
        update core.matches
           set event_id = v_event, updated_at = now(),
               provenance = provenance || jsonb_build_object('level', r ->> 'level', 'recategorised',
                              jsonb_build_object('from_event', v_m.event_id, 'from_level', v_m.provenance ->> 'level', 'at', now(), 'run_id', p_run))
         where id = v_m.id;
        v_recat := v_recat + 1;
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
    elsif jsonb_array_length(coalesce(v_sides -> 'side1', '[]'::jsonb)) <> (case v_format when 'singles' then 1 else 2 end)
       or jsonb_array_length(coalesce(v_sides -> 'side2', '[]'::jsonb)) <> (case v_format when 'singles' then 1 else 2 end) then
      -- a side that does not fit the format (16 Oct, ΑΟΚ: «match_sides_incomplete»): held with the sheet's words
      insert into core.ingest_reviews (tournament_id, run_id, kind, fingerprint, payload)
      values (p_tournament_id, p_run, 'people', r ->> 'fingerprint',
              jsonb_build_object('row', r, 'unclear', (
                select coalesce(jsonb_agg(x || jsonb_build_object('candidates', '[]'::jsonb, 'reason', 'side_incomplete')), '[]'::jsonb)
                  from jsonb_array_elements(coalesce(v_sides -> 'side1', '[]'::jsonb) || coalesce(v_sides -> 'side2', '[]'::jsonb)) x)))
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
                                 'imported_by', p_by, 'imported_at', now(), 'run_id', p_run)
              || case when jsonb_array_length(v_picks) > 0 then jsonb_build_object('smart_names', v_picks) else '{}'::jsonb end,
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
    if v_m.id is not null and r -> 'result' is not null and jsonb_typeof(r -> 'result') = 'object' then
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
        -- «46 34 ret»: the sheet's retirement, so an unfinished last set is allowed (core.check_match_result)
        perform core.set_result(v_m.id, (r -> 'result' ->> 'winner_side')::int, r -> 'result' -> 'sets', null, null,
                                coalesce((r -> 'result' ->> 'retired')::boolean, false),
                                coalesce((r -> 'result' ->> 'walkover')::boolean, false), p_by);
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
                            'moved', v_moved, 'attached', v_attached, 'score_conflicts', v_conflict,
                            'auto_brothers', coalesce((v_auto ->> 'brothers')::int, 0),
                            'auto_pair', coalesce((v_auto ->> 'known_pair')::int, 0),
                            'auto_category', coalesce((v_auto ->> 'category')::int, 0),
                            'recategorised', v_recat, 'relinked', v_relink, 'replaced', v_replace);
end;
$$;
revoke all on function core.ingest_apply(uuid, jsonb, uuid, uuid) from public;
