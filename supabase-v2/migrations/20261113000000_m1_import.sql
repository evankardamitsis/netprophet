-- M1 admin import: organiser order-of-play sheets into tournaments, players and matches, after an admin review.
-- The browser parses with packages/ingest (the port of parse_oop.py); the database matches names and writes.
--   players:    imported players may have no first name yet (sheets often give only a surname); they show by
--               name in feeds right away (founder, 12 Oct 2026) and claiming links an account to them
--   tournaments.surface: per tournament, given by the founder
--   core.player_aliases: every spelling an admin confirmed; an exact alias is a certain match next time
--   api.admin_tournaments / api.admin_save_tournament
--   api.admin_match_people: up to 3 roster candidates per sheet person, with a score
--   api.admin_import_matches: approved rows in; the same fingerprint again updates instead of duplicating; a
--               completed score is the result (the organiser's score overrides), a walkover only with the winner
--               the admin picked (the sheet does not say)

alter table core.players drop constraint players_first_name_check;
alter table core.players add constraint players_first_name_check check (btrim(first_name) <> '' or source = 'import');

alter table core.tournaments add column surface text check (surface in ('clay', 'hard', 'grass', 'carpet'));

create table core.player_aliases (
  alias_norm  text primary key,
  player_id   uuid not null references core.players (id) on delete cascade,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index player_aliases_player_idx on core.player_aliases (player_id);
alter table core.player_aliases enable row level security;
comment on table core.player_aliases is 'Confirmed spellings of a player (normalize_search). Staff write through api.admin_import_matches.';

create or replace function api.admin_tournaments()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', t.id, 'name', t.name, 'venue', t.venue, 'area_id', t.area_id, 'surface', t.surface,
             'starts_on', t.starts_on, 'ends_on', t.ends_on, 'active', t.active,
             'matches', (select count(*) from core.matches m where m.tournament_id = t.id))
           order by t.active desc, t.starts_on desc nulls last, t.name)
      from core.tournaments t), '[]'::jsonb);
end;
$$;

create or replace function api.admin_save_tournament(p jsonb)
returns uuid
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(btrim(p ->> 'name'), '') = '' then raise exception 'name_required' using errcode = '22023'; end if;
  if v_id is null then
    insert into core.tournaments (sport_id, name, venue, area_id, surface, starts_on, ends_on, source)
    values (coalesce(p ->> 'sport_id', 'tennis'), btrim(p ->> 'name'), nullif(btrim(p ->> 'venue'), ''),
            nullif(p ->> 'area_id', ''), nullif(p ->> 'surface', ''),
            nullif(p ->> 'starts_on', '')::date, nullif(p ->> 'ends_on', '')::date, 'import')
    returning id into v_id;
  else
    update core.tournaments
       set name = btrim(p ->> 'name'), venue = nullif(btrim(p ->> 'venue'), ''), area_id = nullif(p ->> 'area_id', ''),
           surface = nullif(p ->> 'surface', ''), starts_on = nullif(p ->> 'starts_on', '')::date,
           ends_on = nullif(p ->> 'ends_on', '')::date
     where id = v_id;
    if not found then raise exception 'tournament_not_found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end;
$$;

-- p_people: [{surname, first, first_alt}] (first_alt: the everyday first name, Ευάγγελος → Βαγγέλης).
-- Returns, in the same order: {alias: player_id | null, candidates: [{id, first_name, surname, area_id, score}]}.
-- Score: an alias is 1; otherwise 0.6 × surname + 0.4 × first-name similarity, or 0.85 × surname alone when the
-- sheet has no first name (so a surname alone never looks certain).
create or replace function api.admin_match_people(p_people jsonb)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(x.j order by x.k)
      from (
        select e.k, jsonb_build_object(
                 'alias', (select a.player_id from core.player_aliases a
                            where a.alias_norm = core.normalize_search(btrim(coalesce(e.v ->> 'surname', '') || ' ' || coalesce(e.v ->> 'first', ''))))
                 ,
                 'candidates', coalesce((
                   select jsonb_agg(jsonb_build_object('id', c.id, 'first_name', c.first_name, 'surname', c.surname,
                                                      'area_id', c.area_id, 'score', round(c.score::numeric, 2)) order by c.score desc)
                     from (
                       select p.id, p.first_name, p.surname, p.area_id,
                              case when coalesce(e.v ->> 'first', '') = ''
                                   then 0.85 * similarity(p.surname_norm, core.normalize_search(e.v ->> 'surname'))
                                   else 0.6 * similarity(p.surname_norm, core.normalize_search(e.v ->> 'surname'))
                                      + 0.4 * greatest(similarity(p.first_name_norm, core.normalize_search(e.v ->> 'first')),
                                                       similarity(p.first_name_norm, core.normalize_search(coalesce(e.v ->> 'first_alt', e.v ->> 'first'))))
                              end as score
                         from core.players p
                        where p.status = 'active' and not p.hidden
                          and similarity(p.surname_norm, core.normalize_search(e.v ->> 'surname')) >= 0.4
                        order by score desc
                        limit 3
                     ) c), '[]'::jsonb)) as j
          from jsonb_array_elements(p_people) with ordinality e(v, k)
      ) x), '[]'::jsonb);
end;
$$;

-- one person on a side: {player_id} or {new: {surname, first}}, and {raw}: the sheet's spelling, saved as an alias
create or replace function core.import_person(p jsonb, p_by uuid)
returns uuid
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_id    uuid := nullif(p ->> 'player_id', '')::uuid;
  v_alias text := core.normalize_search(btrim(coalesce(p ->> 'raw', '')));
begin
  if v_id is null then
    if p -> 'new' is null or coalesce(btrim(p -> 'new' ->> 'surname'), '') = '' then
      raise exception 'person_unresolved' using errcode = '22023';
    end if;
    insert into core.players (first_name, surname, source)
    -- as the sheet writes it (often capitals); the queued accent pass fixes spelling for the whole roster
    values (coalesce(btrim(p -> 'new' ->> 'first'), ''), btrim(p -> 'new' ->> 'surname'), 'import')
    returning id into v_id;
  end if;
  if v_alias <> '' then
    insert into core.player_aliases (alias_norm, player_id, created_by) values (v_alias, v_id, p_by)
    on conflict (alias_norm) do update set player_id = excluded.player_id, created_by = excluded.created_by;
  end if;
  return v_id;
end;
$$;

-- p_rows: [{fingerprint, date, time, discipline (MS|WS|MD|WD|XD), level, category_raw, tab, row, flags,
--           side1: [person], side2: [person], result: {winner_side, sets (winner-first), walkover} | null}]
create or replace function api.admin_import_matches(p_tournament_id uuid, p_rows jsonb)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
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
  v_side    int;
  v_pos     int;
  v_person  jsonb;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_t from core.tournaments where id = p_tournament_id;
  if not found then raise exception 'tournament_not_found' using errcode = 'P0002'; end if;

  for r in select * from jsonb_array_elements(p_rows) loop
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
                                 'imported_by', v_uid, 'imported_at', now()))
      returning * into v_m;
      for v_side in 1..2 loop
        v_pos := 0;
        for v_person in select * from jsonb_array_elements(r -> ('side' || v_side)) loop
          v_pos := v_pos + 1;
          insert into core.match_participants (match_id, side, player_id, position)
          values (v_m.id, v_side, core.import_person(v_person, v_uid), v_pos);
        end loop;
      end loop;
      v_new := v_new + 1;
    end if;

    -- the organiser's score is the result; it cannot change a match that already resolved
    if r -> 'result' is not null and jsonb_typeof(r -> 'result') = 'object' then
      if exists (select 1 from core.match_results x
                  where x.match_id = v_m.id and x.winner_side = (r -> 'result' ->> 'winner_side')::int
                    and x.sets = r -> 'result' -> 'sets') then
        null;  -- the same score as last time: nothing to do
      elsif v_m.resolved_at is null then
        perform api.admin_set_result(v_m.id, (r -> 'result' ->> 'winner_side')::int, r -> 'result' -> 'sets',
                                     false, coalesce((r -> 'result' ->> 'walkover')::boolean, false));
        v_res := v_res + 1;
      else
        v_skip := v_skip + 1;
      end if;
    end if;
  end loop;

  return jsonb_build_object('created', v_new, 'updated', v_upd, 'results', v_res, 'results_skipped', v_skip,
                            'new_players', (select count(*) from core.players) - v_people);
end;
$$;

revoke all on function api.admin_tournaments() from public, anon;
revoke all on function api.admin_save_tournament(jsonb) from public, anon;
revoke all on function api.admin_match_people(jsonb) from public, anon;
revoke all on function api.admin_import_matches(uuid, jsonb) from public, anon;
revoke all on function core.import_person(jsonb, uuid) from public;
grant execute on function api.admin_tournaments() to authenticated, service_role;
grant execute on function api.admin_save_tournament(jsonb) to authenticated, service_role;
grant execute on function api.admin_match_people(jsonb) to authenticated, service_role;
grant execute on function api.admin_import_matches(uuid, jsonb) to authenticated, service_role;
