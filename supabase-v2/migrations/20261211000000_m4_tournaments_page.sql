-- M4 part 3b: the app's Tournaments page («Τα τουρνουά σου», prototype). A list of the tournaments that are on,
-- coming or just finished, and each tournament with its draws (the brackets read from the organiser's draw sheet)
-- and its schedule by day (the matches read from the schedule sheet). Everyone sees tournaments, draws and the
-- schedule; «Το πρόγραμμά σου» (your own upcoming tournament matches) is Pro, as in the prototype and the
-- monetization plan. Minors and hidden players never show: their matches are left out and their names in a draw
-- are masked.

-- the state of a tournament today (Athens): on, coming, or done. Without an end date it ends with its last match
-- (or two weeks after it starts, if that is later), so an old import never stays «on» forever.
create or replace function core.tournament_state(t core.tournaments)
returns text
language sql stable set search_path = core, pg_temp
as $$
  with e as (
    select coalesce(t.ends_on,
                    greatest(t.starts_on + 14,
                             (select max(core.athens_day(m.starts_at)) from core.matches m
                               where m.tournament_id = t.id and m.status <> 'void')),
                    (select max(core.athens_day(m.starts_at)) from core.matches m
                      where m.tournament_id = t.id and m.status <> 'void')) as end_day)
  select case
    when t.starts_on is not null and t.starts_on > core.athens_day(now()) then 'upcoming'
    when e.end_day is null or e.end_day < core.athens_day(now()) then 'done'
    else 'ongoing'
  end
  from e
$$;

-- one match as the page shows it
create or replace function core.tournament_match_json(m core.matches)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
    'match_id', m.id, 'starts_at', m.starts_at, 'format', m.format, 'status', m.status,
    'level', e.name, 'discipline', m.provenance ->> 'discipline', 'round', m.round,
    'sides', core.match_sides_json(m.id),
    'winner_side', r.winner_side, 'sets', r.sets, 'retired', r.retired, 'walkover', r.walkover)
    from (select 1) x
    left join core.tournament_events e on e.id = m.event_id
    left join core.match_results r on r.match_id = m.id
$$;

-- a match the page may show: not void, nobody hidden or a minor in it
create or replace function core.tournament_match_visible(p_match uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                      where mp.match_id = p_match and (p.is_minor or p.hidden))
$$;

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
                   'id', t.id, 'name', t.name, 'venue', t.venue, 'area_id', t.area_id, 'surface', t.surface,
                   'starts_on', t.starts_on, 'ends_on', t.ends_on, 'entry_deadline', t.entry_deadline,
                   'level_min', t.level_min, 'level_max', t.level_max, 'state', core.tournament_state(t),
                   'draws', (select count(*) from core.tournament_draws d where d.tournament_id = t.id),
                   'matches', (select count(*) from core.matches m where m.tournament_id = t.id and m.status <> 'void'),
                   'today', (select count(*) from core.matches m where m.tournament_id = t.id and m.status <> 'void'
                              and core.athens_day(m.starts_at) = core.athens_day(now())),
                   'in_it', v_me is not null and (
                     exists (select 1 from core.matches m join core.match_participants mp on mp.match_id = m.id
                              where m.tournament_id = t.id and mp.player_id = v_me)
                     or exists (select 1 from core.tournament_draws d, jsonb_array_elements(d.draw -> 'entrants') en,
                                         jsonb_array_elements(en -> 'players') pl
                                 where d.tournament_id = t.id and pl ->> 'player_id' = v_me::text))) as j
            from core.tournaments t
           where not t.is_minor_event
             and (exists (select 1 from core.matches m where m.tournament_id = t.id and m.status <> 'void')
                  or exists (select 1 from core.tournament_draws d where d.tournament_id = t.id))
             and (core.tournament_state(t) <> 'done'
                  or coalesce(t.ends_on, (select max(core.athens_day(m.starts_at)) from core.matches m where m.tournament_id = t.id)) >= core.athens_day(now()) - 14)
        ) x), '[]'::jsonb),
    -- «Το πρόγραμμά σου»: my next tournament matches (Pro)
    'mine', case when v_pro and v_me is not null then coalesce((
      select jsonb_agg(jsonb_build_object('tournament_id', t.id, 'tournament', t.name) || core.tournament_match_json(m)
                       order by m.starts_at)
        from core.matches m
        join core.tournaments t on t.id = m.tournament_id
        join core.match_participants mp on mp.match_id = m.id and mp.player_id = v_me
       where m.status in ('announced', 'scheduled') and m.starts_at >= now() - interval '2 hours'
         and m.starts_at < now() + interval '14 days'), '[]'::jsonb) end);
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
                                          'entrants', d.draw -> 'entrants', 'rounds', d.draw -> 'rounds')
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

revoke all on function api.get_tournaments() from public, anon;
revoke all on function api.get_tournament(uuid) from public, anon;
grant execute on function api.get_tournaments() to authenticated, service_role;
grant execute on function api.get_tournament(uuid) to authenticated, service_role;
