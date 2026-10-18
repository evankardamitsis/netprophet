-- No match can be invented (founder, 18 Oct 2026): every match a player registers is checked by staff first.
--   A match a player logs is created hidden (approved = false) with review 'pending'. Nobody sees it, votes on it or
--   gets points for it until staff approve it in moderation («Ματς παικτών»).
--   A result a player enters (on a new match, or on a match already in the app) is stored, but nothing resolves: no
--   resolve_match job, the match keeps its status and gets review 'pending'. Staff approve, then the votes pay.
--   Admins, editors and imports are not held: their matches and results go live as before. An official result from
--   an import on a match a player logged counts as the check (review 'approved').
--   Reject: a match a player made up goes (void, hidden, its votes close with no outcome); a result a player gave
--   for a real match is taken away and the match stays, waiting for its real result.
--   The logger finds out in the app (an in_app notification 'match_review').

alter table core.matches
  add column review text check (review in ('pending', 'approved', 'rejected'));
comment on column core.matches.review is
  'Staff review of what a player logged: pending (a new match or a result waits for staff), approved, rejected. Null for admin and import matches.';
comment on column core.matches.approved is
  'False hides a match from everyone but its logger and staff. Player-logged matches start hidden until staff approve them (founder, 18 Oct 2026).';
create index matches_review_idx on core.matches (created_at) where review = 'pending';

-- a held result goes live: the match is confirmed and its votes resolve (the same job set_result always wrote) ----
create or replace function core.release_result(p_match_id uuid)
returns void
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_ver int;
begin
  select result_version into v_ver from core.match_results where match_id = p_match_id;
  if v_ver is null then return; end if;
  -- player-logged results count for levels once the opponent confirms (M2 part 2); one may have confirmed already
  update core.matches m
     set status = 'confirmed',
         counts_for_levels = m.counts_for_levels or m.source in ('admin', 'import')
                             or exists (select 1 from core.match_confirmations c
                                         where c.match_id = m.id and c.state = 'confirmed')
   where m.id = p_match_id;
  insert into core.outbox (kind, payload, idempotency_key)
  values ('resolve_match', jsonb_build_object('match_id', p_match_id), 'resolve:' || p_match_id || ':' || v_ver)
  on conflict (idempotency_key) do nothing;
end;
$$;
revoke all on function core.release_result(uuid) from public;

-- one way to write a result, for admins, imports and players; p_hold keeps a player's result for staff ----------
drop function core.set_result(uuid, int, jsonb, int, int, boolean, boolean, uuid);
create function core.set_result(p_match_id uuid, p_winner_side int, p_sets jsonb, p_sets_won int, p_sets_lost int,
                                p_retired boolean, p_walkover boolean, p_by uuid, p_hold boolean default false)
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

  if coalesce(p_hold, false) then
    -- a player's result: stored, nothing resolves until staff approve it
    update core.matches set review = 'pending' where id = p_match_id;
  else
    -- an official result (staff, import) is the check a pending match waited for
    update core.matches set review = 'approved', approved = true where id = p_match_id and review = 'pending';
    perform core.release_result(p_match_id);
  end if;
  return v_ver;
end;
$$;
revoke all on function core.set_result(uuid, int, jsonb, int, int, boolean, boolean, uuid, boolean) from public;

-- p: {mode: played|soon, date: YYYY-MM-DD, format: singles|doubles|mixed, tournament_id?, tournament_suggestion?,
--     partner?: person, opponents: [person], result?: {won: bool, sets: '2-0'|'2-1'}, match_id?: uuid}
-- Players' matches start hidden and their results wait for staff; staff who log a match are not held.
create or replace function api.log_match(p jsonb)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_staff   boolean := core.is_staff();
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
    if exists (
      select 1 from core.matches m
       where m.format = v_format and m.status <> 'void'
         and m.starts_at >= ((v_date - 1)::timestamp at time zone 'Europe/Athens')
         and m.starts_at <  ((v_date + 2)::timestamp at time zone 'Europe/Athens')
         and (select count(*) from core.match_participants mp
               where mp.match_id = m.id and mp.player_id = any (array_remove(v_opps || v_partner || v_me, null)))
             = 1 + array_length(v_opps, 1) + (case when v_partner is null then 0 else 1 end)) then
      raise exception 'duplicate_match' using errcode = '23505';
    end if;

    -- «Έρχεται» stays open for votes until the end of that day; a played match sits at noon (or now, if earlier)
    v_starts := case v_mode
                  when 'soon' then ((v_date + 1)::timestamp - interval '1 minute') at time zone 'Europe/Athens'
                  else least(now(), (v_date + time '12:00') at time zone 'Europe/Athens') end;
    insert into core.matches (sport_id, format, status, starts_at, tournament_id, source, logged_by,
                              announced_before_played, provenance, approved, review)
    values (coalesce(v_sport, 'tennis'), v_format, 'scheduled', v_starts, nullif(p ->> 'tournament_id', '')::uuid,
            'user', v_uid, v_mode = 'soon',
            jsonb_strip_nulls(jsonb_build_object('logged_via', 'app',
              'tournament_suggestion', nullif(btrim(coalesce(p ->> 'tournament_suggestion', '')), ''))),
            v_staff, case when v_staff then null else 'pending' end)
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
                            false, false, v_uid, not v_staff);
    -- the other side confirms (in the feed, or by the link for people not in the app)
    insert into core.match_confirmations (match_id, player_id, state, via)
    select v_match, mp.player_id, 'pending', 'feed'
      from core.match_participants mp where mp.match_id = v_match and mp.side <> v_side
    on conflict (match_id, player_id) do nothing;
  end if;

  return jsonb_build_object('match_id', v_match, 'mode', v_mode,
                            'review', (select review from core.matches where id = v_match));
end;
$$;

-- «Ματς παικτών»: what players logged and staff have not checked yet, oldest first ------------------------------
create or replace function api.admin_match_review_queue()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'match_id', m.id,
             -- 'match': a new match a player logged (hidden); 'result': a result for a match already in the app
             'kind', case when m.approved then 'result' else 'match' end,
             'format', m.format, 'starts_at', m.starts_at, 'created_at', m.created_at,
             'entered_at', r.entered_at, 'status', m.status,
             'tournament', t.name,
             'tournament_suggestion', m.provenance ->> 'tournament_suggestion',
             'sides', core.match_sides_json(m.id),
             'result', case when r.match_id is not null then
                         jsonb_build_object('winner_side', r.winner_side, 'score', r.score_summary) end,
             'logger', (select jsonb_build_object('user_id', pr.user_id, 'display_name', pr.display_name,
                                                  'name', coalesce(nullif(btrim(concat_ws(' ', pr.first_name, pr.surname)), ''),
                                                                   nullif(btrim(pr.display_name), '')))
                          from core.profiles pr where pr.user_id = coalesce(r.entered_by, m.logged_by)),
             'answers', (select coalesce(jsonb_agg(jsonb_build_object(
                                  'player', p.first_name || ' ' || p.surname, 'state', c.state, 'fix', c.proposed_fix)), '[]'::jsonb)
                           from core.match_confirmations c join core.players p on p.id = c.player_id
                          where c.match_id = m.id and c.state <> 'pending'),
             'votes', (select count(*) from core.votes v where v.subject_type = 'match' and v.subject_id = m.id))
           order by coalesce(r.entered_at, m.created_at), m.id)
      from core.matches m
      left join core.match_results r on r.match_id = m.id
      left join core.tournaments t on t.id = m.tournament_id
     where m.review = 'pending' and m.status <> 'void'), '[]'::jsonb);
end;
$$;

-- «Έγκριση» / «Απόρριψη» -------------------------------------------------------------------------------------------
create or replace function api.admin_review_match(p_match uuid, p_approve boolean)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_m        core.matches;
  v_r        core.match_results;
  v_who      uuid;
  v_decision text := case when p_approve then 'approved' else 'rejected' end;
  v_new      boolean;
  v_votes    int;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_approve is null then raise exception 'bad_decision' using errcode = '22023'; end if;
  select * into v_m from core.matches where id = p_match for update;
  if not found then raise exception 'match_not_found' using errcode = 'P0002'; end if;
  if v_m.review is not distinct from v_decision then
    return jsonb_build_object('match_id', p_match, 'decision', v_decision, 'replayed', true);
  end if;
  if v_m.review is distinct from 'pending' or v_m.status = 'void' then
    raise exception 'not_pending' using errcode = 'P0002';
  end if;
  select * into v_r from core.match_results where match_id = p_match;
  v_who := coalesce(v_r.entered_by, v_m.logged_by);
  v_new := not v_m.approved;   -- a new match a player logged, not a result for one already in the app

  if p_approve then
    update core.matches
       set approved = true, review = 'approved',
           provenance = provenance || jsonb_build_object('review', jsonb_build_object('decision', v_decision, 'by', auth.uid(), 'at', now()))
     where id = p_match;
    if v_r.match_id is not null and v_m.resolved_at is null and v_m.status not in ('cancelled', 'disputed') then
      perform core.release_result(p_match);
    end if;
    if v_new and v_m.source = 'user' and v_m.logged_by is not null then
      perform core.quest_event(v_m.logged_by, 'match_logged', now());
      perform core.badges_refresh_match(p_match);
    end if;
  elsif v_new then
    -- made up, or not right: it goes for good; votes (there should be none) close with no outcome
    select count(*)::int into v_votes from core.votes where subject_type = 'match' and subject_id = p_match;
    update core.matches
       set approved = false, review = 'rejected', status = 'void', counts_for_levels = false,
           provenance = provenance || jsonb_build_object('review', jsonb_build_object('decision', v_decision, 'by', auth.uid(), 'at', now()))
     where id = p_match;
    if v_votes > 0 then
      insert into core.outbox (kind, payload, idempotency_key)
      values ('resolve_match', jsonb_build_object('match_id', p_match), 'resolve:' || p_match || ':void')
      on conflict (idempotency_key) do nothing;
    end if;
  else
    -- a real match with a result that does not stand: the result goes, the match stays for its real result
    delete from core.match_results where match_id = p_match;
    delete from core.match_confirmations where match_id = p_match;
    update core.matches
       set review = 'rejected',
           provenance = provenance || jsonb_build_object('review', jsonb_build_object('decision', v_decision, 'by', auth.uid(), 'at', now(),
                                                                                       'result', to_jsonb(v_r) - 'match_id'))
     where id = p_match;
  end if;

  if v_who is not null then
    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (v_who, 'match_review',
            jsonb_build_object('match_id', p_match, 'decision', v_decision, 'kind', case when v_new then 'match' else 'result' end),
            'in_app', 'match_review:' || p_match || ':' || v_decision)
    on conflict (dedupe_key) do nothing;
  end if;
  return jsonb_build_object('match_id', p_match, 'decision', v_decision, 'kind', case when v_new then 'match' else 'result' end,
                            'replayed', false);
end;
$$;

revoke all on function api.admin_match_review_queue() from public, anon;
revoke all on function api.admin_review_match(uuid, boolean) from public, anon;
grant execute on function api.admin_match_review_queue() to authenticated, service_role;
grant execute on function api.admin_review_match(uuid, boolean) to authenticated, service_role;

-- every place a player sees matches or results: hidden matches stay out, and so do results staff have not checked.
-- The logger sees their own pending result on Αποτελέσματα, marked «Σε έλεγχο» (review).
-- from 20270126000000_results_filters.sql
create or replace function api.get_results(p_days int default 14, p_limit int default 60,
                                           p_tournament uuid default null, p_query text default null)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_q     text := nullif(core.normalize_search(btrim(coalesce(p_query, ''))), '');
  -- a tournament or a name looks further back: the whole tournament, a player's whole season so far
  v_days  int := case when p_tournament is not null or v_q is not null then 365
                      else least(greatest(coalesce(p_days, 14), 1), 90) end;
  v_limit int := least(greatest(coalesce(p_limit, 60), 1), 200);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  return coalesce((
    select jsonb_agg(row_to_json(d)::jsonb order by d.starts_at desc, d.match_id)
      from (
        select m.id as match_id, m.sport_id, m.format, m.starts_at, m.round, m.venue, m.area_id,
               t.id as tournament_id, t.name as tournament, e.name as level, m.provenance ->> 'discipline' as discipline,
               core.match_sides_json(m.id) as sides,
               r.winner_side, r.sets, r.score_summary, r.retired, r.walkover, m.review,
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
          left join core.tournament_events e on e.id = m.event_id
          cross join lateral (
            select count(*)::int as total,
                   count(*) filter (where vv.option = 1)::int as side1,
                   count(*) filter (where vv.option = 2)::int as side2
              from core.votes vv
             where vv.subject_type = 'match' and vv.subject_id = m.id
          ) s
          left join core.votes v on v.subject_type = 'match' and v.subject_id = m.id and v.user_id = v_uid
         where ((m.approved and m.review is distinct from 'pending') or (m.review = 'pending' and r.entered_by = v_uid))
           and m.status <> 'void'
           and not core.is_blocked(v_uid, m.logged_by)
           and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and p.is_minor)
           and m.starts_at is not null
           and m.starts_at >= now() - make_interval(days => v_days)
           and (p_tournament is null or m.tournament_id = p_tournament)
           and (v_q is null or exists (
                 select 1 from core.match_participants mq join core.players pq on pq.id = mq.player_id
                  where mq.match_id = m.id and not pq.hidden
                    and (position(v_q in core.normalize_search(coalesce(pq.first_name, '') || ' ' || coalesce(pq.surname, ''))) > 0
                         or position(v_q in core.normalize_search(coalesce(pq.surname, '') || ' ' || coalesce(pq.first_name, ''))) > 0)))
         order by m.starts_at desc
         limit v_limit
      ) d), '[]'::jsonb);
end;
$$;

-- from 20261110000000_pro_scout.sql
create or replace function core.player_results(p_player uuid, p_sport text)
returns table (match_id uuid, starts_at timestamptz, format text, side smallint, won boolean, sets jsonb,
               score_summary text, retired boolean, walkover boolean)
language sql stable set search_path = core, pg_temp
as $$
  select m.id, m.starts_at, m.format, mp.side, mp.side = r.winner_side, r.sets, r.score_summary, r.retired, r.walkover
    from core.match_participants mp
    join core.matches m on m.id = mp.match_id
    join core.match_results r on r.match_id = m.id
   where mp.player_id = p_player and m.sport_id = p_sport and m.approved and m.review is distinct from 'pending' and m.status <> 'void'
$$;

-- from 20261105000000_m1_players.sql
create or replace function core.player_form(p_player uuid, p_sport text)
returns jsonb language sql stable set search_path = core, pg_temp
as $$
  select coalesce(jsonb_agg(x.res order by x.starts_at), '[]'::jsonb)
    from (
      select case when mp.side = r.winner_side then 'W' else 'L' end as res, m.starts_at
        from core.match_participants mp
        join core.matches m on m.id = mp.match_id
        join core.match_results r on r.match_id = m.id
       where mp.player_id = p_player and m.sport_id = p_sport and m.approved and m.review is distinct from 'pending' and m.status <> 'void'
       order by m.starts_at desc
       limit 5
    ) x
$$;

-- from 20270124000000_quiz_quality.sql
create or replace function core.quiz_facts(p_player uuid, p_sport text, p_day date)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_from  timestamptz := (p_day::timestamp + interval '9 hours') at time zone 'Europe/Athens';
  v_last  record;
  v_month int;
  v_wins  int;
  v_tour  text;
  v_hand  text;
  v_g     text;
  v_clues jsonb := '[]'::jsonb;
begin
  select gender into v_g from core.players where id = p_player;
  -- the last match with a result
  select r.winner_side = mp.side as won, r.sets, jsonb_array_length(coalesce(r.sets, '[]'::jsonb)) as n
    into v_last
    from core.match_participants mp
    join core.matches mx on mx.id = mp.match_id and mx.sport_id = p_sport and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
    join core.match_results r on r.match_id = mx.id and not r.walkover
   where mp.player_id = p_player and mx.starts_at < v_from
   order by mx.starts_at desc limit 1;
  if v_last.won is not null then
    v_clues := v_clues || to_jsonb(
      case when v_last.won and v_last.n = 3 then 'Κέρδισε το τελευταίο ' || case when v_g = 'f' then 'της' else 'του' end || ' ματς στο τρίτο σετ'
           when v_last.won then 'Κέρδισε το τελευταίο ' || case when v_g = 'f' then 'της' else 'του' end || ' ματς ' || core.quiz_score(v_last.sets)
           when v_last.n = 3 then 'Έχασε το τελευταίο ' || case when v_g = 'f' then 'της' else 'του' end || ' ματς στο τρίτο σετ'
           else 'Έχασε το τελευταίο ' || case when v_g = 'f' then 'της' else 'του' end || ' ματς' end);
  end if;
  -- this month
  select count(*), count(*) filter (where r.winner_side = mp.side)
    into v_month, v_wins
    from core.match_participants mp
    join core.matches mx on mx.id = mp.match_id and mx.sport_id = p_sport and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
    join core.match_results r on r.match_id = mx.id
   where mp.player_id = p_player and mx.starts_at >= date_trunc('month', v_from) and mx.starts_at < v_from;
  if v_month > 0 then
    v_clues := v_clues || to_jsonb(v_wins || case when v_wins = 1 then ' νίκη σε ' else ' νίκες σε ' end
                                   || v_month || case when v_month = 1 then ' ματς' else ' ματς' end || ' αυτόν τον μήνα');
  end if;
  -- the tournament they play in lately
  select t.name into v_tour
    from core.match_participants mp
    join core.matches mx on mx.id = mp.match_id and mx.sport_id = p_sport and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
    join core.tournaments t on t.id = mx.tournament_id and not t.is_minor_event
   where mp.player_id = p_player and mx.starts_at > v_from - interval '60 days'
   order by mx.starts_at desc limit 1;
  if v_tour is not null then
    v_clues := v_clues || to_jsonb('Παίζει στο ' || v_tour);
  end if;
  select hand into v_hand from core.player_sports where player_id = p_player and sport_id = p_sport;
  if v_hand = 'L' then
    v_clues := v_clues || to_jsonb(case when v_g = 'f' then 'Αριστερόχειρη' else 'Αριστερόχειρας' end);
  end if;
  return v_clues;
end;
$$;

-- from 20270125000000_quiz_fresh_names.sql
create or replace function core.quiz_month(p_user uuid, p_sport text, p_day date, p_seed text,
                                           p_used_players uuid[], p_used_templates uuid[])
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_from timestamptz := (p_day::timestamp + interval '9 hours') at time zone 'Europe/Athens';
  t      core.quiz_templates;
  v_ids  uuid[];
  v_top  uuid;
  v_wins int;
  v_pl   jsonb;
begin
  select * into t from core.quiz_templates where active and trigger = 'month' and id <> all (p_used_templates) limit 1;
  if t.id is null then return null; end if;
  -- people I can know first, else anyone in a tournament this month; the leader and two with fewer wins
  with wins as (
    select mp.player_id, count(*) filter (where mp.side = r.winner_side) as w,
           min(case when q.player_id is not null then 0 else 1 end) as far
      from core.matches mx
      join core.match_results r on r.match_id = mx.id and not r.walkover
      join core.match_participants mp on mp.match_id = mx.id
      join core.players p on p.id = mp.player_id and p.status = 'active' and not p.hidden and not p.is_minor
      left join core.quiz_pool(p_user, p_sport, null, p_seed) q on q.player_id = mp.player_id
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
       and mx.starts_at >= date_trunc('month', v_from) and mx.starts_at < v_from
       and (q.player_id is not null or mx.tournament_id is not null)
       and mp.player_id <> all (p_used_players)
     group by mp.player_id
  ),
  scope as (select * from wins where far = (select min(far) from wins) and w > 0),
  leader as (select player_id, w from scope order by w desc, md5(p_seed || player_id::text) limit 1),
  others as (select player_id from scope where w < (select w from leader)
              order by player_id in (select player_id from core.quiz_recent_players(p_user)), md5(p_seed || player_id::text) limit 2)
  select (select player_id from leader), (select w from leader), array(select player_id from others)
    into v_top, v_wins, v_ids;
  if v_top is null or v_wins < 2 or coalesce(array_length(v_ids, 1), 0) < 2 then return null; end if;
  -- the same leader every day is no question: skip it while they were asked about lately
  if v_top in (select player_id from core.quiz_recent_players(p_user)) then return null; end if;

  v_ids := array(select u from unnest(v_ids || v_top) u order by md5(p_seed || 'm' || u::text));
  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_pl from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'template_id', t.id,
    'ids', to_jsonb(v_ids),
    'content', jsonb_build_object(
      'tag', t.slot_template ->> 'tag',
      'q', 'Ποιος έχει τις περισσότερες νίκες αυτόν τον μήνα;',
      'options', '[{"label": "{p1}"}, {"label": "{p2}"}, {"label": "{p3}"}]'::jsonb,
      'players', v_pl,
      'right', array_position(v_ids, v_top) - 1,
      'reveal', '{p' || array_position(v_ids, v_top) || '.o}, με ' || v_wins || ' νίκες.'));
end;
$$;

-- from 20270125000000_quiz_fresh_names.sql
create or replace function core.quiz_pool(p_user uuid, p_sport text, p_gender text, p_seed text)
returns table (player_id uuid, first_name text, surname text, gender text, area_id text, level_tier numeric,
               level_direction text, hand text, form jsonb)
language sql stable security definer set search_path = core, pg_temp
as $$
  with me as (
    select p.id from core.players p where p.claimed_by_user_id = p_user
  ),
  played as (
    -- people on court with me: opponents and partners
    select distinct o.player_id
      from core.match_participants mine
      join core.match_participants o on o.match_id = mine.match_id and o.player_id <> mine.player_id
      join core.matches mx on mx.id = mine.match_id and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
     where mine.player_id = (select id from me)
  ),
  same_event as (
    -- people in the tournament categories I play in, this season
    select distinct o.player_id
      from core.match_participants mine
      join core.matches mm on mm.id = mine.match_id and mm.event_id is not null and mm.starts_at > now() - interval '180 days'
      join core.matches mo on mo.event_id = mm.event_id and mo.approved and mo.review is distinct from 'pending' and mo.status <> 'void'
      join core.match_participants o on o.match_id = mo.id
     where mine.player_id = (select id from me)
  ),
  recent as (select player_id from core.quiz_recent_players(p_user)),
  ok as (
    select p.id, p.first_name, p.surname, p.gender, p.area_id, ps.level_tier, ps.level_direction, ps.hand, ps.form,
           case when exists (select 1 from core.follows f where f.user_id = p_user and f.player_id = p.id) then 0
                when p.id in (select player_id from played) then 1
                when p.id in (select player_id from same_event) then 2
                else 3 end as band,
           p.id in (select player_id from recent) as asked
      from core.players p
      left join core.player_sports ps on ps.player_id = p.id and ps.sport_id = p_sport
     where p.status = 'active' and not p.hidden and not p.is_minor
       and p.id is distinct from (select id from me)
       and (p_gender is null or p.gender = p_gender)
       and (p.claimed_by_user_id is null or not core.is_blocked(p_user, p.claimed_by_user_id))
  )
  select id, first_name, surname, gender, area_id, level_tier, level_direction, hand, form
    from ok where band < 3
   order by asked, band, md5(p_seed || id::text)
$$;

-- from 20270125000000_quiz_fresh_names.sql
create or replace function core.quiz_tournament(p_user uuid, p_sport text, p_kind text, p_day date, p_seed text,
                                                p_used_players uuid[], p_used_templates uuid[])
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  t      core.quiz_templates;
  v_from timestamptz := (p_day::timestamp + interval '9 hours') at time zone 'Europe/Athens';
  e      record;
  m      record;
  v_ids  uuid[];
  v_q    text;
  v_opts jsonb;
  v_pl   jsonb;
  v_right int;
  v_match uuid;
begin
  select * into t from core.quiz_templates
   where active and trigger = 'tour' and slot_template ->> 'kind' = p_kind and id <> all (p_used_templates) limit 1;
  if t.id is null then return null; end if;

  if p_kind = 'cup' then
    -- a singles category of a tournament that is on, with three players still unbeaten in it
    for e in
      select ev.id, ev.name as ev, tt.name as tn
        from core.tournament_events ev
        join core.tournaments tt on tt.id = ev.tournament_id
       where tt.sport_id = p_sport and not tt.is_minor_event and core.tournament_state(tt) = 'ongoing'
         and exists (select 1 from core.matches mx where mx.event_id = ev.id and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void')
       order by md5(p_seed || ev.id::text)
       limit 20
    loop
      v_ids := array(
        select w.player_id from (
          select mp.player_id, bool_and(mp.side = r.winner_side) as unbeaten, count(*) as played
            from core.matches mx
            join core.match_results r on r.match_id = mx.id
            join core.match_participants mp on mp.match_id = mx.id
           where mx.event_id = e.id and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
           group by mp.player_id) w
          join core.players p on p.id = w.player_id
          left join core.player_sports ps on ps.player_id = p.id and ps.sport_id = p_sport
         where w.unbeaten and p.status = 'active' and not p.hidden and not p.is_minor and p.id <> all (p_used_players)
         order by p.id in (select player_id from core.quiz_recent_players(p_user)), w.played desc, md5(p_seed || p.id::text)
         limit 3);
      if coalesce(array_length(v_ids, 1), 0) = 3 then
        v_q := e.tn || ', ' || e.ev || ': ποιος το σηκώνει;';
        v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}, {"label": "{p3}"}]';
        exit;
      end if;
      v_ids := null;
    end loop;
    if v_ids is null then return null; end if;
  else
    -- a tournament singles match from the last week; the options in a fixed but shuffled order, the right one marked
    select mx.id, mx.starts_at, r.winner_side, tt.name as tn, ev.name as ev, a.player_id as a_id, b.player_id as b_id
      into m
      from core.matches mx
      join core.tournaments tt on tt.id = mx.tournament_id
      left join core.tournament_events ev on ev.id = mx.event_id
      join core.match_results r on r.match_id = mx.id
      join core.match_participants a on a.match_id = mx.id and a.side = 1
      join core.match_participants b on b.match_id = mx.id and b.side = 2
      join core.players pa on pa.id = a.player_id
      join core.players pb on pb.id = b.player_id
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void' and not r.walkover
       and not tt.is_minor_event and not pa.hidden and not pa.is_minor and not pb.hidden and not pb.is_minor
       and pa.status = 'active' and pb.status = 'active'
       and a.player_id <> all (p_used_players) and b.player_id <> all (p_used_players)
       and mx.starts_at >= v_from - interval '7 days' and mx.starts_at < v_from
       and mx.id not in (select match_id from core.quiz_recent_matches(p_user))
     order by (a.player_id in (select player_id from core.quiz_recent_players(p_user)))::int
              + (b.player_id in (select player_id from core.quiz_recent_players(p_user)))::int, md5(p_seed || mx.id::text)
     limit 1;
    if m.id is null then return null; end if;
    v_match := m.id;
    v_ids := case when md5(p_seed || m.id::text) < md5(m.id::text || p_seed) then array[m.a_id, m.b_id] else array[m.b_id, m.a_id] end;
    v_right := case when (m.winner_side = 1) = (v_ids[1] = m.a_id) then 0 else 1 end;
    v_q := m.tn || coalesce(', ' || m.ev, '') || ': {p1.o} με {p2.ton} ' || core.quiz_when(m.starts_at, p_day)
           || '. Ποιος κέρδισε;';
    v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}]';
  end if;

  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_pl from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'template_id', t.id,
    'ids', to_jsonb(v_ids),
    'content', jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', v_q, 'options', v_opts, 'players', v_pl,
                                  'match_id', v_match)
               || case when p_kind = 'recall' then jsonb_build_object('right', v_right) else '{}'::jsonb end);
end;
$$;

-- from 20270125000000_quiz_fresh_names.sql
create or replace function core.quiz_dynamic(p_user uuid, p_sport text, p_kind text, p_day date, p_seed text,
                                             p_used_players uuid[], p_used_templates uuid[], p_wide boolean default false)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_match  uuid;
  v_from   timestamptz := (p_day::timestamp + interval '9 hours') at time zone 'Europe/Athens';
  m        record;
  t        core.quiz_templates;
  v_kind   text;
  v_q      text;
  v_opts   jsonb;
  v_ids    uuid[];
  v_pl     jsonb;
  v_prev   int;
  v_tag    text;
  v_right  int;
  v_reveal text;
  v_upset  boolean;
begin
  create temp table if not exists qd_pool (player_id uuid primary key, rk int) on commit drop;
  truncate qd_pool;
  insert into qd_pool
  select x.player_id, x.n from core.quiz_pool(p_user, p_sport, null, p_seed)
         with ordinality as x(player_id, first_name, surname, gender, area_id, level_tier, level_direction, hand, form, n);

  if p_kind = 'weekly' then
    select * into t from core.quiz_templates where active and trigger = 'weekly' and id <> all (p_used_templates) limit 1;
    if t.id is null then return null; end if;
    v_ids := array(
      select w.player_id from (
        select mp.player_id, count(*) as wins, min(qp.rk) as rk
          from core.matches mx
          join core.match_results r on r.match_id = mx.id
          join core.match_participants mp on mp.match_id = mx.id and mp.side = r.winner_side
          join qd_pool qp on qp.player_id = mp.player_id
         where mx.sport_id = p_sport and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void' and not r.walkover
           and mx.starts_at >= v_from - interval '7 days' and mx.starts_at < v_from
           and mp.player_id <> all (p_used_players)
         group by mp.player_id) w
       order by w.wins desc, w.rk limit 3);
    if coalesce(array_length(v_ids, 1), 0) < 3 then return null; end if;
    v_q := 'Ποιος ήταν ο παίκτης της βδομάδας στην παρέα σου;';
    v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}, {"label": "{p3}"}]';
    v_tag := t.slot_template ->> 'tag';
  else
    select mx.id, mx.starts_at, r.sets, r.winner_side, mx.tournament_id as t_id,
           a.player_id as a_id, b.player_id as b_id,
           pa.gender as a_g, pb.gender as b_g, la.level_tier as a_lvl, lb.level_tier as b_lvl
      into m
      from core.matches mx
      join core.match_participants a on a.match_id = mx.id and a.side = 1
      join core.match_participants b on b.match_id = mx.id and b.side = 2
      left join qd_pool qa on qa.player_id = a.player_id
      left join qd_pool qb on qb.player_id = b.player_id
      join core.players pa on pa.id = a.player_id
      join core.players pb on pb.id = b.player_id
      left join core.player_sports la on la.player_id = a.player_id and la.sport_id = p_sport
      left join core.player_sports lb on lb.player_id = b.player_id and lb.sport_id = p_sport
      left join core.match_results r on r.match_id = mx.id
     where mx.sport_id = p_sport and mx.format = 'singles' and mx.approved and mx.review is distinct from 'pending' and mx.status <> 'void'
       and case when p_wide then mx.tournament_id is not null and not pa.hidden and not pa.is_minor and not pb.hidden and not pb.is_minor
                      and not exists (select 1 from core.tournaments tx where tx.id = mx.tournament_id and tx.is_minor_event)
                -- one of the two is someone I can know, the other one too or at least on the same court
                else qa.player_id is not null or qb.player_id is not null end
       and not pa.hidden and not pa.is_minor and not pb.hidden and not pb.is_minor
       and a.player_id <> all (p_used_players) and b.player_id <> all (p_used_players)
       and (select count(*) from core.match_participants c where c.match_id = mx.id) = 2
       and mx.id not in (select match_id from core.quiz_recent_matches(p_user))
       and case when p_kind = 'pre'
                then r.match_id is null and core.match_is_open(mx) and mx.starts_at < v_from + interval '7 days'
                else r.match_id is not null and not r.walkover and jsonb_array_length(coalesce(r.sets, '[]'::jsonb)) > 0
                     and mx.starts_at >= v_from - interval '7 days' and mx.starts_at < v_from end
     -- fresh faces first: fewer people asked about lately, then people I know, then by chance
     order by (a.player_id in (select player_id from core.quiz_recent_players(p_user)))::int
              + (b.player_id in (select player_id from core.quiz_recent_players(p_user)))::int,
              (qa.player_id is not null and qb.player_id is not null) desc, least(qa.rk, qb.rk) nulls last, md5(p_seed || mx.id::text)
     limit 1;
    if m.id is null then return null; end if;
    v_match := m.id;

    if p_kind = 'pre' then
      select count(*) into v_prev
        from core.match_participants x join core.match_participants y on y.match_id = x.match_id and y.side <> x.side
        join core.match_results rr on rr.match_id = x.match_id
       where x.player_id = m.a_id and y.player_id = m.b_id;
      v_kind := case when v_prev > 0 then 'rematch'
                     when m.a_lvl is not null and m.b_lvl is not null and abs(m.a_lvl - m.b_lvl) >= 1 then 'upset'
                     else 'first' end;
      select * into t from core.quiz_templates
       where active and trigger = 'pre' and slot_template ->> 'kind' = v_kind and id <> all (p_used_templates) limit 1;
      if t.id is null then return null; end if;
      v_tag := t.slot_template ->> 'tag';
      v_ids := case when v_kind = 'upset' and m.b_lvl < m.a_lvl then array[m.b_id, m.a_id] else array[m.a_id, m.b_id] end;
      if v_kind = 'rematch' then
        v_q := '{p1.o} και {p2.o} ξαναβρίσκονται ' || core.quiz_when(m.starts_at, p_day) || '. Ποιος το παίρνει τώρα;';
        v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}]';
      elsif v_kind = 'first' then
        v_q := '{p1.o} με {p2.ton}, πρώτη φορά απέναντι ' || core.quiz_when(m.starts_at, p_day) || '. Ποιος το παίρνει;';
        v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}]';
      else
        v_q := '{p1.o} παίζει ' || core.quiz_when(m.starts_at, p_day) || ' με {p2.ton}, που ξεκινά φαβορί. Γίνεται ανατροπή;';
        v_opts := '[{"label": "Ναι, γίνεται"}, {"label": "Όχι, δεν γίνεται"}]';
      end if;
    else
      -- the result stays hidden in the question; who won, or whether it went the distance, then the answer
      select * into t from core.quiz_templates
       where active and trigger = 'post' and id <> all (p_used_templates) order by md5(p_seed || id::text) limit 1;
      if t.id is null then return null; end if;
      v_upset := m.a_lvl is not null and m.b_lvl is not null
                 and (case m.winner_side when 1 then m.a_lvl - m.b_lvl else m.b_lvl - m.a_lvl end) <= -0.5;
      v_ids := case when md5(p_seed || m.id::text) < md5(m.id::text || p_seed) then array[m.a_id, m.b_id] else array[m.b_id, m.a_id] end;
      v_q := '{p1.o} με {p2.ton} ' || core.quiz_when(m.starts_at, p_day);
      -- one of the three result templates asks about the third set, so it comes at most once a day
      if t.slot_template ->> 'kind' = 'close' then
        v_tag := 'Τρίτο σετ;';
        v_q := v_q || '. Πήγε σε τρίτο σετ;';
        v_opts := '[{"label": "Ναι, τρία σετ"}, {"label": "Όχι, σε δύο"}]';
        v_right := case when jsonb_array_length(m.sets) >= 3 then 0 else 1 end;
      else
        v_tag := 'Ποιος κέρδισε;';
        v_q := v_q || '. Ποιος κέρδισε;';
        v_opts := '[{"label": "{p1}"}, {"label": "{p2}"}]';
        v_right := case when (m.winner_side = 1) = (v_ids[1] = m.a_id) then 0 else 1 end;
      end if;
      v_reveal := case when v_upset then 'Ανατροπή! ' else '' end
                  || '{p' || (case when (m.winner_side = 1) = (v_ids[1] = m.a_id) then 1 else 2 end) || '.o} κέρδισε '
                  || core.quiz_score(m.sets) || '.';
    end if;
  end if;

  -- a tournament match names its tournament first: «ΑΟΚ Tennis Open: …»
  if p_kind <> 'weekly' then
    if m.t_id is not null then
      v_q := (select name from core.tournaments where id = m.t_id) || ': ' || v_q;
    end if;
  end if;

  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_pl from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'template_id', t.id,
    'ids', to_jsonb(v_ids),
    'content', jsonb_build_object('tag', v_tag, 'q', v_q, 'options', v_opts, 'players', v_pl,
                                  'week', p_kind = 'weekly', 'match_id', v_match)
               || case when v_right is not null then jsonb_build_object('right', v_right, 'reveal', v_reveal) else '{}'::jsonb end);
end;
$$;

-- from 20261211000000_m4_tournaments_page.sql
create or replace function core.tournament_match_visible(p_match uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (select 1 from core.matches m where m.id = p_match and m.approved)
     and not exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                      where mp.match_id = p_match and (p.is_minor or p.hidden))
$$;

-- from 20261211000000_m4_tournaments_page.sql
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
                   'matches', (select count(*) from core.matches m where m.tournament_id = t.id and m.approved and m.status <> 'void'),
                   'today', (select count(*) from core.matches m where m.tournament_id = t.id and m.approved and m.status <> 'void'
                              and core.athens_day(m.starts_at) = core.athens_day(now())),
                   'in_it', v_me is not null and (
                     exists (select 1 from core.matches m join core.match_participants mp on mp.match_id = m.id
                              where m.tournament_id = t.id and m.approved and mp.player_id = v_me)
                     or exists (select 1 from core.tournament_draws d, jsonb_array_elements(d.draw -> 'entrants') en,
                                         jsonb_array_elements(en -> 'players') pl
                                 where d.tournament_id = t.id and pl ->> 'player_id' = v_me::text))) as j
            from core.tournaments t
           where not t.is_minor_event
             and (exists (select 1 from core.matches m where m.tournament_id = t.id and m.approved and m.status <> 'void')
                  or exists (select 1 from core.tournament_draws d where d.tournament_id = t.id))
             and (core.tournament_state(t) <> 'done'
                  or coalesce(t.ends_on, (select max(core.athens_day(m.starts_at)) from core.matches m where m.tournament_id = t.id and m.approved)) >= core.athens_day(now()) - 14)
        ) x), '[]'::jsonb),
    -- «Το πρόγραμμά σου»: my next tournament matches (Pro)
    'mine', case when v_pro and v_me is not null then coalesce((
      select jsonb_agg(jsonb_build_object('tournament_id', t.id, 'tournament', t.name) || core.tournament_match_json(m)
                       order by m.starts_at)
        from core.matches m
        join core.tournaments t on t.id = m.tournament_id
        join core.match_participants mp on mp.match_id = m.id and mp.player_id = v_me
       where m.approved and m.status in ('announced', 'scheduled') and m.starts_at >= now() - interval '2 hours'
         and m.starts_at < now() + interval '14 days'), '[]'::jsonb) end);
end;
$$;

-- from 20261211000000_m4_tournaments_page.sql
create or replace function core.tournament_state(t core.tournaments)
returns text
language sql stable set search_path = core, pg_temp
as $$
  with e as (
    select coalesce(t.ends_on,
                    greatest(t.starts_on + 14,
                             (select max(core.athens_day(m.starts_at)) from core.matches m
                               where m.tournament_id = t.id and m.approved and m.status <> 'void')),
                    (select max(core.athens_day(m.starts_at)) from core.matches m
                      where m.tournament_id = t.id and m.approved and m.status <> 'void')) as end_day)
  select case
    when t.starts_on is not null and t.starts_on > core.athens_day(now()) then 'upcoming'
    when e.end_day is null or e.end_day < core.athens_day(now()) then 'done'
    else 'ongoing'
  end
  from e
$$;

-- from 20270201000000_next_tournament.sql
create or replace function core.played_edition(p_player uuid, p_t uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select p_player is not null and exists (
    select 1
      from core.tournaments t
      join core.tournaments o on o.id <> t.id and o.sport_id = t.sport_id
       and (core.tournament_name_key(o.name) = core.tournament_name_key(t.name)
            or (t.source_url is not null and o.source_url = t.source_url))
      join core.matches m on m.tournament_id = o.id and m.approved and m.status <> 'void'
      join core.match_participants mp on mp.match_id = m.id and mp.player_id = p_player
     where t.id = p_t
       and (o.starts_on is null or t.starts_on is null or o.starts_on < t.starts_on))
$$;

-- from 20261206000000_badges_fresh_start.sql
create or replace function core.badge_counters(p_user uuid)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  with me as (select id from core.players where claimed_by_user_id = p_user),
  since as (select coalesce((select badges_since from core.profiles where user_id = p_user), '-infinity'::timestamptz) as t),
  played as (   -- matches with a result the player was in, and their side
    select m.id, m.format, m.starts_at, mp.side
      from core.matches m
      join core.match_participants mp on mp.match_id = m.id and mp.player_id in (select id from me)
     where m.status <> 'void' and exists (select 1 from core.match_results r where r.match_id = m.id)
       and m.created_at >= (select t from since)
  ),
  weeks as (    -- the Mondays of the weeks with a played match
    select distinct (d - (extract(isodow from d)::int - 1)) as wk
      from (select core.athens_day(starts_at) as d from played where starts_at is not null) x
  ),
  runs as (     -- consecutive weeks share wk - 7·rank
    select count(*) as n from (select wk, wk - (7 * row_number() over (order by wk))::int as grp from weeks) w group by grp
  ),
  vote_weeks as (
    select (day_key - (extract(isodow from day_key)::int - 1)) as wk, count(distinct day_key) as days
      from core.votes where user_id = p_user and created_at >= (select t from since) group by 1
  ),
  facts as (
    select 'first_serve' as k, (select count(*) from core.matches
                                 where logged_by = p_user and source = 'user' and approved and status <> 'void'
                                   and created_at >= (select t from since))::int as n
    union all
    select 'nice_player', (select count(*) from core.match_confirmations c join core.matches m on m.id = c.match_id
                            where m.logged_by = p_user and m.status <> 'void' and c.state = 'confirmed'
                              and m.created_at >= (select t from since)
                              and c.player_id not in (select id from me))::int
    union all
    select 'gentleman', (select count(*) from core.kudos where from_user_id = p_user and created_at >= (select t from since))::int
    union all
    select 'beloved', (select count(distinct from_user_id) from core.kudos where to_player_id in (select id from me)
                         and created_at >= (select t from since))::int
    union all
    select 'club_oracle', (select count(*) from core.votes where user_id = p_user and outcome = 'correct' and created_at >= (select t from since))::int
    union all
    select 'upset', (select count(*) from core.votes where user_id = p_user and outcome = 'correct' and is_upset_call
                    and created_at >= (select t from since))::int
    union all
    select 'in_a_row', coalesce((select streak_best from core.user_game_state where user_id = p_user), 0)
    union all
    select 'whole_week', (select count(*) from vote_weeks where days = 7)::int
    union all
    select 'doubles_player', (select count(*) from played p where p.format <> 'singles'
                               and exists (select 1 from core.match_confirmations c join core.match_participants mp
                                             on mp.match_id = c.match_id and mp.player_id = c.player_id
                                            where c.match_id = p.id and c.state = 'confirmed' and mp.side = p.side
                                              and c.player_id not in (select id from me)))::int
    union all
    select 'variety', (select count(distinct mp.player_id) from played p
                         join core.match_participants mp on mp.match_id = p.id and mp.side <> p.side)::int
    union all
    select 'steady', coalesce((select max(n) from runs), 0)::int
    union all
    select 'many_votes', (select count(*) from core.votes where user_id = p_user and created_at >= (select t from since))::int
    union all
    select 'month_top', (select count(*) from core.league_members lm
                          where lm.user_id = p_user and lm.final_rank <= 3 and lm.final_points > 0)::int
  ),
  bonus as (    -- what quests gave: «+5 στο badge …»
    select reward ->> 'key' as k, sum((reward ->> 'amount')::int)::int as n
      from core.user_quest_progress where user_id = p_user and reward ->> 'kind' = 'badge'
       and coalesce(reward_granted_at, done_at) >= (select t from since) group by 1
  )
  select jsonb_object_agg(d.key, coalesce(f.n, 0) + coalesce(b.n, 0))
    from core.badge_defs d
    left join facts f on f.k = d.key
    left join bonus b on b.k = d.key
$$;

-- from 20261129000000_m3_unlocks.sql
create or replace function core.unlock_counters(p_user uuid)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  with me as (select id from core.players where claimed_by_user_id = p_user),
  days as (
    select day_key as d from core.votes where user_id = p_user group by day_key having count(*) >= 3
    union
    select core.athens_day(created_at) from core.matches where logged_by = p_user and source = 'user' and approved and status <> 'void'
  ),
  quest_days as (
    select period_key from core.user_quest_progress
     where user_id = p_user and done_at is not null
       and quest_key in (select key from core.quest_defs where period = 'daily' and active)
     group by period_key
    having count(*) = (select count(*) from core.quest_defs where period = 'daily' and active)
  )
  select jsonb_build_object(
    'votesCast',        (select count(*) from core.votes where user_id = p_user),
    'votesResolved',    (select count(*) from core.votes where user_id = p_user and resolved_at is not null),
    'correctVotes',     (select count(*) from core.votes where user_id = p_user and outcome = 'correct'),
    'activeDays',       (select count(*) from days),
    'kudosGiven',       (select count(*) from core.kudos where from_user_id = p_user),
    'matchesLogged',    (select count(*) from core.matches where logged_by = p_user and source = 'user' and approved and status <> 'void'),
    'matchesConfirmed', (select count(distinct m.id) from core.matches m
                          where m.status = 'confirmed'
                            and (m.logged_by = p_user
                                 or exists (select 1 from core.match_participants mp
                                             where mp.match_id = m.id and mp.player_id in (select id from me)))),
    'bestStreak',       coalesce((select streak_best from core.user_game_state where user_id = p_user), 0),
    'fullQuestDays',    (select count(*) from quest_days))
$$;

-- from 20261127000000_m3_quests.sql
create or replace function core.quest_on_match()
returns trigger
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if new.source = 'user' and new.logged_by is not null and new.approved then
    perform core.quest_event(new.logged_by, 'match_logged', new.created_at);
  end if;
  return null;
end;
$$;

-- from 20261116000000_m2_match_link.sql
create or replace function core.answer_confirmation(p_match_id uuid, p_player uuid, p_answer text, p_fix jsonb, p_via text)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_side    smallint;
  v_m       core.matches;
  v_r       core.match_results;
  v_winner  smallint;
  v_lost    int;
  v_outcome text;
begin
  if p_answer not in ('yes', 'fix', 'not_me') then raise exception 'bad_answer' using errcode = '22023'; end if;
  if not exists (select 1 from core.match_confirmations
                  where match_id = p_match_id and player_id = p_player and state = 'pending') then
    raise exception 'nothing_to_confirm' using errcode = 'P0002';
  end if;
  select * into v_m from core.matches where id = p_match_id for update;
  select * into v_r from core.match_results where match_id = p_match_id;
  select side into v_side from core.match_participants where match_id = p_match_id and player_id = p_player;

  if p_answer = 'yes' then
    update core.match_confirmations set state = 'confirmed', via = p_via, at = now()
     where match_id = p_match_id and player_id = p_player;
    update core.matches set counts_for_levels = true where id = p_match_id and status = 'confirmed';
    v_outcome := 'confirmed';
  elsif p_answer = 'not_me' then
    update core.match_confirmations set state = 'not_me', via = p_via, at = now()
     where match_id = p_match_id and player_id = p_player;
    -- while staff still review the match nothing resolved yet: the answer waits for them (no dispute)
    if v_m.review is distinct from 'pending' then perform core.dispute_match(p_match_id, 'not_me'); end if;
    v_outcome := 'disputed';
  else
    if p_fix is null or (p_fix ->> 'winner') not in ('me', 'them') or (p_fix ->> 'sets') not in ('2-0', '2-1') then
      raise exception 'bad_fix' using errcode = '22023';
    end if;
    v_winner := case when p_fix ->> 'winner' = 'me' then v_side else 3 - v_side end;
    v_lost := split_part(p_fix ->> 'sets', '-', 2)::int;
    if v_winner = v_r.winner_side then
      -- the same winner: correct the sets, votes stand
      update core.match_results set sets = '[]'::jsonb, sets_won = 2, sets_lost = v_lost,
             result_version = result_version + 1, entered_at = now()
       where match_id = p_match_id;
      update core.match_confirmations set state = 'confirmed', via = p_via, proposed_fix = p_fix, at = now()
       where match_id = p_match_id and player_id = p_player;
      update core.matches set counts_for_levels = true where id = p_match_id and status = 'confirmed';
      v_outcome := 'corrected';
    else
      update core.match_confirmations set state = 'disputed', via = p_via, proposed_fix = p_fix, at = now()
       where match_id = p_match_id and player_id = p_player;
      if v_m.review is distinct from 'pending' then perform core.dispute_match(p_match_id, 'other_winner'); end if;
      v_outcome := 'disputed';
    end if;
  end if;

  -- the logger hears back
  if v_m.logged_by is not null then
    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (v_m.logged_by, 'confirmation',
            jsonb_build_object('match_id', p_match_id, 'outcome', v_outcome, 'by_player', p_player, 'via', p_via),
            'in_app', 'confirmation:' || p_match_id || ':' || p_player)
    on conflict (dedupe_key) do nothing;
  end if;
  return jsonb_build_object('match_id', p_match_id, 'outcome', v_outcome);
end;
$$;
