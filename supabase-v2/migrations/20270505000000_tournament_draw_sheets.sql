-- A tournament can have more than one draw sheet (founder, 19 Nov 2026: TAF keeps the doubles draws in a separate
-- Google Sheet from the singles ones, "how can we add it on the admin").
--
-- 1. core.tournaments.extra_draw_urls: the draw sheets after the first. draw_url stays the first one, so every check
--    of "has a draw sheet" (digests, auto rain, records, the due list) keeps working unchanged. The admin and the
--    cron see the whole list as `draw_urls` (draw_url first).
-- 2. core.tournament_draws.sheet and sheet_tab: the spreadsheet a draw came from and its tab name there. The key
--    stays (tournament_id, tab), because the pushes, the alerts and the app's ?draw= links find a draw by its tab.
--    A draw keeps the tab it was first stored with; a new draw whose tab name another sheet already uses
--    («40+» in both files) is stored as «40+ · MD» (then «40+ · MD 2», ...), so neither is lost.
-- 3. core.ingest_draws: a read replaces the draws of the sheets it carries only. A sheet that could not be read this
--    time keeps its stored draws; a sheet taken off the tournament loses them on the next read.
-- 4. api.admin_save_tournament takes `draw_urls` (blank links dropped, one link per spreadsheet); a payload with
--    only `draw_url` (older admin) changes the first link and keeps the others.
-- 5. api.admin_tournaments and api.ingest_due return `draw_urls`.

alter table core.tournaments add column extra_draw_urls text[] not null default '{}';
alter table core.tournament_draws add column sheet text not null default '';
alter table core.tournament_draws add column sheet_tab text;

-- the spreadsheet id of a Google Sheets link (apps/admin/src/lib/v2/sheets.ts spreadsheetId); another link as written
create or replace function core.sheet_id(p_url text)
returns text
language sql immutable set search_path = core, pg_temp
as $$
  select coalesce(substring(btrim(p_url) from '/spreadsheets/d/([a-zA-Z0-9_-]+)'), nullif(btrim(p_url), ''))
$$;

-- the draws stored so far came from the one draw sheet
update core.tournament_draws d
   set sheet = coalesce(core.sheet_id(t.draw_url), ''), sheet_tab = d.tab
  from core.tournaments t
 where t.id = d.tournament_id;

-- from 20270307000000_player_dedupe.sql: CHANGED, each draw may carry `sheet` (its link; else the first draw sheet);
-- a draw is found again by its sheet and tab there; a new one takes a free tab; only the sheets read are replaced
create or replace function core.ingest_draws(p_tournament_id uuid, p_draws jsonb)
returns jsonb language plpgsql security definer set search_path = 'core', 'extensions', 'pg_temp' as $$
declare
  d        jsonb;
  v_t      core.tournaments;
  v_ents   jsonb;
  v_g      text;
  v_n      int := 0;
  v_linked int := 0;
  v_people int := 0;
  v_first  text;
  v_now    text[];          -- the sheets the tournament has now
  v_read   text[];          -- the sheets in this read
  v_sheet  text;
  v_raw    text;
  v_tab    text;
  v_i      int;
begin
  select * into v_t from core.tournaments where id = p_tournament_id;
  if not found then
    raise exception 'tournament_not_found' using errcode = 'P0002';
  end if;
  v_first := coalesce(core.sheet_id(v_t.draw_url), '');
  v_now := array(select core.sheet_id(u) from unnest(array[v_t.draw_url] || v_t.extra_draw_urls) u where core.sheet_id(u) is not null);
  v_read := array(select distinct coalesce(core.sheet_id(x ->> 'sheet'), v_first) from jsonb_array_elements(coalesce(p_draws, '[]'::jsonb)) x);
  if cardinality(v_read) > 0 then
    -- a sheet taken off the tournament: its draws go (first, so their tabs are free again)
    delete from core.tournament_draws
     where tournament_id = p_tournament_id
       and coalesce(nullif(sheet, ''), v_first) <> all (v_now)
       and coalesce(nullif(sheet, ''), v_first) <> all (v_read);
  end if;
  for d in select * from jsonb_array_elements(coalesce(p_draws, '[]'::jsonb)) loop
    v_g := case d ->> 'discipline' when 'MS' then 'm' when 'MD' then 'm' when 'WS' then 'f' when 'WD' then 'f' end;
    select coalesce(jsonb_agg(e - 'people' || jsonb_build_object('players', (
             select coalesce(jsonb_agg(jsonb_build_object('raw', btrim(coalesce(pp ->> 'surname', '') || ' ' || coalesce(pp ->> 'first', '')),
                                                          'player_id', core.draw_player(pp || jsonb_strip_nulls(jsonb_build_object('gender', v_g)), p_tournament_id))
                                       order by o), '[]'::jsonb)
               from jsonb_array_elements(e -> 'people') with ordinality x(pp, o)))
           order by (e ->> 'pos')::int), '[]'::jsonb)
      into v_ents from jsonb_array_elements(d -> 'entrants') e;
    v_people := v_people + (select count(*) from jsonb_array_elements(v_ents) e, jsonb_array_elements(e -> 'players'));
    v_linked := v_linked + (select count(*) from jsonb_array_elements(v_ents) e, jsonb_array_elements(e -> 'players') pl
                             where pl ->> 'player_id' is not null);
    v_sheet := coalesce(core.sheet_id(d ->> 'sheet'), v_first);
    v_raw := d ->> 'tab';
    -- the tab this draw was stored with before, else its own name, else its name with the discipline
    select x.tab into v_tab from core.tournament_draws x
     where x.tournament_id = p_tournament_id and coalesce(nullif(x.sheet, ''), v_first) = v_sheet and coalesce(x.sheet_tab, x.tab) = v_raw
     limit 1;
    if v_tab is null then
      v_tab := v_raw;
      v_i := 1;
      while exists (select 1 from core.tournament_draws x where x.tournament_id = p_tournament_id and x.tab = v_tab) loop
        v_tab := v_raw || ' · ' || coalesce(d ->> 'discipline', '') || case when v_i > 1 then ' ' || v_i else '' end;
        v_i := v_i + 1;
      end loop;
    end if;
    insert into core.tournament_draws (tournament_id, tab, sheet, sheet_tab, title, discipline, level, format, size, draw, updated_at)
    values (p_tournament_id, v_tab, v_sheet, v_raw, coalesce(d ->> 'title', ''), d ->> 'discipline', coalesce(d ->> 'level', ''),
            d ->> 'format', coalesce((d ->> 'size')::int, 0),
            jsonb_build_object('entrants', v_ents, 'rounds', coalesce(d -> 'rounds', '[]'::jsonb), 'groups', coalesce(d -> 'groups', '[]'::jsonb),
                               'flags', coalesce(d -> 'flags', '[]'::jsonb)), now())
    on conflict (tournament_id, tab) do update
      set sheet = excluded.sheet, sheet_tab = excluded.sheet_tab,
          title = excluded.title, discipline = excluded.discipline, level = excluded.level, format = excluded.format,
          size = excluded.size, draw = excluded.draw, updated_at = now();
    v_tab := null;
    v_n := v_n + 1;
  end loop;
  if v_n > 0 then
    -- a tab gone from a sheet that was read is removed; the other sheets keep theirs
    delete from core.tournament_draws x
     where x.tournament_id = p_tournament_id
       and coalesce(nullif(x.sheet, ''), v_first) = any (v_read)
       and (coalesce(nullif(x.sheet, ''), v_first), coalesce(x.sheet_tab, x.tab)) not in
           (select coalesce(core.sheet_id(y ->> 'sheet'), v_first), y ->> 'tab' from jsonb_array_elements(p_draws) y);
  end if;
  return jsonb_build_object('draws', v_n, 'people', v_people, 'linked', v_linked);
end;
$$;
revoke all on function core.ingest_draws(uuid, jsonb) from public;

-- every draw link of a tournament, draw_url first
create or replace function core.draw_urls(t core.tournaments)
returns jsonb
language sql stable set search_path = core, pg_temp
as $$
  select to_jsonb(array(select u from unnest(array[t.draw_url] || t.extra_draw_urls) with ordinality z(u, o) where u is not null order by o))
$$;

-- from 20270313000000_week_window_finished.sql: CHANGED, with draw_urls
create or replace function api.admin_tournaments()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', t.id, 'name', t.name, 'logo_path', t.logo_path, 'venue', t.venue, 'area_id', t.area_id, 'surface', t.surface,
             'starts_on', t.starts_on, 'ends_on', t.ends_on, 'active', t.active, 'finished', t.finished,
             'entry_deadline', t.entry_deadline, 'entry_link', t.entry_link,
             'untimed_lock_time', to_char(t.untimed_lock_time, 'HH24:MI'),
             'source_kind', t.source_kind, 'source_url', t.source_url, 'draw_url', t.draw_url, 'draw_urls', core.draw_urls(t),
             'ongoing', t.ongoing,
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

-- from 20270313000000_week_window_finished.sql: CHANGED, takes draw_urls (the first is draw_url, the rest
-- extra_draw_urls); draw_url alone changes the first link only
create or replace function api.admin_save_tournament(p jsonb)
returns uuid
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
  v_lock time;
  v_urls text[];
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(btrim(p ->> 'name'), '') = '' then raise exception 'name_required' using errcode = '22023'; end if;
  if p ? 'draw_urls' then
    if jsonb_typeof(p -> 'draw_urls') <> 'array' then raise exception 'draw_urls_invalid' using errcode = '22023'; end if;
    -- blank links dropped; one link per spreadsheet (a read takes the whole file), the first kept
    v_urls := array(select u from (select btrim(x) as u, o, row_number() over (partition by core.sheet_id(x) order by o) as k
                                     from jsonb_array_elements_text(p -> 'draw_urls') with ordinality z(x, o)
                                    where btrim(x) <> '') q
                     where k = 1 order by o);
    if exists (select 1 from unnest(v_urls) u where u !~* '^https?://') then
      raise exception 'draw_url_invalid' using errcode = '22023';
    end if;
  end if;
  if coalesce((p ->> 'ongoing')::boolean, false) and coalesce(btrim(p ->> 'source_url'), '') = ''
     and (case when p ? 'draw_urls' then cardinality(v_urls) = 0 else coalesce(btrim(p ->> 'draw_url'), '') = '' end) then
    raise exception 'source_required' using errcode = '22023';
  end if;
  if coalesce(btrim(p ->> 'entry_link'), '') <> '' and btrim(p ->> 'entry_link') !~* '^https?://' then
    raise exception 'entry_link_invalid' using errcode = '22023';
  end if;
  if p ? 'untimed_lock_time' and coalesce(btrim(p ->> 'untimed_lock_time'), '') <> '' then
    begin
      v_lock := btrim(p ->> 'untimed_lock_time')::time;
    exception when others then
      raise exception 'untimed_lock_time_invalid' using errcode = '22023';
    end;
  end if;
  if v_id is null then
    insert into core.tournaments (sport_id, name, venue, area_id, surface, starts_on, ends_on, source,
                                  source_kind, source_url, draw_url, ongoing, season_start_year, entry_deadline, entry_link)
    values (coalesce(p ->> 'sport_id', 'tennis'), btrim(p ->> 'name'), nullif(btrim(p ->> 'venue'), ''),
            nullif(p ->> 'area_id', ''), nullif(p ->> 'surface', ''),
            nullif(p ->> 'starts_on', '')::date, nullif(p ->> 'ends_on', '')::date, 'import',
            nullif(p ->> 'source_kind', ''), nullif(btrim(p ->> 'source_url'), ''), nullif(btrim(p ->> 'draw_url'), ''),
            coalesce((p ->> 'ongoing')::boolean, false), nullif(p ->> 'season_start_year', '')::int,
            nullif(p ->> 'entry_deadline', '')::date, nullif(btrim(p ->> 'entry_link'), ''))
    returning id into v_id;
    if v_lock is not null then update core.tournaments set untimed_lock_time = v_lock where id = v_id; end if;
    if coalesce((p ->> 'finished')::boolean, false) then update core.tournaments set finished = true where id = v_id; end if;
  else
    update core.tournaments
       set name = btrim(p ->> 'name'), venue = nullif(btrim(p ->> 'venue'), ''), area_id = nullif(p ->> 'area_id', ''),
           surface = nullif(p ->> 'surface', ''), starts_on = nullif(p ->> 'starts_on', '')::date,
           ends_on = nullif(p ->> 'ends_on', '')::date,
           source_kind = case when p ? 'source_kind' then nullif(p ->> 'source_kind', '') else source_kind end,
           source_url = case when p ? 'source_url' then nullif(btrim(p ->> 'source_url'), '') else source_url end,
           draw_url = case when p ? 'draw_url' then nullif(btrim(p ->> 'draw_url'), '') else draw_url end,
           ongoing = case when p ? 'ongoing' then (p ->> 'ongoing')::boolean else ongoing end,
           season_start_year = case when p ? 'season_start_year' then nullif(p ->> 'season_start_year', '')::int else season_start_year end,
           entry_deadline = case when p ? 'entry_deadline' then nullif(p ->> 'entry_deadline', '')::date else entry_deadline end,
           entry_link = case when p ? 'entry_link' then nullif(btrim(p ->> 'entry_link'), '') else entry_link end,
           untimed_lock_time = coalesce(v_lock, untimed_lock_time),
           finished = case when p ? 'finished' then coalesce((p ->> 'finished')::boolean, false) else finished end
     where id = v_id;
    if not found then raise exception 'tournament_not_found' using errcode = 'P0002'; end if;
  end if;
  -- CHANGED: the list of draw links, when given, wins over draw_url
  if p ? 'draw_urls' then
    update core.tournaments set draw_url = v_urls[1], extra_draw_urls = coalesce(v_urls[2:], '{}') where id = v_id;
  end if;
  -- CHANGED: never extra links without a first one
  update core.tournaments set draw_url = extra_draw_urls[1], extra_draw_urls = coalesce(extra_draw_urls[2:], '{}')
   where id = v_id and draw_url is null and cardinality(extra_draw_urls) > 0;
  return v_id;
end;
$$;

-- from 20270324000000_ingest_skip_finished.sql: CHANGED, with draw_urls
create or replace function api.ingest_due()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'source_kind', t.source_kind,
                                                       'source_url', t.source_url, 'draw_url', t.draw_url, 'draw_urls', core.draw_urls(t),
                                                       'season_start_year', t.season_start_year,
                                                       'last_run_at', t.last_run_at) order by t.name)
                     from core.tournaments t
                    where t.ongoing and not t.finished and (t.source_url is not null or t.draw_url is not null)), '[]'::jsonb);
end;
$$;

revoke all on function core.sheet_id(text) from public, anon, authenticated;
revoke all on function core.draw_urls(core.tournaments) from public, anon, authenticated;
