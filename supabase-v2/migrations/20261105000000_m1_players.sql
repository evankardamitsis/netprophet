-- M1 Παίκτες: the players list (friends first, then who plays today), name search and one player's profile.
-- Form and record come from the results themselves (the v1 import left player_sports.record/form empty).

-- last 5 results of a player in a sport, oldest first ('W' / 'L'), as the prototype's «ΝΝΗΝΝ»
create or replace function core.player_form(p_player uuid, p_sport text)
returns jsonb language sql stable set search_path = core, pg_temp
as $$
  select coalesce(jsonb_agg(x.res order by x.starts_at), '[]'::jsonb)
    from (
      select case when mp.side = r.winner_side then 'W' else 'L' end as res, m.starts_at
        from core.match_participants mp
        join core.matches m on m.id = mp.match_id
        join core.match_results r on r.match_id = m.id
       where mp.player_id = p_player and m.sport_id = p_sport and m.approved and m.status <> 'void'
       order by m.starts_at desc
       limit 5
    ) x
$$;

-- one row of the players list, the same shape everywhere
create or replace function core.player_card_json(p_player uuid, p_uid uuid, p_sport text)
returns jsonb language sql stable set search_path = core, pg_temp
as $$
  select jsonb_build_object(
           'id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender,
           'name_forms', p.name_forms, 'area_id', p.area_id,
           'level_tier', ps.level_tier, 'level_direction', ps.level_direction,
           'is_followed', f.player_id is not null, 'relation', f.relation,
           'form', core.player_form(p.id, p_sport))
    from core.players p
    left join core.player_sports ps on ps.player_id = p.id and ps.sport_id = p_sport
    left join core.follows f on f.user_id = p_uid and f.player_id = p.id
   where p.id = p_player
$$;

-- a person in a match line: enough to name them («με Δημήτρη Γκότση»)
create or replace function core.player_ref_json(p_player uuid)
returns jsonb language sql stable set search_path = core, pg_temp
as $$
  select jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname,
                            'gender', p.gender, 'name_forms', p.name_forms)
    from core.players p where p.id = p_player
$$;

create or replace function api.get_players_home(p_limit int default 60)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_sport   text;
  v_claimed uuid;
  v_limit   int := least(greatest(coalesce(p_limit, 60), 1), 200);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select primary_sport, claimed_player_id into v_sport, v_claimed
    from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;

  return jsonb_build_object(
    'total_players', (select count(*) from core.players where status = 'active' and not hidden),
    'players', coalesce((
      with today as (
        -- everyone in today's matches (Athens day), in start time, side and position order
        select x.player_id, min(x.ord) as ord
          from (
            select mp.player_id, row_number() over (order by m.starts_at, mp.side, mp.position) as ord
              from core.matches m
              join core.match_participants mp on mp.match_id = m.id
             where m.approved and m.status <> 'void' and m.sport_id = v_sport
               and core.athens_day(m.starts_at) = core.athens_day()
          ) x
         group by x.player_id
      ),
      friends as (
        select f.player_id, row_number() over (order by f.created_at) as ord
          from core.follows f where f.user_id = v_uid
      ),
      listed as (
        select fr.player_id, 0 as grp, fr.ord from friends fr
         where not exists (select 1 from today t where t.player_id = fr.player_id)
        union all
        select t.player_id, 1, t.ord from today t
      )
      select jsonb_agg(core.player_card_json(l.player_id, v_uid, v_sport) order by l.grp, l.ord)
        from (
          select l.* from listed l
            join core.players p on p.id = l.player_id
           where p.status = 'active' and not p.hidden
             and l.player_id is distinct from v_claimed
           order by l.grp, l.ord
           limit v_limit
        ) l
    ), '[]'::jsonb));
end;
$$;

-- name search (Greek and Greeklish, like api.search_players) returning list rows
create or replace function api.find_players(p_query text, p_limit int default 20)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_sport  text;
  v_q      text := core.normalize_search(p_query);
  v_tokens text[];
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_q = '' then return '[]'::jsonb; end if;
  select primary_sport into v_sport from core.profiles where user_id = v_uid;
  v_tokens := string_to_array(v_q, ' ');
  return coalesce((
    select jsonb_agg(core.player_card_json(s.id, v_uid, coalesce(v_sport, 'tennis')) order by s.rank)
      from (
        select p.id,
               row_number() over (order by (p.surname_norm = v_q) desc, similarity(p.search_norm, v_q) desc,
                                           p.surname, p.first_name) as rank
          from core.players p
         where not p.hidden and p.status = 'active'
           and (select bool_and(p.search_norm like '%' || t || '%') from unnest(v_tokens) t)
         order by rank
         limit least(greatest(coalesce(p_limit, 20), 1), 50)
      ) s), '[]'::jsonb);
end;
$$;

create or replace function api.get_player(p_player_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_sport text;
  v_year  int := extract(year from core.athens_day())::int;
  v_out   jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from core.players where id = p_player_id and status = 'active' and not hidden) then
    raise exception 'player_not_found' using errcode = 'P0002';
  end if;
  select primary_sport into v_sport from core.profiles where user_id = v_uid;
  v_sport := coalesce(v_sport, 'tennis');

  v_out := core.player_card_json(p_player_id, v_uid, v_sport);

  return v_out || jsonb_build_object(
    'is_me', exists (select 1 from core.players where id = p_player_id and claimed_by_user_id = v_uid),
    -- «Φέτος»: wins and losses in the current Athens year
    'record_year', (
      select jsonb_build_object('w', count(*) filter (where mp.side = r.winner_side),
                                'l', count(*) filter (where mp.side <> r.winner_side))
        from core.match_participants mp
        join core.matches m on m.id = mp.match_id
        join core.match_results r on r.match_id = m.id
       where mp.player_id = p_player_id and m.sport_id = v_sport and m.approved and m.status <> 'void'
         and extract(year from core.athens_day(m.starts_at)) = v_year),
    -- «Τελευταία ματς»: newest first
    'last_matches', coalesce((
      select jsonb_agg(x.j order by x.starts_at desc)
        from (
          select m.starts_at, jsonb_build_object(
                   'match_id', m.id, 'starts_at', m.starts_at, 'format', m.format,
                   'won', mp.side = r.winner_side, 'score', r.score_summary,
                   'retired', r.retired, 'walkover', r.walkover,
                   'partner', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                                 from core.match_participants o
                                where o.match_id = m.id and o.side = mp.side and o.player_id <> p_player_id),
                   'opponents', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                                   from core.match_participants o
                                  where o.match_id = m.id and o.side <> mp.side)) as j
            from core.match_participants mp
            join core.matches m on m.id = mp.match_id
            join core.match_results r on r.match_id = m.id
           where mp.player_id = p_player_id and m.sport_id = v_sport and m.approved and m.status <> 'void'
           order by m.starts_at desc
           limit 5
        ) x), '[]'::jsonb),
    -- «Επόμενο ματς»: the nearest one still to play
    'next_match', (
      select jsonb_build_object(
               'match_id', m.id, 'starts_at', m.starts_at, 'format', m.format,
               'partner', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                             from core.match_participants o
                            where o.match_id = m.id and o.side = mp.side and o.player_id <> p_player_id),
               'opponents', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                               from core.match_participants o
                              where o.match_id = m.id and o.side <> mp.side))
        from core.match_participants mp
        join core.matches m on m.id = mp.match_id
       where mp.player_id = p_player_id and m.approved and m.status in ('announced', 'scheduled')
         and m.starts_at > now()
       order by m.starts_at
       limit 1));
end;
$$;

revoke all on function api.get_players_home(int) from public, anon;
revoke all on function api.find_players(text, int) from public, anon;
revoke all on function api.get_player(uuid) from public, anon;
grant execute on function api.get_players_home(int) to authenticated, service_role;
grant execute on function api.find_players(text, int) to authenticated, service_role;
grant execute on function api.get_player(uuid) to authenticated, service_role;
