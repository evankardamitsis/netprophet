-- Every read of a sheet re-checks what waits on staff (founder, 22 Oct 2026: "in the admin tournaments I got numerous
-- decisions which don't reflect reality, refresh the sheets when you import to get the latest results"; and "same for
-- results").
--
-- The sheets were always read fresh (Sheets API v4, no cache). What went stale was what the reads left behind: a held
-- row's decision card is keyed by the row's fingerprint (day, category, names), and when the organiser edits the row
-- (a first name added, a partner changed, the match moved or dropped) the next read holds or imports the new
-- fingerprint and nothing ever closed the old card. On 22 Oct 7 of the 10 open cards of ΑΟΚ Tennis Open were rows the
-- sheet no longer had.
--
-- 1. core.ingest_close_stale_reviews: after every healthy schedule read (cron, «Update now», and the dry run, which
--    reports what it would close), open cards of that tournament the sheet no longer supports are closed, with the
--    reason and the run in the card (payload.closed), never deleted:
--      people          the row is gone, or its match exists now (the sheet named the people, or a rule did)
--      walkover        the row is gone, the sheet now says who won, or the match has a result
--      score_conflict  the row is gone, the sheet has no score any more, or its score now equals the stored one
--    A card that still holds stays open (its payload refreshed by the read, as before). Nothing here writes a result,
--    points or σερί: a resolved match is only ever corrected through the moderation desk.
-- 2. Results desk (api.admin_desk): a sheet match the sheet stopped listing (missing two healthy reads in a row) is
--    `off_sheet`, with the day of the second read. It leaves «Need you» (no result is coming from a row that is not
--    there) and is listed apart with «It didn't happen» to void it. Nothing is voided by itself: the 21-day postponed
--    rule stands (founder, 14 Oct).
-- 3. A guess is never evidence for the next guess (founder, 22 Oct: «Θάνος Τζιότζιος / Σέργιος Γεωργίου» should have
--    been Βασίλης). The sheet wrote a bare «ΤΖΙΩΤΖΙΟΣ» (three roster players carry it). A bare-surname alias from a
--    staff answer on 15 Oct (removed 18 Oct) sent a 17 Oct row to Θάνος; on 19 Oct the «known pair» rule took that
--    match as proof Θάνος plays with Γεωργίου and decided the next two rows the same way. Now:
--      * core.named_in_match: a player counts as named on a match when it was logged by a player, or the sheet wrote
--        more than a surname others carry, and no rule picked them;
--      * the known pair and category rules (core.played_together, core.played_level) and a bare surname's «the one
--        in this tournament» (core.ingest_person) count only matches where the player was named, never a voided one;
--      * an account holder among the players a bare or short name can be stops the known pair and category rules:
--        staff decide, as core.ingest_person already does for every looser match.

-- ---------------------------------------------------------------------------
-- 3. named on a match
-- ---------------------------------------------------------------------------

-- the people a fingerprint names, as the sheet wrote them: its last two parts are the sides (pairs joined by «+», the
-- organiser's site by «/»); a fingerprint of another shape names nobody
create or replace function core.fp_people(p_ref text)
returns text[]
language sql immutable parallel safe set search_path = ''
as $$
  select case when cardinality(a) < 4 then '{}'::text[]
              else array(select btrim(t) from unnest(array[a[cardinality(a) - 1], a[cardinality(a)]]) s,
                                regexp_split_to_table(s, '\s*[+/]\s*') t
                          where btrim(t) <> '') end
    from (select string_to_array(coalesce(p_ref, ''), '|') as a) x
$$;

-- the player is on this match because someone named them: logged by a player or staff, or the sheet wrote more than a
-- surname that other roster players carry too; a rule's pick is never named
create or replace function core.named_in_match(p_match uuid, p_player uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select case
    when m.source <> 'import' then true
    when exists (select 1 from jsonb_array_elements(coalesce(m.provenance -> 'smart_names', '[]'::jsonb)) x
                  where x ->> 'player_id' = p_player::text) then false
    when (select count(*) from core.players q where q.surname_norm = pl.surname_norm and q.status = 'active') < 2 then true
    else not exists (select 1 from unnest(core.fp_people(m.source_ref)) t
                      where t !~ '[ .]' and core.normalize_search(t) = pl.surname_norm)
  end
    from core.matches m, core.players pl
   where m.id = p_match and pl.id = p_player
$$;

-- how often two players were partners, on matches (not voided) where both were named
create or replace function core.played_together(p_a uuid, p_b uuid)
returns int
language sql stable security definer set search_path = core, pg_temp
as $$
  select count(*)::int
    from core.match_participants a
    join core.match_participants b on b.match_id = a.match_id and b.side = a.side and b.player_id = p_b
    join core.matches m on m.id = a.match_id
   where a.player_id = p_a and m.status <> 'void'
     and core.named_in_match(m.id, p_a) and core.named_in_match(m.id, p_b)
$$;

-- how many matches (not voided) a player played in a category, named
create or replace function core.played_level(p_player uuid, p_level text)
returns int
language sql stable security definer set search_path = core, pg_temp
as $$
  select count(*)::int
    from core.match_participants mp join core.matches m on m.id = mp.match_id
    left join core.tournament_events e on e.id = m.event_id
   where mp.player_id = p_player and m.status <> 'void'
     and upper(btrim(coalesce(e.name, m.provenance ->> 'level', ''))) = upper(btrim(coalesce(p_level, '')))
     and btrim(coalesce(p_level, '')) <> ''
     and core.named_in_match(m.id, p_player)
$$;

-- the rules stay as they were (20270215000000_ingest_smart_names.sql); this wrapper takes back a known pair or a
-- category pick when an account holder is among the players the name can be: staff decide
alter function core.ingest_smart_names(uuid, jsonb, jsonb, jsonb) rename to ingest_smart_names_rules;

create or replace function core.ingest_smart_names(p_tournament uuid, p_row jsonb, p_sides jsonb, p_unclear jsonb)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_out    jsonb := core.ingest_smart_names_rules(p_tournament, p_row, p_sides, p_unclear);
  v_gender text := core.discipline_gender(p_row ->> 'discipline');
  v_drop   text[] := '{}';
  v_pick   jsonb;
  v_slot   text;
  v_s      text;
  v_sides  jsonb;
  v_keep   jsonb := '[]'::jsonb;
begin
  for v_pick in select * from jsonb_array_elements(coalesce(v_out -> 'picks', '[]'::jsonb)) loop
    if v_pick ->> 'rule' in ('known_pair', 'category')
       and exists (select 1 from core.players pl
                    where pl.id = any (core.ingest_pool(p_row -> ('side' || split_part(v_pick ->> 'slot', ':', 1))
                                                              -> split_part(v_pick ->> 'slot', ':', 2)::int, v_gender))
                      and pl.claimed_by_user_id is not null and pl.id::text <> v_pick ->> 'player_id') then
      v_drop := v_drop || (v_pick ->> 'slot');
      -- a pair is decided together: both places go back
      if v_pick ->> 'rule' = 'known_pair' then
        v_s := split_part(v_pick ->> 'slot', ':', 1);
        v_drop := v_drop || (v_s || ':0') || (v_s || ':1');
      end if;
    end if;
  end loop;
  if cardinality(v_drop) = 0 then return v_out; end if;

  v_sides := v_out -> 'sides';
  foreach v_slot in array v_drop loop
    if p_sides -> ('side' || split_part(v_slot, ':', 1)) -> split_part(v_slot, ':', 2)::int is not null then
      v_sides := jsonb_set(v_sides, array['side' || split_part(v_slot, ':', 1), split_part(v_slot, ':', 2)],
                           p_sides -> ('side' || split_part(v_slot, ':', 1)) -> split_part(v_slot, ':', 2)::int);
    end if;
  end loop;
  for v_pick in select * from jsonb_array_elements(coalesce(v_out -> 'picks', '[]'::jsonb)) loop
    if not (v_pick ->> 'slot' = any (v_drop)) then v_keep := v_keep || jsonb_build_array(v_pick); end if;
  end loop;
  return jsonb_build_object(
    'sides', v_sides,
    'unclear', coalesce(v_out -> 'unclear', '[]'::jsonb)
               || coalesce((select jsonb_agg(u) from jsonb_array_elements(coalesce(p_unclear, '[]'::jsonb)) u
                             where u ->> 'slot' = any (v_drop)
                               and not exists (select 1 from jsonb_array_elements(coalesce(v_out -> 'unclear', '[]'::jsonb)) o
                                                where o ->> 'slot' = u ->> 'slot')), '[]'::jsonb),
    'picks', v_keep);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. the resolver: a bare surname's «the one in this tournament» counts only where that player was named
-- (20270307000000_player_dedupe.sql otherwise)
-- ---------------------------------------------------------------------------
create or replace function core.ingest_person(p jsonb, p_tournament uuid default null)
returns jsonb language plpgsql stable security definer set search_path = 'core', 'extensions', 'pg_temp' as $$
declare
  v_alias uuid;
  v_s     text := core.normalize_search(coalesce(p ->> 'surname', ''));
  v_sur   text := btrim(coalesce(p ->> 'surname', ''));
  v_first text := btrim(coalesce(p ->> 'first', ''));
  v_k1    text;
  v_k2    text;
  v_ss    text;
  v_g     text;
  v_ent   uuid[];
  v_ids   uuid[];
  v_sound uuid[];
  v_pl    core.players;
  v_c     jsonb;
  v_top   numeric;
  v_next  numeric;
begin
  -- a remembered spelling links, hidden players included (they are never imported twice)
  select a.player_id into v_alias from core.player_aliases a
   where a.alias_norm in (core.normalize_search(btrim(coalesce(p ->> 'raw', ''))),
                          core.normalize_search(btrim(coalesce(p ->> 'surname', '') || ' ' || coalesce(p ->> 'first', ''))))
     -- a bare surname remembered while one player carried it says nothing once two do
     and not (a.alias_norm = v_s and (select count(*) from core.players q where q.surname_norm = v_s and q.status = 'active') > 1)
   limit 1;
  if v_alias is not null then return jsonb_build_object('how', 'alias', 'player_id', v_alias); end if;

  -- someone who joined as a new player and waits for staff: their own profile, not another new one
  v_alias := core.new_player_by_name(p ->> 'first', p ->> 'surname');
  if v_alias is not null then
    return jsonb_build_object('how', 'match', 'player_id', v_alias, 'candidates', '[]'::jsonb);
  end if;

  v_g := case when p ->> 'gender' in ('m', 'f') then p ->> 'gender' else core.first_gender(v_first) end;
  v_k1 := core.name_key(v_sur || ' ' || v_first);
  v_k2 := core.name_key(v_first || ' ' || v_sur);
  v_ss := core.name_sound(core.name_key(v_sur));

  -- the same name once folded (case, accents, look-alikes): the one roster player, an account holder too
  if v_sur <> '' then
    select array_agg(pl.id order by pl.id) into v_ids from core.players pl
     where core.name_key(pl.surname || ' ' || pl.first_name) in (v_k1, v_k2) and pl.status = 'active'
       and core.gender_fits(v_g, coalesce(pl.gender, core.first_gender(pl.first_name)));
    if cardinality(v_ids) = 1 then
      return jsonb_build_object('how', 'match', 'rule', 'key', 'player_id', v_ids[1], 'candidates', '[]'::jsonb);
    end if;
    if cardinality(v_ids) > 1 then
      v_ent := core.tournament_entrants(p_tournament);
      select array_agg(x) into v_sound from unnest(v_ids) x where x = any (v_ent);
      if cardinality(v_sound) = 1 then
        return jsonb_build_object('how', 'match', 'rule', 'key_tournament', 'player_id', v_sound[1], 'candidates', '[]'::jsonb);
      end if;
      return jsonb_build_object('how', 'review', 'candidates', core.ingest_candidates(p));   -- the same name twice
    end if;
  end if;

  -- this tournament's people: the same name as it sounds, else a first name that fits («ΧΑΡ», «ΑΝΤΩΝΙΟΣ»)
  if p_tournament is not null and v_sur <> '' and v_first <> '' then
    v_ent := coalesce(v_ent, core.tournament_entrants(p_tournament));
    select array_agg(pl.id order by pl.id) into v_ids from core.players pl
     where pl.id = any (v_ent) and pl.status = 'active'
       and core.name_sound(core.name_key(pl.surname)) = v_ss
       and core.same_named_person(v_sur || ' ' || v_first, pl.surname, pl.first_name)
       and core.gender_fits(v_g, coalesce(pl.gender, core.first_gender(pl.first_name)));
    if cardinality(v_ids) > 1 then
      select array_agg(pl.id order by pl.id) into v_sound from core.players pl
       where pl.id = any (v_ids)
         and core.name_sound(core.name_key(pl.surname || ' ' || pl.first_name)) in (core.name_sound(v_k1), core.name_sound(v_k2));
      if cardinality(v_sound) = 1 then v_ids := v_sound; end if;
    end if;
    if cardinality(v_ids) = 1 then
      select * into v_pl from core.players where id = v_ids[1];
      -- an account holder, a hidden player or a minor only on the same key: staff look at the rest
      if v_pl.claimed_by_user_id is not null or v_pl.hidden or v_pl.is_minor then
        -- the player the name fits leads the card, whatever the scores say
        return jsonb_build_object('how', 'review', 'candidates',
          jsonb_build_array(jsonb_build_object('id', v_pl.id, 'first_name', v_pl.first_name, 'surname', v_pl.surname,
                                               'area_id', v_pl.area_id, 'score', 1))
          || coalesce((select jsonb_agg(c) from jsonb_array_elements(core.ingest_candidates(p)) c
                        where (c ->> 'id')::uuid <> v_pl.id), '[]'::jsonb));
      end if;
      return jsonb_build_object('how', 'match', 'rule', 'name_in_tournament', 'player_id', v_pl.id, 'candidates', '[]'::jsonb);
    end if;
  end if;

  -- a surname alone: the one in this tournament, else the one in the roster; several are for staff
  if v_first = '' and v_s <> '' then
    if p_tournament is not null then
      -- only matches (not voided) where the sheet named them: an earlier guess is no evidence (22 Oct, Τζιότζιος);
      -- and never while an account holder carries the surname too (staff decide, as for any looser match)
      select array_agg(distinct pl.id) into v_ids
        from core.matches m join core.match_participants mp on mp.match_id = m.id join core.players pl on pl.id = mp.player_id
       where m.tournament_id = p_tournament and pl.surname_norm = v_s and pl.status = 'active' and m.status <> 'void'
         and core.named_in_match(m.id, pl.id);
      if cardinality(v_ids) = 1
         and not exists (select 1 from core.players q
                          where q.surname_norm = v_s and q.status = 'active' and q.claimed_by_user_id is not null
                            and (q.id <> v_ids[1] or (select count(*) from core.players c where c.surname_norm = v_s and c.status = 'active') > 1)) then
        return jsonb_build_object('how', 'tournament', 'player_id', v_ids[1]);
      end if;
    end if;
    select array_agg(id) into v_ids from core.players where surname_norm = v_s and status = 'active' and not hidden;
    if cardinality(v_ids) = 1 then return jsonb_build_object('how', 'surname', 'player_id', v_ids[1]); end if;
    if cardinality(v_ids) > 1 then
      return jsonb_build_object('how', 'review', 'candidates', core.ingest_candidates(p));
    end if;
  end if;

  -- a first name that fits the only roster player with this surname (stricter than the surname alone above)
  if v_first <> '' and v_ss <> '' then
    select array_agg(pl.id) into v_ids from core.players pl
     where core.name_sound(core.name_key(pl.surname)) = v_ss and pl.status = 'active';
    if cardinality(v_ids) = 1 then
      select * into v_pl from core.players where id = v_ids[1];
      if v_pl.claimed_by_user_id is null and not v_pl.hidden and not v_pl.is_minor
         and core.same_named_person(v_sur || ' ' || v_first, v_pl.surname, v_pl.first_name)
         and core.gender_fits(v_g, coalesce(v_pl.gender, core.first_gender(v_pl.first_name))) then
        return jsonb_build_object('how', 'match', 'rule', 'only_surname', 'player_id', v_pl.id, 'candidates', '[]'::jsonb);
      end if;
    end if;
  end if;

  v_c := core.ingest_candidates(p);
  v_top := (v_c -> 0 ->> 'score')::numeric;
  v_next := coalesce((v_c -> 1 ->> 'score')::numeric, 0);
  if v_top >= 0.92 then
    if v_top - v_next >= 0.05 then
      return jsonb_build_object('how', 'match', 'player_id', v_c -> 0 ->> 'id', 'candidates', v_c);
    end if;
    return jsonb_build_object('how', 'review', 'candidates', v_c);   -- the same name twice in the roster
  end if;
  if v_top >= 0.6 and exists (select 1 from jsonb_array_elements(v_c) c
                               where (c ->> 'score')::numeric >= 0.6 and core.in_active_circle((c ->> 'id')::uuid)) then
    return jsonb_build_object('how', 'review', 'candidates', v_c);
  end if;
  return jsonb_build_object('how', 'new', 'candidates', coalesce(v_c, '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. the cards a fresh read no longer supports
-- ---------------------------------------------------------------------------
create or replace function core.ingest_close_stale_reviews(p_tournament_id uuid, p_rows jsonb, p_run uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_c      core.ingest_reviews;
  v_row    jsonb;
  v_res    core.match_results;
  v_why    text;
  v_status text;
  v_n      jsonb := '{}'::jsonb;
  v_total  int := 0;
begin
  for v_c in
    select * from core.ingest_reviews where tournament_id = p_tournament_id and status = 'open' for update
  loop
    v_row := (select x from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) x where x ->> 'fingerprint' = v_c.fingerprint limit 1);
    v_why := null;
    v_status := 'dismissed';
    v_res := null;
    if v_c.match_id is not null then
      select * into v_res from core.match_results where match_id = v_c.match_id;
    end if;
    if v_row is null then
      v_why := 'row_gone';
    elsif v_c.kind = 'people' then
      if core.ingest_match_by_ref(v_c.fingerprint, p_tournament_id) is not null then
        v_why := 'match_exists';
        v_status := 'done';
      end if;
    elsif v_c.kind = 'walkover' then
      if v_res.match_id is not null or (v_row -> 'result' ->> 'winner_side') is not null then
        v_why := 'result_in';
        v_status := 'done';
      elsif jsonb_typeof(v_row -> 'result') is distinct from 'object'
            or not coalesce((v_row -> 'result' ->> 'walkover')::boolean, false) then
        v_why := 'no_walkover';
      end if;
    elsif v_c.kind = 'score_conflict' then
      if jsonb_typeof(v_row -> 'result') is distinct from 'object' or (v_row -> 'result' ->> 'winner_side') is null then
        v_why := 'no_score_on_sheet';
      elsif v_res.match_id is not null and v_res.winner_side = (v_row -> 'result' ->> 'winner_side')::int
            and v_res.sets = v_row -> 'result' -> 'sets' then
        v_why := 'agrees';
        v_status := 'done';
      end if;
    end if;
    if v_why is not null then
      update core.ingest_reviews
         set status = v_status, resolved_at = now(), updated_at = now(),
             payload = payload || jsonb_build_object('closed', jsonb_build_object('by', 'sheet', 'reason', v_why, 'run_id', p_run, 'at', now()))
       where id = v_c.id;
      v_n := jsonb_set(v_n, array[v_why], to_jsonb(coalesce((v_n ->> v_why)::int, 0) + 1));
      v_total := v_total + 1;
    end if;
  end loop;
  return jsonb_build_object('stale_closed', v_total, 'stale_reasons', v_n);
end;
$$;

-- a run closes what the read no longer supports, on a healthy read only (like core.ingest_missing); the dry run says
-- how many it would close (20261213000000_m4_fast_matching.sql otherwise)
create or replace function core.ingest_run(p_tournament_id uuid, p_rows jsonb, p_trigger text, p_by uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_run    uuid;
  v_counts jsonb;
  v_seen   int := coalesce(jsonb_array_length(p_rows), 0);
  v_prev   int;
  v_health text;
begin
  if not exists (select 1 from core.tournaments where id = p_tournament_id) then
    raise exception 'tournament_not_found' using errcode = 'P0002';
  end if;
  select rows_seen into v_prev from core.ingest_runs
   where tournament_id = p_tournament_id and kind = 'schedule' and trigger <> 'dry' and health <> 'error' order by started_at desc limit 1;
  v_health := case when v_seen = 0 then 'empty'
                   when v_prev is not null and v_prev >= 10 and v_seen < v_prev / 2 then 'drop'
                   else 'ok' end;

  if p_trigger = 'dry' then
    begin
      v_counts := core.ingest_apply(p_tournament_id, p_rows, p_by, null);
      if v_health = 'ok' then
        v_counts := v_counts || core.ingest_close_stale_reviews(p_tournament_id, p_rows, null);
      end if;
      raise exception 'np_dry_run' using detail = v_counts::text;
    exception when raise_exception then
      if sqlerrm <> 'np_dry_run' then raise; end if;
      get stacked diagnostics v_counts = pg_exception_detail;
    end;
    insert into core.ingest_runs (tournament_id, trigger, started_by, rows_seen, counts, health)
    values (p_tournament_id, 'dry', p_by, v_seen, v_counts, v_health) returning id into v_run;
  else
    insert into core.ingest_runs (tournament_id, trigger, started_by, rows_seen, health)
    values (p_tournament_id, p_trigger, p_by, v_seen, v_health) returning id into v_run;
    v_counts := core.ingest_apply(p_tournament_id, p_rows, p_by, v_run);
    -- a match the sheet stopped listing: after two runs in a row without it (and only on a healthy read) it is
    -- postponed, its votes kept; a match with a result is never touched. Cards the sheet no longer supports close.
    if v_health = 'ok' then
      v_counts := v_counts || core.ingest_missing(p_tournament_id, p_rows)
                           || core.ingest_close_stale_reviews(p_tournament_id, p_rows, v_run);
    end if;
    update core.ingest_runs set counts = v_counts where id = v_run;
    update core.tournaments t
       set last_run_at = now(),
           starts_on = least(coalesce(t.starts_on, d.first_day), d.first_day),
           ends_on = greatest(coalesce(t.ends_on, d.last_day), d.last_day)
      from (select min((x ->> 'date')::date) as first_day, max((x ->> 'date')::date) as last_day
              from jsonb_array_elements(p_rows) x where x ->> 'date' ~ '^\d{4}-\d{2}-\d{2}$') d
     where t.id = p_tournament_id;
    update core.tournaments set last_run_at = now() where id = p_tournament_id;
  end if;
  return jsonb_build_object('run_id', v_run, 'dry', p_trigger = 'dry', 'rows_seen', v_seen, 'health', v_health) || v_counts;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Results desk: a sheet match the sheet stopped listing is off the sheet, not overdue
-- (20261230000000_m4_overdue_review.sql otherwise)
-- ---------------------------------------------------------------------------
create or replace function api.admin_desk(p_days int default 7)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_days int := least(greatest(coalesce(p_days, 7), 1), 60);
begin
  if not (core.is_service() or core.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(d)::jsonb order by d.bucket, d.sort_at)
      from (
        select m.id as match_id, m.format, m.status, m.starts_at, m.venue, m.round, m.source, m.resolved_at,
               t.name as tournament,
               m.postponed_at is not null as postponed,
               m.provenance ->> 'postponed_by' as postponed_by,
               -- the sheet stopped listing it (two healthy reads in a row): no result will come from that row
               (x.off and r.match_id is null and m.status <> 'void') as off_sheet,
               case when x.off and r.match_id is null then coalesce(m.postponed_at, m.updated_at) end as off_sheet_since,
               -- a sheet match with no result two days on, still on the sheet, not cancelled and not called off by
               -- staff: a person decides
               (t.id is not null and r.match_id is null and m.status <> 'void' and not x.off
                and core.athens_day(m.starts_at) <= core.athens_day(now()) - 2
                and coalesce(m.provenance ->> 'postponed_by', '') <> 'staff') as overdue,
               core.match_sides_json(m.id) as sides,
               case when r.match_id is not null then jsonb_build_object(
                 'winner_side', r.winner_side, 'sets', r.sets, 'score', r.score_summary,
                 'retired', r.retired, 'walkover', r.walkover, 'version', r.result_version) end as result,
               (select count(*) from core.votes v where v.subject_type = 'match' and v.subject_id = m.id) as votes,
               (select count(*) from core.votes v where v.subject_type = 'match' and v.subject_id = m.id
                  and v.resolved_at is not null) as votes_resolved,
               case
                 when r.match_id is null and m.status not in ('void') and m.starts_at <= now() then 'to_score'
                 when r.match_id is null and m.status not in ('void') then 'upcoming'
                 else 'done' end as bucket_name,
               case
                 when r.match_id is null and m.status not in ('void') and m.starts_at <= now() then 1
                 when r.match_id is null and m.status not in ('void') then 2
                 else 3 end as bucket,
               -- oldest first while waiting, soonest first upcoming, newest first when done
               case
                 when r.match_id is null and m.status not in ('void') then extract(epoch from m.starts_at)
                 else -extract(epoch from coalesce(m.starts_at, m.created_at)) end as sort_at
          from core.matches m
          left join core.match_results r on r.match_id = m.id
          left join core.tournaments t on t.id = m.tournament_id
          cross join lateral (select (m.source = 'import' and t.id is not null
                                      and coalesce((m.provenance ->> 'missing_runs')::int, 0) >= 2) as off) x
         where m.approved
           and m.starts_at is not null
           and m.starts_at >= now() - make_interval(days => v_days)
           and m.starts_at <= now() + make_interval(days => v_days)
      ) d), '[]'::jsonb);
end;
$$;

revoke all on function core.fp_people(text) from public;
revoke all on function core.named_in_match(uuid, uuid) from public;
revoke all on function core.ingest_smart_names(uuid, jsonb, jsonb, jsonb) from public;
revoke all on function core.ingest_close_stale_reviews(uuid, jsonb, uuid) from public;
