-- M4: round robin draws (ΑΟΚ: «MIXED MASTER», «WD MEDIUM»). packages/ingest now reads group grids (teams, the
-- matches played, wins); the draw keeps them under `groups` and the Tournaments page shows each group's table and
-- matches. Teams link to roster players like bracket entrants (and unknown names become players).

create or replace function core.ingest_draws(p_tournament_id uuid, p_draws jsonb)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  d       jsonb;
  v_ents  jsonb;
  v_n     int := 0;
  v_linked int := 0;
  v_people int := 0;
begin
  if not exists (select 1 from core.tournaments where id = p_tournament_id) then
    raise exception 'tournament_not_found' using errcode = 'P0002';
  end if;
  for d in select * from jsonb_array_elements(coalesce(p_draws, '[]'::jsonb)) loop
    select coalesce(jsonb_agg(e - 'people' || jsonb_build_object('players', (
             select coalesce(jsonb_agg(jsonb_build_object('raw', btrim(coalesce(pp ->> 'surname', '') || ' ' || coalesce(pp ->> 'first', '')),
                                                          'player_id', core.draw_player(pp, p_tournament_id)) order by o), '[]'::jsonb)
               from jsonb_array_elements(e -> 'people') with ordinality x(pp, o)))
           order by (e ->> 'pos')::int), '[]'::jsonb)
      into v_ents from jsonb_array_elements(d -> 'entrants') e;
    v_people := v_people + (select count(*) from jsonb_array_elements(v_ents) e, jsonb_array_elements(e -> 'players'));
    v_linked := v_linked + (select count(*) from jsonb_array_elements(v_ents) e, jsonb_array_elements(e -> 'players') pl
                             where pl ->> 'player_id' is not null);
    insert into core.tournament_draws (tournament_id, tab, title, discipline, level, format, size, draw, updated_at)
    values (p_tournament_id, d ->> 'tab', coalesce(d ->> 'title', ''), d ->> 'discipline', coalesce(d ->> 'level', ''),
            d ->> 'format', coalesce((d ->> 'size')::int, 0),
            jsonb_build_object('entrants', v_ents, 'rounds', coalesce(d -> 'rounds', '[]'::jsonb), 'groups', coalesce(d -> 'groups', '[]'::jsonb),
                               'flags', coalesce(d -> 'flags', '[]'::jsonb)), now())
    on conflict (tournament_id, tab) do update
      set title = excluded.title, discipline = excluded.discipline, level = excluded.level, format = excluded.format,
          size = excluded.size, draw = excluded.draw, updated_at = now();
    v_n := v_n + 1;
  end loop;
  if v_n > 0 then
    delete from core.tournament_draws
     where tournament_id = p_tournament_id
       and tab not in (select x ->> 'tab' from jsonb_array_elements(p_draws) x);
  end if;
  return jsonb_build_object('draws', v_n, 'people', v_people, 'linked', v_linked);
end;
$$;

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
    'id', v_t.id, 'name', v_t.name, 'venue', v_t.venue, 'area_id', v_t.area_id, 'surface', v_t.surface,
    'starts_on', v_t.starts_on, 'ends_on', v_t.ends_on, 'entry_deadline', v_t.entry_deadline,
    'state', core.tournament_state(v_t), 'me', v_me,
    'draws', coalesce((
      select jsonb_agg(jsonb_build_object('tab', d.tab, 'title', d.title, 'discipline', d.discipline, 'level', d.level,
                                          'format', d.format, 'size', d.size, 'updated_at', d.updated_at,
                                          'entrants', d.draw -> 'entrants', 'rounds', d.draw -> 'rounds',
                                          'groups', coalesce(d.draw -> 'groups', '[]'::jsonb))
                       order by array_position(array['MS', 'WS', 'MD', 'WD', 'XD'], d.discipline), d.level, d.tab)
        from core.tournament_draws d where d.tournament_id = v_t.id), '[]'::jsonb),
    -- names in the draws that belong to hidden players or minors: the app shows them as «—»
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
