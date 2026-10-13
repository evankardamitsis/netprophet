-- M4 part 2: name matching for organiser sheets (docs/v2/match-data-automation.md, Names and players). On the TAF
-- sheet against the real roster, half the people did not link; the misses were surname-only entries (doubles),
-- nicknames (Φιλοθέη = Φαίη), swapped order (ΟΡΕΣΤΗΣ ΕΜΜΑΝΟΥΗΛ), initials (ΑΛΙΑΣΟΓΛΟΥ ΟΡ) and duplicates in the
-- roster (two of the same name). Now:
--   first names compare by family: the formal name, the everyday one and the usual nicknames are one name;
--   an initial («ΟΡ», «Γ.») matches the first names it starts;
--   the sheet's two words are also tried the other way round;
--   a surname alone links when exactly one player with that surname is already in this tournament, or, failing
--     that, exactly one in the whole roster; several go to staff;
--   a certain score without a clear lead (the roster has the same name twice) goes to staff, never a third copy.
-- The import desk's candidate list (api.admin_match_people) uses the same scoring.

create table core.first_name_families (
  name_norm   text primary key,     -- core.normalize_search of the name
  family      text not null         -- normalize_search of the family's everyday name
);
alter table core.first_name_families enable row level security;
comment on table core.first_name_families is 'First names that are the same name (formal, everyday, nickname). Data, staff may add rows.';

insert into core.first_name_families (name_norm, family)
select distinct on (core.normalize_search(n)) core.normalize_search(n), core.normalize_search(f[1])
  from (values
    (array['Βαγγέλης', 'Ευάγγελος', 'Βαγγέλας']),
    (array['Κώστας', 'Κωνσταντίνος', 'Ντίνος', 'Κωστής', 'Κωνσταντής']),
    (array['Γιάννης', 'Ιωάννης', 'Γιαννάκης']),
    (array['Γιώργος', 'Γεώργιος', 'Γιώργης']),
    (array['Δημήτρης', 'Δημήτριος', 'Μήτσος']),
    (array['Νίκος', 'Νικόλαος', 'Νικολής']),
    (array['Πάνος', 'Παναγιώτης', 'Παναγής']),
    (array['Θανάσης', 'Αθανάσιος']),
    (array['Θοδωρής', 'Θεόδωρος', 'Θόδωρος']),
    (array['Μιχάλης', 'Μιχαήλ']),
    (array['Στράτος', 'Ευστράτιος', 'Στρατής']),
    (array['Μπάμπης', 'Χαράλαμπος', 'Χάρης']),
    (array['Σπύρος', 'Σπυρίδων', 'Σπυρίδωνας']),
    (array['Μανώλης', 'Εμμανουήλ', 'Μάνος']),
    (array['Γρηγόρης', 'Γρηγόριος']),
    (array['Βασίλης', 'Βασίλειος']),
    (array['Άρης', 'Αριστείδης']),
    (array['Θύμιος', 'Ευθύμιος']),
    (array['Στέλιος', 'Στυλιανός']),
    (array['Λευτέρης', 'Ελευθέριος']),
    (array['Αλέξανδρος', 'Αλέκος']),
    (array['Τόλης', 'Απόστολος']),
    (array['Τάσος', 'Αναστάσιος']),
    (array['Χρήστος', 'Χρίστος']),
    (array['Ηλίας', 'Λιάς']),
    (array['Σωτήρης', 'Σωτήριος']),
    (array['Παντελής', 'Παντελεήμων']),
    (array['Μίλτος', 'Μιλτιάδης']),
    (array['Λάρυ', 'Λαυρέντιος']),
    (array['Κυριάκος', 'Κούλης']),
    (array['Ζάχος', 'Ζαχαρίας']),
    (array['Περικλής', 'Περικλέας']),
    (array['Κατερίνα', 'Αικατερίνη', 'Κατίνα']),
    (array['Τασία', 'Αναστασία', 'Νατάσα']),
    (array['Βάσω', 'Βασιλική', 'Βίκυ', 'Κούλα']),
    (array['Λίτσα', 'Ευαγγελία', 'Βαγγελιώ']),
    (array['Γιώτα', 'Παναγιώτα', 'Νότα']),
    (array['Φαίη', 'Φιλοθέη', 'Θέη']),
    (array['Στέφη', 'Στεφανία']),
    (array['Φανή', 'Θεοφανία', 'Φανούλα']),
    (array['Φρόσω', 'Ευφροσύνη']),
    (array['Αλέκα', 'Αλεξάνδρα']),
    (array['Γιάννα', 'Ιωάννα']),
    (array['Γωγώ', 'Γεωργία']),
    (array['Λένα', 'Ελένη']),
    (array['Μαρία', 'Μαίρη', 'Μαρούλα']),
    (array['Ντίνα', 'Κωνσταντίνα']),
    (array['Αγγελική', 'Αγγέλα']),
    (array['Βούλα', 'Σταυρούλα', 'Ρούλα']),
    (array['Πένυ', 'Πηνελόπη']),
    (array['Ρένα', 'Ειρήνη', 'Ρένια']),
    (array['Κική', 'Κυριακή'])
  ) g(f), unnest(g.f) n
on conflict (name_norm) do nothing;

-- the family of a first name (its own normalised form when it has none)
create or replace function core.first_family(p_norm text)
returns text
language sql stable set search_path = core, pg_temp
as $$ select coalesce((select family from core.first_name_families where name_norm = p_norm), p_norm) $$;

-- how alike two first names are: one family 1; an initial that starts the name 0.9; else trigram similarity
create or replace function core.first_alike(p_roster_norm text, p_sheet_norm text)
returns real
language sql stable set search_path = core, extensions, pg_temp
as $$
  select case
    when coalesce(p_sheet_norm, '') = '' or coalesce(p_roster_norm, '') = '' then 0::real
    when core.first_family(p_roster_norm) = core.first_family(p_sheet_norm) then 1::real
    when length(p_sheet_norm) <= 2 and p_roster_norm like p_sheet_norm || '%' then 0.9::real
    else similarity(core.first_family(p_roster_norm), core.first_family(p_sheet_norm))
  end
$$;

-- up to 3 roster candidates for one sheet person {surname, first}: 0.6 × surname + 0.4 × first name, or
-- 0.85 × surname when the sheet has no first name; the swapped reading counts at 0.97
create or replace function core.ingest_candidates(p jsonb)
returns jsonb
language sql stable security definer set search_path = core, extensions, pg_temp
as $$
  with q as (select core.normalize_search(coalesce(p ->> 'surname', '')) as s,
                    core.normalize_search(coalesce(p ->> 'first', '')) as f)
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'first_name', c.first_name, 'surname', c.surname,
                                               'area_id', c.area_id, 'score', round(c.score::numeric, 2)) order by c.score desc), '[]'::jsonb)
    from (
      select pl.id, pl.first_name, pl.surname, pl.area_id,
             greatest(
               case when q.f = '' then 0.85 * similarity(pl.surname_norm, q.s)
                    else 0.6 * similarity(pl.surname_norm, q.s) + 0.4 * core.first_alike(pl.first_name_norm, q.f) end,
               case when q.f = '' or length(q.f) <= 2 then 0
                    else 0.97 * (0.6 * similarity(pl.surname_norm, q.f) + 0.4 * core.first_alike(pl.first_name_norm, q.s)) end
             ) as score
        from core.players pl, q
       where pl.status = 'active' and not pl.hidden
         and (similarity(pl.surname_norm, q.s) >= 0.4 or (q.f <> '' and length(q.f) > 2 and similarity(pl.surname_norm, q.f) >= 0.4))
       order by score desc
       limit 3
    ) c
$$;

drop function if exists core.ingest_person(jsonb);

-- one sheet person → {how: alias|match|tournament|surname|new|review, player_id, candidates}
create or replace function core.ingest_person(p jsonb, p_tournament uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_alias uuid;
  v_s     text := core.normalize_search(coalesce(p ->> 'surname', ''));
  v_ids   uuid[];
  v_c     jsonb;
  v_top   numeric;
  v_next  numeric;
begin
  -- a remembered spelling links, hidden players included (they are never imported twice)
  select a.player_id into v_alias from core.player_aliases a
   where a.alias_norm in (core.normalize_search(btrim(coalesce(p ->> 'raw', ''))),
                          core.normalize_search(btrim(coalesce(p ->> 'surname', '') || ' ' || coalesce(p ->> 'first', ''))))
   limit 1;
  if v_alias is not null then return jsonb_build_object('how', 'alias', 'player_id', v_alias); end if;

  -- a surname alone: the one in this tournament, else the one in the roster; several are for staff
  if coalesce(btrim(p ->> 'first'), '') = '' and v_s <> '' then
    if p_tournament is not null then
      select array_agg(distinct pl.id) into v_ids
        from core.matches m join core.match_participants mp on mp.match_id = m.id join core.players pl on pl.id = mp.player_id
       where m.tournament_id = p_tournament and pl.surname_norm = v_s and pl.status = 'active';
      if cardinality(v_ids) = 1 then return jsonb_build_object('how', 'tournament', 'player_id', v_ids[1]); end if;
    end if;
    select array_agg(id) into v_ids from core.players where surname_norm = v_s and status = 'active' and not hidden;
    if cardinality(v_ids) = 1 then return jsonb_build_object('how', 'surname', 'player_id', v_ids[1]); end if;
    if cardinality(v_ids) > 1 then
      return jsonb_build_object('how', 'review', 'candidates', core.ingest_candidates(p));
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

-- the desk's candidates, on the same scoring
create or replace function api.admin_match_people(p_people jsonb)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'alias', (select a.player_id from core.player_aliases a
                        where a.alias_norm = core.normalize_search(btrim(coalesce(e.v ->> 'surname', '') || ' ' || coalesce(e.v ->> 'first', '')))),
             'candidates', core.ingest_candidates(e.v)) order by e.k)
      from jsonb_array_elements(p_people) with ordinality e(v, k)), '[]'::jsonb);
end;
$$;

-- the write path and the review decision, now telling the matcher which tournament the row is in (20261208 otherwise)
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
begin
  select * into v_t from core.tournaments where id = p_tournament_id;
  if not found then raise exception 'tournament_not_found' using errcode = 'P0002'; end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    v_known := exists (select 1 from core.matches where source = 'import' and source_ref = r ->> 'fingerprint');

    -- resolve the people the desk did not decide; an unclear one near an active user holds the row for review
    v_sides := jsonb_build_object('side1', r -> 'side1', 'side2', r -> 'side2');
    v_unclear := '[]'::jsonb;
    if not v_known then
      for v_side in 1..2 loop
        v_pos := 0;
        for v_person in select * from jsonb_array_elements(r -> ('side' || v_side)) loop
          if v_person ? 'player_id' or v_person ? 'new' then
            null;
          else
            v_dec := core.ingest_person(v_person, p_tournament_id);
            if v_dec ->> 'how' in ('alias', 'match', 'tournament', 'surname') then
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

    select * into v_m from core.matches where source = 'import' and source_ref = r ->> 'fingerprint';
    if found then
      -- a known match: follow the sheet's time while it is still to play
      if v_m.resolved_at is null and not exists (select 1 from core.match_results x where x.match_id = v_m.id) then
        update core.matches set starts_at = v_starts where id = v_m.id and starts_at is distinct from v_starts;
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
      else
        v_skip := v_skip + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object('created', v_new, 'updated', v_upd, 'results', v_res, 'results_skipped', v_skip,
                            'new_players', (select count(*) from core.players) - v_people,
                            'linked', v_linked, 'held_for_review', v_held, 'walkovers_to_decide', v_wo);
end;
$$;

create or replace function api.admin_resolve_ingest_review(p_id uuid, p jsonb)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v    core.ingest_reviews;
  v_row jsonb;
  v_s  int;
  v_i  int;
  v_pp jsonb;
  v_d  jsonb;
  v_out jsonb := '{}'::jsonb;
  v_o   core.ingest_reviews;
  v_freed int := 0;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v from core.ingest_reviews where id = p_id and status = 'open' for update;
  if not found then raise exception 'review_not_found' using errcode = 'P0002'; end if;

  if coalesce((p ->> 'dismiss')::boolean, false) then
    update core.ingest_reviews set status = 'dismissed', resolved_by = auth.uid(), resolved_at = now(), updated_at = now() where id = p_id;
    return jsonb_build_object('dismissed', true);
  end if;

  if v.kind = 'people' then
    v_row := v.payload -> 'row';
    for v_s in 1..2 loop
      for v_i in 0 .. jsonb_array_length(v_row -> ('side' || v_s)) - 1 loop
        v_pp := v_row -> ('side' || v_s) -> v_i;
        select d into v_d from jsonb_array_elements(p -> 'decisions') d where d ->> 'raw' = v_pp ->> 'raw' limit 1;
        if v_d is not null then
          v_row := jsonb_set(v_row, array['side' || v_s, v_i::text],
                     case when coalesce((v_d ->> 'new')::boolean, false)
                          then jsonb_build_object('new', jsonb_build_object('surname', v_pp ->> 'surname', 'first', v_pp ->> 'first'), 'raw', v_pp ->> 'raw')
                          else jsonb_build_object('player_id', v_d ->> 'player_id', 'raw', v_pp ->> 'raw') end);
        end if;
        v_d := null;
      end loop;
    end loop;
    -- the people the run was sure about: the same rules again (an alias or a certain match links, else new);
    -- an unclear one staff did not decide is an error
    for v_s in 1..2 loop
      for v_i in 0 .. jsonb_array_length(v_row -> ('side' || v_s)) - 1 loop
        v_pp := v_row -> ('side' || v_s) -> v_i;
        if not (v_pp ? 'player_id' or v_pp ? 'new') then
          if (v_pp ->> 'raw') in (select u ->> 'raw' from jsonb_array_elements(v.payload -> 'unclear') u) then
            raise exception 'person_undecided' using errcode = '22023', detail = coalesce(v_pp ->> 'raw', '');
          end if;
          v_d := core.ingest_person(v_pp, v.tournament_id);
          v_row := jsonb_set(v_row, array['side' || v_s, v_i::text],
                     case when v_d ->> 'how' in ('alias', 'match', 'tournament', 'surname')
                          then jsonb_build_object('player_id', v_d ->> 'player_id', 'raw', v_pp ->> 'raw')
                          else jsonb_build_object('new', jsonb_build_object('surname', v_pp ->> 'surname', 'first', v_pp ->> 'first'), 'raw', v_pp ->> 'raw') end);
        end if;
      end loop;
    end loop;
    v_out := core.ingest_apply(v.tournament_id, jsonb_build_array(v_row), auth.uid(), v.run_id);
  elsif v.kind = 'walkover' then
    if (p ->> 'winner_side') not in ('1', '2') then raise exception 'winner_required' using errcode = '22023'; end if;
    perform core.set_result(v.match_id, (p ->> 'winner_side')::int, '[]'::jsonb, null, null, false, true, auth.uid());
    v_out := jsonb_build_object('results', 1);
  end if;

  update core.ingest_reviews set status = 'done', resolved_by = auth.uid(), resolved_at = now(), updated_at = now() where id = p_id;

  -- a decision writes the sheet's spelling as an alias: other rows held only for names now known go in too
  if v.kind = 'people' then
    for v_o in select * from core.ingest_reviews o
                where o.tournament_id = v.tournament_id and o.kind = 'people' and o.status = 'open'
                  and not exists (select 1 from jsonb_array_elements(o.payload -> 'unclear') u
                                   where not exists (select 1 from core.player_aliases a
                                                      where a.alias_norm = core.normalize_search(btrim(coalesce(u ->> 'raw', ''))))) loop
      perform core.ingest_apply(v_o.tournament_id, jsonb_build_array(v_o.payload -> 'row'), auth.uid(), v_o.run_id);
      update core.ingest_reviews set status = 'done', resolved_by = auth.uid(), resolved_at = now(), updated_at = now()
       where id = v_o.id and status = 'open'
         and exists (select 1 from core.matches m where m.source = 'import' and m.source_ref = v_o.fingerprint);
      if found then v_freed := v_freed + 1; end if;
    end loop;
  end if;
  return v_out || jsonb_build_object('also_released', v_freed);
end;
$$;
