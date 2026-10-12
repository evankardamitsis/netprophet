-- M2 part 5c: minors and roster tools.
-- Minors (founder, 12 Oct 2026): never voted on, never on cards, lists or profiles. A birth year makes a player a
-- minor while under 18 (is_minor stays settable by staff for players without one). Matches with a minor leave the
-- feed and Αποτελέσματα and refuse votes; minors leave Παίκτες, search, profiles and the roster view. Sign-up
-- under 15 is blocked in the app (onboarding asks); the database keeps no birth date for users.
-- Roster tools (admin /v2/players): search everyone (hidden, pending, minors, merged included), fix names, gender,
-- birth year, minor and hidden flags and area, merge duplicates, and release a claim made by mistake.

create or replace function core.set_minor_from_birth_year()
returns trigger language plpgsql set search_path = core, pg_temp
as $$
begin
  if new.birth_year is not null then
    new.is_minor := extract(year from core.athens_day())::int - new.birth_year < 18;
  end if;
  return new;
end;
$$;
create trigger players_minor before insert or update of birth_year on core.players
  for each row execute function core.set_minor_from_birth_year();

drop policy players_read on core.players;
create policy players_read on core.players for select to authenticated
  using ((not hidden and not is_minor and status = 'active') or claimed_by_user_id = (select auth.uid()) or core.is_staff());

-- Παίκτες, search and profiles leave minors out
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
    'total_players', (select count(*) from core.players where status = 'active' and not hidden and not is_minor),
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
           where p.status = 'active' and not p.hidden and not p.is_minor
             and l.player_id is distinct from v_claimed
           order by l.grp, l.ord
           limit v_limit
        ) l
    ), '[]'::jsonb));
end;
$$;

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
         where not p.hidden and not p.is_minor and p.status = 'active'
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
  if not exists (select 1 from core.players where id = p_player_id and status = 'active' and not hidden and not is_minor) then
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

-- no votes on a match with a minor
create or replace function api.cast_vote(p_match_id uuid, p_side int, p_client_event_id uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_m       core.matches;
  v_vote    core.votes;
  v_claimed uuid;
  v_today   date := core.athens_day();
  v_today_n int;
  v_granted boolean;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_match_id is null or p_side is null or p_side not in (1, 2) then
    raise exception 'invalid_argument: side must be 1 or 2' using errcode = '22023';
  end if;
  if not exists (select 1 from core.profiles where user_id = v_uid and deleted_at is null) then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('user:' || v_uid::text, 0));

  select * into v_m from core.matches where id = p_match_id and approved;
  if not found then raise exception 'match_not_found' using errcode = 'P0002'; end if;

  -- replay of an earlier vote (retry, double tap): same answer, nothing changes, even after lock
  select * into v_vote from core.votes
   where user_id = v_uid and subject_type = 'match' and subject_id = p_match_id;
  if found then
    if v_vote.option <> p_side then
      -- core order: a closed match is reported as closed before the vote is reported as already cast
      if not core.match_is_open(v_m) then
        raise exception 'voting_closed' using errcode = '55000';
      end if;
      raise exception 'already_voted: a vote cannot be changed' using errcode = '23505';
    end if;
    return jsonb_build_object('match_id', p_match_id, 'side', v_vote.option, 'replayed', true,
                              'split', core.vote_split(p_match_id));
  end if;

  if not core.match_is_open(v_m) then
    raise exception 'voting_closed' using errcode = '55000';
  end if;

  select claimed_player_id into v_claimed from core.profiles where user_id = v_uid;
  if v_claimed is not null and exists (
       select 1 from core.match_participants where match_id = p_match_id and player_id = v_claimed) then
    raise exception 'own_match: you cannot vote on your own match' using errcode = '42501';
  end if;
  -- minors are never voted on (founder, 12 Oct 2026)
  if exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
              where mp.match_id = p_match_id and p.is_minor) then
    raise exception 'voting_closed' using errcode = '55000';
  end if;

  insert into core.votes (user_id, subject_type, subject_id, option, client_event_id, day_key)
  values (v_uid, 'match', p_match_id, p_side::smallint, p_client_event_id, v_today)
  returning * into v_vote;

  perform core.ensure_game_state(v_uid);
  select count(*) into v_today_n from core.votes where user_id = v_uid and day_key = v_today;
  update core.user_game_state
     set votes_cast = votes_cast + 1,
         -- active day = 3 cards voted that day
         active_days = active_days + case when v_today_n = 3 then 1 else 0 end,
         last_active_day = case when v_today_n >= 3 then v_today else last_active_day end,
         version = version + 1, updated_at = now()
   where user_id = v_uid;

  -- every 15th vote cast earns a free freeze (counted here, at cast time)
  v_granted := core.record_vote_cast(v_uid, v_m.sport_id, v_vote.id);

  return jsonb_build_object('match_id', p_match_id, 'side', v_vote.option, 'replayed', false,
                            'split', core.vote_split(p_match_id));
end;
$$;

-- the feed and Αποτελέσματα leave matches with a minor out
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
                 'split', case when mv.id is not null then core.vote_split(m.id) end) as card
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

  select coalesce(jsonb_agg(jsonb_build_object('kind', 'sponsored', 'id', s.id, 'label', 'Χορηγούμενο',
                                               'sponsor', s.sponsor, 'title', s.title, 'subtitle', s.subtitle,
                                               'cta_url', s.cta_url) order by s.weight desc, s.id), '[]'::jsonb)
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

  return jsonb_build_object('items', v_out, 'count', jsonb_array_length(v_out));
end;
$$;

create or replace function api.get_results(p_days int default 14, p_limit int default 60)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_days  int := least(greatest(coalesce(p_days, 14), 1), 90);
  v_limit int := least(greatest(coalesce(p_limit, 60), 1), 200);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  return coalesce((
    select jsonb_agg(row_to_json(d)::jsonb order by d.starts_at desc, d.match_id)
      from (
        select m.id as match_id, m.sport_id, m.format, m.starts_at, m.round, m.venue, m.area_id,
               t.name as tournament,
               core.match_sides_json(m.id) as sides,
               r.winner_side, r.sets, r.score_summary, r.retired, r.walkover,
               case when s.total > 0 then jsonb_build_object('side1', s.side1, 'side2', s.side2, 'total', s.total) end
                 as split,
               core.is_upset(case r.winner_side when 1 then s.side1 else s.side2 end, s.total, core.sport_rules(m.sport_id))
                 as upset,
               case when v.option is not null then
                 jsonb_build_object('pick', v.option, 'outcome', v.outcome, 'points', v.points) end as my,
               core.reactions_json(m.id, v_uid) as reactions,
               case when m.status <> 'disputed' then core.kudo_target(v_uid, m.id) end as kudo_to
          from core.matches m
          join core.match_results r on r.match_id = m.id
          left join core.tournaments t on t.id = m.tournament_id
          cross join lateral (
            select count(*)::int as total,
                   count(*) filter (where vv.option = 1)::int as side1,
                   count(*) filter (where vv.option = 2)::int as side2
              from core.votes vv
             where vv.subject_type = 'match' and vv.subject_id = m.id
          ) s
          left join core.votes v on v.subject_type = 'match' and v.subject_id = m.id and v.user_id = v_uid
         where m.approved
           and m.status <> 'void'
           and not core.is_blocked(v_uid, m.logged_by)
           and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and p.is_minor)
           and m.starts_at is not null
           and m.starts_at >= now() - make_interval(days => v_days)
         order by m.starts_at desc
         limit v_limit
      ) d), '[]'::jsonb);
end;
$$;

-- roster tools ------------------------------------------------------------------------------------------------
create or replace function api.admin_players(p_query text default null, p_filter text default 'all', p_limit int default 50)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare v_q text := core.normalize_search(coalesce(p_query, ''));
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'player_id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender,
             'birth_year', p.birth_year, 'is_minor', p.is_minor, 'hidden', p.hidden, 'status', p.status,
             'source', p.source, 'area_id', p.area_id, 'merged_into', p.merged_into,
             'claimed_by', (select coalesce(pr.display_name, pr.first_name || ' ' || pr.surname) from core.profiles pr
                             where pr.user_id = p.claimed_by_user_id),
             'matches', (select count(*) from core.match_participants mp where mp.player_id = p.id))
           order by p.surname, p.first_name)
      from (select * from core.players p
             where (v_q = '' or p.search_norm like '%' || v_q || '%')
               and case coalesce(p_filter, 'all')
                     when 'hidden' then p.hidden
                     when 'minors' then p.is_minor
                     when 'pending' then p.status = 'pending'
                     when 'claimed' then p.claimed_by_user_id is not null
                     else true end
             order by p.surname, p.first_name
             limit least(greatest(coalesce(p_limit, 50), 1), 200)) p), '[]'::jsonb);
end;
$$;

-- p: any of first_name, surname, gender ('m' | 'f' | null), birth_year (null clears), is_minor, hidden, area_id, status
create or replace function api.admin_update_player(p_player_id uuid, p jsonb)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p ? 'status' and p ->> 'status' not in ('pending', 'active') then raise exception 'bad_status' using errcode = '22023'; end if;
  update core.players set
    first_name = case when p ? 'first_name' then btrim(p ->> 'first_name') else first_name end,
    surname    = case when p ? 'surname' then btrim(p ->> 'surname') else surname end,
    gender     = case when p ? 'gender' then nullif(p ->> 'gender', '') else gender end,
    birth_year = case when p ? 'birth_year' then (p ->> 'birth_year')::int else birth_year end,
    is_minor   = case when p ? 'is_minor' then (p ->> 'is_minor')::boolean else is_minor end,
    hidden     = case when p ? 'hidden' then (p ->> 'hidden')::boolean else hidden end,
    area_id    = case when p ? 'area_id' then nullif(p ->> 'area_id', '') else area_id end,
    status     = case when p ? 'status' then p ->> 'status' else status end
   where id = p_player_id and status <> 'merged';
  if not found then raise exception 'player_not_found' using errcode = 'P0002'; end if;
  return (select jsonb_build_object('player_id', id, 'is_minor', is_minor, 'hidden', hidden, 'status', status)
            from core.players where id = p_player_id);
end;
$$;

-- a claim made by mistake: the account and the player part (the account keeps its votes and points)
create or replace function api.admin_unclaim(p_player_id uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  update core.players set claimed_by_user_id = null where id = p_player_id and claimed_by_user_id is not null;
  if not found then raise exception 'not_claimed' using errcode = 'P0002'; end if;
  return jsonb_build_object('player_id', p_player_id, 'claimed', false);
end;
$$;

revoke all on function api.admin_players(text, text, int) from public, anon;
revoke all on function api.admin_update_player(uuid, jsonb) from public, anon;
revoke all on function api.admin_unclaim(uuid) from public, anon;
grant execute on function api.admin_players(text, text, int) to authenticated, service_role;
grant execute on function api.admin_update_player(uuid, jsonb) to authenticated, service_role;
grant execute on function api.admin_unclaim(uuid) to authenticated, service_role;
