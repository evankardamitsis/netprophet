-- M2 «+ Ματς»: players log their own matches (founder decisions, 12 Oct 2026).
--   «Έρχεται»: a match still to play; it shows in feeds at once (no admin approval) and people vote on it.
--   «Παίχτηκε»: a played match with its result; votes on it resolve at once (status 'confirmed'), the opponents get
--              a pending confirmation, and a dispute will undo the votes (M2 part 2; result_version is the hook).
--   A result logged for a match already in the app («Αυτό είναι το ματς σου;») attaches to it instead of creating
--   a second one: that is how votes cast on a «Έρχεται» match pay out.
--   Players only know who won and the sets («2-1»), not the games: match_results gets sets_won/sets_lost, and a
--   result may have no game scores when those are set. Nothing invents game scores.
--   A new opponent name creates a pending player (moderation checks it later, the opponent link can claim it); a
--   logger without a player gets their own, pending, from their profile.

-- results that only know the sets ------------------------------------------------------------------------
alter table core.match_results add column sets_won smallint check (sets_won between 0 and 9),
                               add column sets_lost smallint check (sets_lost between 0 and 9);
comment on column core.match_results.sets_won is 'Sets won by the winner when the games are not known (player-logged); null otherwise.';

create or replace function core.check_match_result()
returns trigger language plpgsql set search_path = core, pg_temp
as $$
declare
  v_sport   text;
  v_cfg     jsonb;
  v_best    int;
  v_need    int;
  v_n       int;
  v_i       int;
  v_set     jsonb;
  v_w       int;
  v_l       int;
  v_ws      int := 0;
  v_ls      int := 0;
begin
  select sport_id into v_sport from core.matches where id = new.match_id;
  if v_sport is null then raise exception 'match_not_found'; end if;

  if not exists (select 1 from core.match_participants where match_id = new.match_id and side = new.winner_side) then
    raise exception 'result_incoherent: winner_side % does not play in this match', new.winner_side;
  end if;

  select config into v_cfg from core.sports where id = v_sport;
  v_cfg := coalesce(v_cfg, '{}'::jsonb);

  if jsonb_typeof(new.sets) <> 'array' then
    raise exception 'result_incoherent: sets must be an array';
  end if;
  v_n := jsonb_array_length(new.sets);

  if coalesce(v_cfg ->> 'score_model', 'sets') = 'sets' then
    v_best := coalesce((v_cfg ->> 'best_of_sets')::int, 3);
    v_need := v_best / 2 + 1;

    -- sets only, no games (player-logged): the winner reached the majority, the loser did not
    if v_n = 0 and new.sets_won is not null then
      if new.sets_lost is null or new.sets_won < v_need or new.sets_lost >= v_need or new.sets_won + new.sets_lost > v_best then
        raise exception 'result_incoherent: % - % is not a finished best of %', new.sets_won, new.sets_lost, v_best;
      end if;
      new.score_summary := new.sets_won || '-' || new.sets_lost;
      return new;
    end if;

    if v_n > v_best then raise exception 'result_incoherent: more than % sets', v_best; end if;

    for v_i in 0..v_n - 1 loop
      v_set := new.sets -> v_i;
      if jsonb_typeof(v_set) <> 'object' or jsonb_typeof(v_set -> 'w') <> 'number' or jsonb_typeof(v_set -> 'l') <> 'number' then
        raise exception 'result_incoherent: set % must be {"w":int,"l":int}', v_i + 1;
      end if;
      v_w := (v_set ->> 'w')::int;
      v_l := (v_set ->> 'l')::int;
      if v_w < 0 or v_l < 0 or v_w = v_l or v_w > 99 or v_l > 99 then
        raise exception 'result_incoherent: set % has an impossible score %-%', v_i + 1, v_w, v_l;
      end if;
      if coalesce((v_set ->> 'stb')::boolean, false) and (v_i <> v_n - 1 or v_ws <> v_ls or v_i + 1 <> v_best) then
        raise exception 'result_incoherent: super tie-break only decides a 1-1 match';
      end if;
      if v_w > v_l then v_ws := v_ws + 1; else v_ls := v_ls + 1; end if;
      if (v_ws >= v_need or v_ls >= v_need) and v_i < v_n - 1 then
        raise exception 'result_incoherent: sets continue after the match was decided';
      end if;
    end loop;

    if not (new.retired or new.walkover) then
      if v_ws < v_need then
        raise exception 'result_incoherent: winner won % sets, needs %', v_ws, v_need;
      end if;
      if v_ls >= v_need then
        raise exception 'result_incoherent: loser reached the majority of sets';
      end if;
    end if;
    new.score_summary := case when v_n = 0 then null else v_ws || '-' || v_ls end;
  end if;
  return new;
end;
$$;

-- one way to write a result, for admins, imports and players --------------------------------------------
create or replace function core.set_result(p_match_id uuid, p_winner_side int, p_sets jsonb, p_sets_won int, p_sets_lost int,
                                           p_retired boolean, p_walkover boolean, p_by uuid)
returns int
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_m   core.matches;
  v_ver int;
begin
  select * into v_m from core.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found' using errcode = 'P0002'; end if;
  if v_m.status = 'void' then raise exception 'match_void'; end if;
  if v_m.resolved_at is not null then
    raise exception 'already_resolved: result corrections are not supported yet';
  end if;

  insert into core.match_results (match_id, winner_side, sets, sets_won, sets_lost, retired, walkover, entered_by)
  values (p_match_id, p_winner_side::smallint, coalesce(p_sets, '[]'::jsonb), p_sets_won, p_sets_lost,
          coalesce(p_retired, false), coalesce(p_walkover, false), p_by)
  on conflict (match_id) do update
    set winner_side = excluded.winner_side, sets = excluded.sets, sets_won = excluded.sets_won,
        sets_lost = excluded.sets_lost, retired = excluded.retired, walkover = excluded.walkover,
        entered_by = excluded.entered_by, entered_at = now(),
        result_version = core.match_results.result_version + 1
  returning result_version into v_ver;

  -- player-logged results count for levels only once the opponent confirms (M2 part 2)
  update core.matches
     set status = 'confirmed',
         counts_for_levels = counts_for_levels or source in ('admin', 'import')
   where id = p_match_id;

  insert into core.outbox (kind, payload, idempotency_key)
  values ('resolve_match', jsonb_build_object('match_id', p_match_id), 'resolve:' || p_match_id || ':' || v_ver)
  on conflict (idempotency_key) do nothing;
  return v_ver;
end;
$$;
revoke all on function core.set_result(uuid, int, jsonb, int, int, boolean, boolean, uuid) from public;

create or replace function api.admin_set_result(
  p_match_id uuid, p_winner_side int, p_sets jsonb,
  p_retired boolean default false, p_walkover boolean default false)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not (core.is_service() or core.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object('match_id', p_match_id,
    'result_version', core.set_result(p_match_id, p_winner_side, p_sets, null, null, p_retired, p_walkover, auth.uid()));
end;
$$;

-- Αποτελέσματα needs the summary when there are no games ---------------------------------------------------
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
                 jsonb_build_object('pick', v.option, 'outcome', v.outcome, 'points', v.points) end as my
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
           and m.starts_at is not null
           and m.starts_at >= now() - make_interval(days => v_days)
         order by m.starts_at desc
         limit v_limit
      ) d), '[]'::jsonb);
end;
$$;

-- the «+ Ματς» pickers --------------------------------------------------------------------------------------
create or replace function api.list_tournaments()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'venue', t.venue, 'area_id', t.area_id,
                                        'starts_on', t.starts_on, 'ends_on', t.ends_on)
                     order by t.starts_on desc nulls last, t.name)
      from core.tournaments t
     where t.active and (t.ends_on is null or t.ends_on >= core.athens_day() - 14)), '[]'::jsonb);
end;
$$;

-- the logger's own player: the claimed one, or a new pending one made from the profile
create or replace function core.own_player(p_uid uuid)
returns uuid
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_pr core.profiles;
  v_id uuid;
begin
  select * into v_pr from core.profiles where user_id = p_uid and deleted_at is null for update;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  if v_pr.claimed_player_id is not null then return v_pr.claimed_player_id; end if;
  if coalesce(btrim(v_pr.first_name), '') = '' or coalesce(btrim(v_pr.surname), '') = '' then
    raise exception 'name_required' using errcode = '22023';
  end if;
  insert into core.players (first_name, surname, gender, area_id, source, status, claimed_by_user_id)
  values (btrim(v_pr.first_name), btrim(v_pr.surname), v_pr.gender, v_pr.area_id, 'user', 'pending', p_uid)
  returning id into v_id;
  update core.profiles set claimed_player_id = v_id, claim_status = 'claimed' where user_id = p_uid;
  return v_id;
end;
$$;
revoke all on function core.own_player(uuid) from public;

-- «Αυτό είναι το ματς σου;»: your matches with the same people and format, a day either way, no result yet
create or replace function api.find_my_matches(p_people uuid[], p_date date, p_format text)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me  uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select claimed_player_id into v_me from core.profiles where user_id = v_uid;
  if v_me is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('match_id', m.id, 'starts_at', m.starts_at, 'format', m.format,
                                        'tournament', t.name, 'sides', core.match_sides_json(m.id)) order by m.starts_at)
      from core.matches m
      left join core.tournaments t on t.id = m.tournament_id
     where m.format = p_format and m.status <> 'void'
       and m.starts_at between (p_date - 1)::timestamp at time zone 'Europe/Athens'
                           and (p_date + 2)::timestamp at time zone 'Europe/Athens'
       and not exists (select 1 from core.match_results r where r.match_id = m.id)
       and exists (select 1 from core.match_participants mp where mp.match_id = m.id and mp.player_id = v_me)
       and coalesce((select bool_and(exists (select 1 from core.match_participants mp where mp.match_id = m.id and mp.player_id = x))
                       from unnest(p_people) x), true)), '[]'::jsonb);
end;
$$;

-- a person in the form: {player_id} or {new: {first, surname}}
create or replace function core.log_person(p jsonb)
returns uuid
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_id uuid := nullif(p ->> 'player_id', '')::uuid;
begin
  if v_id is not null then
    if not exists (select 1 from core.players where id = v_id and status <> 'merged') then
      raise exception 'player_not_found' using errcode = 'P0002';
    end if;
    return v_id;
  end if;
  if coalesce(btrim(p -> 'new' ->> 'first'), '') = '' or coalesce(btrim(p -> 'new' ->> 'surname'), '') = '' then
    raise exception 'name_required' using errcode = '22023';
  end if;
  insert into core.players (first_name, surname, source, status)
  values (btrim(p -> 'new' ->> 'first'), btrim(p -> 'new' ->> 'surname'), 'user', 'pending')
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function core.log_person(jsonb) from public;

-- p: {mode: played|soon, date: YYYY-MM-DD, format: singles|doubles|mixed, tournament_id?, tournament_suggestion?,
--     partner?: person, opponents: [person], result?: {won: bool, sets: '2-0'|'2-1'}, match_id?: uuid}
create or replace function api.log_match(p jsonb)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_me      uuid;
  v_sport   text;
  v_mode    text := p ->> 'mode';
  v_format  text := coalesce(p ->> 'format', 'singles');
  v_date    date := (p ->> 'date')::date;
  v_match   uuid := nullif(p ->> 'match_id', '')::uuid;
  v_partner uuid;
  v_opps    uuid[] := '{}';
  v_person  jsonb;
  v_starts  timestamptz;
  v_won     boolean;
  v_lost    int;
  v_side    smallint;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_mode not in ('played', 'soon') then raise exception 'bad_mode' using errcode = '22023'; end if;
  if v_format not in ('singles', 'doubles', 'mixed') then raise exception 'bad_format' using errcode = '22023'; end if;
  if v_date is null then raise exception 'date_required' using errcode = '22023'; end if;
  if v_mode = 'played' and (p -> 'result' is null or (p -> 'result' ->> 'sets') not in ('2-0', '2-1')) then
    raise exception 'result_required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('log_match:' || v_uid, 0));
  v_me := core.own_player(v_uid);
  select primary_sport into v_sport from core.profiles where user_id = v_uid;

  if v_match is null then
    if v_format <> 'singles' then v_partner := core.log_person(p -> 'partner'); end if;
    for v_person in select * from jsonb_array_elements(coalesce(p -> 'opponents', '[]'::jsonb)) loop
      v_opps := v_opps || core.log_person(v_person);
    end loop;
    if array_length(v_opps, 1) is distinct from (case v_format when 'singles' then 1 else 2 end) then
      raise exception 'wrong_opponents' using errcode = '22023';
    end if;
    if v_me = any(v_opps) or v_partner = any(v_opps) or v_partner = v_me then
      raise exception 'same_player_twice' using errcode = '22023';
    end if;
    -- never two of the same match: the screen asks «Αυτό είναι το ματς σου;» first
    if jsonb_array_length(api.find_my_matches(array_remove(v_opps || v_partner, null), v_date, v_format)) > 0 then
      raise exception 'duplicate_match' using errcode = '23505';
    end if;

    -- «Έρχεται» stays open for votes until the end of that day; a played match sits at noon (or now, if earlier)
    v_starts := case v_mode
                  when 'soon' then ((v_date + 1)::timestamp - interval '1 minute') at time zone 'Europe/Athens'
                  else least(now(), (v_date + time '12:00') at time zone 'Europe/Athens') end;
    insert into core.matches (sport_id, format, status, starts_at, tournament_id, source, logged_by,
                              announced_before_played, provenance)
    values (coalesce(v_sport, 'tennis'), v_format, 'scheduled', v_starts, nullif(p ->> 'tournament_id', '')::uuid,
            'user', v_uid, v_mode = 'soon',
            jsonb_strip_nulls(jsonb_build_object('logged_via', 'app',
              'tournament_suggestion', nullif(btrim(coalesce(p ->> 'tournament_suggestion', '')), ''))))
    returning id into v_match;
    insert into core.match_participants (match_id, side, player_id, position) values (v_match, 1, v_me, 1);
    if v_partner is not null then
      insert into core.match_participants (match_id, side, player_id, position) values (v_match, 1, v_partner, 2);
    end if;
    for i in 1..array_length(v_opps, 1) loop
      insert into core.match_participants (match_id, side, player_id, position) values (v_match, 2, v_opps[i], i);
    end loop;
  else
    -- a result for a match already in the app, one of yours, still without a result
    if v_mode <> 'played' then raise exception 'bad_mode' using errcode = '22023'; end if;
    if not exists (select 1 from core.match_participants where match_id = v_match and player_id = v_me) then
      raise exception 'not_your_match' using errcode = '42501';
    end if;
    if exists (select 1 from core.match_results where match_id = v_match) then
      raise exception 'has_result' using errcode = '23505';
    end if;
    update core.matches set announced_before_played = true where id = v_match and source = 'user';
  end if;

  if v_mode = 'played' then
    select side into v_side from core.match_participants where match_id = v_match and player_id = v_me;
    v_won := (p -> 'result' ->> 'won')::boolean;
    v_lost := split_part(p -> 'result' ->> 'sets', '-', 2)::int;
    perform core.set_result(v_match, case when v_won then v_side else 3 - v_side end, '[]'::jsonb, 2, v_lost,
                            false, false, v_uid);
    -- the other side confirms (in the feed, or by the link for people not in the app)
    insert into core.match_confirmations (match_id, player_id, state, via)
    select v_match, mp.player_id, 'pending', 'feed'
      from core.match_participants mp where mp.match_id = v_match and mp.side <> v_side
    on conflict (match_id, player_id) do nothing;
  end if;

  return jsonb_build_object('match_id', v_match, 'mode', v_mode);
end;
$$;

comment on column core.matches.approved is 'False hides a match from feeds. Player-logged matches show at once (founder, 12 Oct 2026); moderation can hide them.';

revoke all on function api.list_tournaments() from public, anon;
revoke all on function api.find_my_matches(uuid[], date, text) from public, anon;
revoke all on function api.log_match(jsonb) from public, anon;
grant execute on function api.list_tournaments() to authenticated, service_role;
grant execute on function api.find_my_matches(uuid[], date, text) to authenticated, service_role;
grant execute on function api.log_match(jsonb) to authenticated, service_role;
