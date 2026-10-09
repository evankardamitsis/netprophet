-- NetProphet v2 baseline 7/8: the `api` schema, RPC part.
-- Every RPC is SECURITY DEFINER with an explicit auth check as its first statement.
-- Game rule numbers come from sports.config -> 'rules' (see core.sport_rules), never from literals here.
-- Concurrency: per-user advisory lock for user writes; one global lock serialises resolvers.

-- ---------------------------------------------------------------------------
-- internal helpers (core)
-- ---------------------------------------------------------------------------
create or replace function core.match_is_open(m core.matches)
returns boolean language sql stable set search_path = core, pg_temp
as $$
  select m.status in ('announced', 'scheduled')
     and (m.locked_at is null or m.locked_at > now())
     and (m.starts_at is null or m.starts_at > now())
     and not exists (select 1 from core.match_results r where r.match_id = m.id)
$$;

create or replace function core.vote_split(p_match uuid)
returns jsonb language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
    'total', t.total, 'side1', t.s1, 'side2', t.s2,
    'pct1', case when t.total = 0 then 0 else round(100.0 * t.s1 / t.total)::int end,
    'pct2', case when t.total = 0 then 0 else 100 - round(100.0 * t.s1 / t.total)::int end)
  from (
    select count(*)::int as total,
           count(*) filter (where option = 1)::int as s1,
           count(*) filter (where option = 2)::int as s2
      from core.votes where subject_type = 'match' and subject_id = p_match
  ) t
$$;

create or replace function core.ensure_game_state(p_user uuid)
returns void language sql security definer set search_path = core, pg_temp
as $$ insert into core.user_game_state (user_id) values (p_user) on conflict (user_id) do nothing $$;

-- append to the ledger; returns the delta actually written (0 when the idempotency key already exists)
create or replace function core.award_points(p_user uuid, p_delta int, p_reason text, p_ref_type text, p_ref uuid, p_key text)
returns int language plpgsql security definer set search_path = core, pg_temp
as $$
declare n int;
begin
  if p_delta = 0 then return 0; end if;
  insert into core.points_ledger (user_id, delta, reason, ref_type, ref_id, month_key, idempotency_key)
  values (p_user, p_delta, p_reason, p_ref_type, p_ref, core.month_key(), p_key)
  on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then return 0; end if;
  update core.user_game_state set total_points = total_points + p_delta, updated_at = now() where user_id = p_user;
  return p_delta;
end;
$$;

-- grants a freeze unless the user already holds the maximum; returns the freeze id or null
create or replace function core.grant_freeze(p_user uuid, p_kind text, p_source text, p_max int)
returns uuid language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_id uuid;
begin
  if (select count(*) from core.freezes where user_id = p_user and used_at is null) >= p_max then
    return null;
  end if;
  insert into core.freezes (user_id, kind, source) values (p_user, p_kind, p_source) returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- cast_vote(match_id, side): only before lock. Idempotent: the same vote again is a no-op replay.
-- ---------------------------------------------------------------------------
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
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_match_id is null or p_side is null or p_side not in (1, 2) then
    raise exception 'invalid_argument: side must be 1 or 2' using errcode = '22023';
  end if;
  if not exists (select 1 from core.profiles where user_id = v_uid and deleted_at is null) then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('user:' || v_uid::text, 0));

  select * into v_m from core.matches where id = p_match_id and approved and status <> 'void';
  if not found then raise exception 'match_not_found' using errcode = 'P0002'; end if;

  -- replay of an earlier vote (retry, double tap): same answer, nothing changes, even after lock
  select * into v_vote from core.votes
   where user_id = v_uid and subject_type = 'match' and subject_id = p_match_id;
  if found then
    if v_vote.option <> p_side then
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

  return jsonb_build_object('match_id', p_match_id, 'side', v_vote.option, 'replayed', false,
                            'split', core.vote_split(p_match_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_set_result: result entry (admins feed most matches at first). Enqueues resolution.
-- ---------------------------------------------------------------------------
create or replace function api.admin_set_result(
  p_match_id uuid, p_winner_side int, p_sets jsonb,
  p_retired boolean default false, p_walkover boolean default false)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_m   core.matches;
  v_ver int;
begin
  if not (core.is_service() or core.is_staff()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_m from core.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found' using errcode = 'P0002'; end if;
  if v_m.status = 'void' then raise exception 'match_void'; end if;
  if v_m.resolved_at is not null then
    raise exception 'already_resolved: result corrections are not supported yet';
  end if;

  insert into core.match_results (match_id, winner_side, sets, retired, walkover, entered_by)
  values (p_match_id, p_winner_side::smallint, coalesce(p_sets, '[]'::jsonb), coalesce(p_retired, false),
          coalesce(p_walkover, false), auth.uid())
  on conflict (match_id) do update
    set winner_side = excluded.winner_side, sets = excluded.sets, retired = excluded.retired,
        walkover = excluded.walkover, entered_by = excluded.entered_by, entered_at = now(),
        result_version = core.match_results.result_version + 1
  returning result_version into v_ver;

  update core.matches
     set status = 'confirmed',
         counts_for_levels = counts_for_levels or source in ('admin', 'import')
   where id = p_match_id;

  insert into core.outbox (kind, payload, idempotency_key)
  values ('resolve_match', jsonb_build_object('match_id', p_match_id), 'resolve:' || p_match_id || ':' || v_ver)
  on conflict (idempotency_key) do nothing;

  return jsonb_build_object('match_id', p_match_id, 'result_version', v_ver);
end;
$$;

-- ---------------------------------------------------------------------------
-- resolve_match(match_id): admin / service only. Safe to run twice.
--   +10 per correct vote (+30 for a correct call of an upset, +5 chain bonus when continuing a chain),
--   ledger rows carry an idempotency key; σερί advances in resolution order; a wrong vote resets it to 0
--   unless a freeze absorbs it (free first: keeps number and chain; paid: keeps number, chain restarts);
--   the first free freeze comes at σερί 3, then one every 15 votes (max 2 held).
-- ---------------------------------------------------------------------------
create or replace function api.resolve_match(p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_m        core.matches;
  v_r        core.match_results;
  v_rules    jsonb;
  v_correct_pts int; v_upset_pts int; v_chain_pts int; v_fmax int; v_every int; v_first_at int;
  v_total    int; v_win_votes int; v_upset boolean;
  v         core.votes;
  gs        core.user_game_state;
  v_ok      boolean; v_reason text; v_pts int; v_froze boolean; v_fid uuid; v_free record; v_cn int;
  n_resolved int := 0; n_correct int := 0; n_wrong int := 0; n_froze int := 0; n_pts int := 0;
begin
  if not (core.is_service() or core.is_admin()) then
    raise exception 'forbidden: resolve_match is admin/service only' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('resolve_match', 0));   -- serialise resolvers (stable lock order)

  select * into v_m from core.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found' using errcode = 'P0002'; end if;
  if v_m.status = 'void' then raise exception 'match_void'; end if;
  select * into v_r from core.match_results where match_id = p_match_id;
  if not found then raise exception 'no_result: enter the result first' using errcode = 'P0002'; end if;

  v_rules       := core.sport_rules(v_m.sport_id);
  v_correct_pts := (v_rules ->> 'correct')::int;
  v_upset_pts   := (v_rules ->> 'upset')::int;
  v_chain_pts   := (v_rules ->> 'chain')::int;
  v_fmax        := (v_rules ->> 'freeze_max')::int;
  v_every       := (v_rules ->> 'free_freeze_every_votes')::int;
  v_first_at    := (v_rules ->> 'first_free_freeze_at_streak')::int;

  -- upset: the winning side was backed by a small minority (needs enough votes to mean something)
  select count(*), count(*) filter (where option = v_r.winner_side)
    into v_total, v_win_votes
    from core.votes where subject_type = 'match' and subject_id = p_match_id;
  v_upset := v_total >= (v_rules ->> 'upset_min_votes')::int
         and v_win_votes::numeric / nullif(v_total, 0) < (v_rules ->> 'upset_share_max')::numeric;

  for v in
    select * from core.votes
     where subject_type = 'match' and subject_id = p_match_id and resolved_at is null
     order by created_at, id
  loop
    perform pg_advisory_xact_lock(hashtextextended('user:' || v.user_id::text, 0));
    perform core.ensure_game_state(v.user_id);
    select * into gs from core.user_game_state where user_id = v.user_id for update;

    v_ok := (v.option = v_r.winner_side);
    v_pts := 0; v_froze := false;

    if v_ok then
      v_reason := case when v_upset then 'upset' else 'correct' end;
      v_pts := core.award_points(v.user_id, case when v_upset then v_upset_pts else v_correct_pts end,
                                 v_reason, 'match', p_match_id,
                                 'resolve:' || p_match_id || ':' || v.user_id || ':' || v_reason);
      if gs.chain >= 1 then   -- continuing a chain of correct votes
        v_pts := v_pts + core.award_points(v.user_id, v_chain_pts, 'chain', 'match', p_match_id,
                                           'resolve:' || p_match_id || ':' || v.user_id || ':chain');
      end if;
      insert into core.streak_events (user_id, vote_id, streak_before, streak_after, kind)
      values (v.user_id, v.id, gs.streak, gs.streak + 1, 'correct');
      gs.streak := gs.streak + 1;
      gs.chain := gs.chain + 1;
      gs.votes_correct := gs.votes_correct + 1;
      gs.streak_best := greatest(gs.streak_best, gs.streak);

      if gs.streak = any (select jsonb_array_elements_text(v_rules -> 'streak_milestones')::int) then
        insert into core.feed_inbox (user_id, kind, ref, payload)
        values (v.user_id, 'celebration', 'streak:' || v.id,
                jsonb_build_object('type', 'streak_milestone', 'streak', gs.streak, 'match_id', p_match_id))
        on conflict do nothing;
      end if;

      if not gs.first_free_at3_done and gs.streak >= v_first_at then
        gs.first_free_at3_done := true;
        v_fid := core.grant_freeze(v.user_id, 'free', 'streak3', v_fmax);
        if v_fid is not null then
          insert into core.streak_events (user_id, vote_id, streak_before, streak_after, freeze_id, kind)
          values (v.user_id, v.id, gs.streak, gs.streak, v_fid, 'freeze_earned');
        end if;
      end if;
    else
      -- a freeze absorbs the wrong vote: free first (keeps number and chain), then paid (keeps number, chain restarts)
      select f.id, f.kind into v_free
        from core.freezes f where f.user_id = v.user_id and f.used_at is null
       order by (f.kind = 'free') desc, f.acquired_at, f.id limit 1 for update;
      if found then
        update core.freezes set used_at = now(), used_on_vote_id = v.id where id = v_free.id;
        if v_free.kind = 'paid' then gs.chain := 0; end if;
        v_froze := true;
        insert into core.streak_events (user_id, vote_id, streak_before, streak_after, freeze_id, kind)
        values (v.user_id, v.id, gs.streak, gs.streak, v_free.id, 'freeze_used');
      else
        insert into core.streak_events (user_id, vote_id, streak_before, streak_after, kind)
        values (v.user_id, v.id, gs.streak, 0, 'broke');
        gs.streak := 0;
        gs.chain := 0;
        gs.broke_at := now();
      end if;
    end if;

    -- one free freeze every N votes (counted as votes resolve); held back while at the cap
    gs.votes_since_free_freeze := gs.votes_since_free_freeze + 1;
    if gs.votes_since_free_freeze >= v_every then
      v_fid := core.grant_freeze(v.user_id, 'free', 'every15', v_fmax);
      if v_fid is not null then
        gs.votes_since_free_freeze := 0;
        insert into core.streak_events (user_id, vote_id, streak_before, streak_after, freeze_id, kind)
        values (v.user_id, v.id, gs.streak, gs.streak, v_fid, 'freeze_earned');
      else
        gs.votes_since_free_freeze := v_every;
      end if;
    end if;

    update core.user_game_state
       set streak = gs.streak, streak_best = gs.streak_best, chain = gs.chain,
           votes_correct = gs.votes_correct, votes_since_free_freeze = gs.votes_since_free_freeze,
           first_free_at3_done = gs.first_free_at3_done, broke_at = gs.broke_at,
           version = version + 1, updated_at = now()
     where user_id = v.user_id;

    update core.votes
       set resolved_at = now(), outcome = case when v_ok then 'correct' else 'wrong' end,
           is_upset_call = (v_ok and v_upset), points = v_pts
     where id = v.id;

    insert into core.feed_inbox (user_id, kind, ref, payload)
    values (v.user_id, 'result', 'match:' || p_match_id,
            jsonb_build_object('match_id', p_match_id, 'vote_id', v.id,
                               'outcome', case when v_ok then 'correct' else 'wrong' end,
                               'points', v_pts, 'upset', (v_ok and v_upset),
                               'streak', gs.streak, 'freeze_used', v_froze,
                               'winner_side', v_r.winner_side, 'score', v_r.score_summary, 'sets', v_r.sets))
    on conflict do nothing;

    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (v.user_id, 'result', jsonb_build_object('match_id', p_match_id, 'outcome', case when v_ok then 'correct' else 'wrong' end,
                                                    'points', v_pts, 'streak', gs.streak),
            'push', 'result:' || v.user_id || ':' || p_match_id)
    on conflict (dedupe_key) do nothing;
    insert into core.outbox (kind, payload, idempotency_key)
    values ('push', jsonb_build_object('user_id', v.user_id, 'dedupe_key', 'result:' || v.user_id || ':' || p_match_id),
            'push:result:' || v.user_id || ':' || p_match_id)
    on conflict (idempotency_key) do nothing;

    n_resolved := n_resolved + 1;
    n_pts := n_pts + v_pts;
    if v_ok then n_correct := n_correct + 1; else n_wrong := n_wrong + 1; end if;
    if v_froze then n_froze := n_froze + 1; end if;
  end loop;

  update core.matches set resolved_at = coalesce(resolved_at, now()) where id = p_match_id;

  return jsonb_build_object('match_id', p_match_id, 'resolved', n_resolved, 'correct', n_correct,
                            'wrong', n_wrong, 'freezes_used', n_froze, 'points_awarded', n_pts,
                            'upset', v_upset, 'already_resolved', v_total - n_resolved);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_me(): the signed-in user's profile, claimed player, game state, Pro flag, unlocks
-- ---------------------------------------------------------------------------
create or replace function api.get_me()
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid  uuid := auth.uid();
  v_pro  boolean;
  v_rules jsonb;
  v_sport text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select primary_sport into v_sport from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  perform core.ensure_game_state(v_uid);
  v_rules := core.sport_rules(v_sport);
  v_pro := exists (select 1 from core.entitlements
                    where user_id = v_uid and key = 'pro' and status = 'active'
                      and starts_at <= now() and (ends_at is null or ends_at > now()));

  return jsonb_build_object(
    'user_id', v_uid,
    'profile', (select jsonb_build_object(
                  'first_name', pr.first_name, 'surname', pr.surname, 'display_name', pr.display_name,
                  'gender', pr.gender, 'area_id', pr.area_id, 'area_ids', pr.area_ids,
                  'primary_sport', pr.primary_sport, 'hand', pr.hand, 'locale', pr.locale, 'tz', pr.tz,
                  'hidden', pr.hidden, 'role', pr.role, 'onboarding_state', pr.onboarding_state,
                  'claim_status', pr.claim_status)
                from core.profiles pr where pr.user_id = v_uid),
    'player', (select jsonb_build_object(
                  'id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'photo_path', p.photo_path,
                  'level_tier', ps.level_tier, 'level_direction', ps.level_direction, 'level_status', ps.level_status,
                  'level_value', case when v_pro then ps.level_value end,    -- numbers are Pro-only
                  'record', ps.record, 'form', ps.form)
                from core.profiles pr
                join core.players p on p.id = pr.claimed_player_id
                left join core.player_sports ps on ps.player_id = p.id and ps.sport_id = pr.primary_sport
               where pr.user_id = v_uid),
    'game', (select jsonb_build_object(
                'total_points', gs.total_points,
                'month_points', coalesce((select sum(delta) from core.points_ledger l
                                           where l.user_id = v_uid and l.month_key = core.month_key()), 0),
                'streak', gs.streak, 'streak_best', gs.streak_best, 'chain', gs.chain,
                'votes_cast', gs.votes_cast, 'votes_correct', gs.votes_correct,
                'votes_to_next_free_freeze', greatest((v_rules ->> 'free_freeze_every_votes')::int - gs.votes_since_free_freeze, 0),
                'freezes', jsonb_build_object(
                  'free', (select count(*) from core.freezes f where f.user_id = v_uid and f.used_at is null and f.kind = 'free'),
                  'paid', (select count(*) from core.freezes f where f.user_id = v_uid and f.used_at is null and f.kind = 'paid'),
                  'max', (v_rules ->> 'freeze_max')::int))
              from core.user_game_state gs where gs.user_id = v_uid),
    'pro', v_pro,
    'unlocks', coalesce((select jsonb_agg(unlock_key order by unlocked_at) from core.unlock_progress where user_id = v_uid), '[]'::jsonb),
    'inbox_unseen', (select count(*) from core.feed_inbox where user_id = v_uid and seen_at is null),
    'circle_count', (select count(*) from core.follows where user_id = v_uid)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- get_feed(limit): result cards first (queue order), then open matches (unvoted first, nearest circle first,
-- then soonest), a labelled sponsored card after every 4th card. Split shown only for matches you voted on.
-- ---------------------------------------------------------------------------
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
                            where mp.match_id = m.id and (p.hidden or mp.player_id = v_claimed))
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

create or replace function api.mark_inbox_seen(p_ids uuid[])
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_uid uuid := auth.uid(); n int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  update core.feed_inbox set seen_at = now()
   where user_id = v_uid and id = any (p_ids) and seen_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Roster search and the claim flow (ported from v1)
-- ---------------------------------------------------------------------------
-- v1 find_matching_players: surname first, first name as a secondary filter. Now Greeklish-aware and fuzzy.
create or replace function api.find_matching_players(p_name text, p_surname text)
returns table (id uuid, first_name text, surname text, area_id text, match_score int)
language plpgsql security definer stable set search_path = core, extensions, pg_temp
as $$
declare
  v_sn text := core.normalize_search(p_surname);
  v_fn text := core.normalize_search(p_name);
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_sn = '' then return; end if;
  return query
  select p.id, p.first_name, p.surname, p.area_id,
         (case when p.surname_norm = v_sn then 70 else round(50 * similarity(p.surname_norm, v_sn))::int end
          + case when v_fn = '' then 0
                 when p.first_name_norm = v_fn then 30
                 when left(p.first_name_norm, length(v_fn)) = v_fn then 20
                 else round(15 * similarity(p.first_name_norm, v_fn))::int end) as match_score
    from core.players p
   where (p.surname_norm = v_sn or similarity(p.surname_norm, v_sn) >= 0.55)
     and (v_fn = '' or p.first_name_norm = v_fn or left(p.first_name_norm, length(v_fn)) = v_fn
          or similarity(p.first_name_norm, v_fn) >= 0.5)
     and not p.hidden and p.status = 'active' and p.claimed_by_user_id is null
   order by 5 desc, 2, 3
   limit 20;
end;
$$;

create or replace function api.search_players(p_query text, p_limit int default 20)
returns table (id uuid, first_name text, surname text, area_id text, photo_path text,
               level_tier int, level_direction text, is_claimed boolean, is_followed boolean)
language plpgsql security definer stable set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_q   text := core.normalize_search(p_query);
  v_tokens text[];
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if v_q = '' then return; end if;
  v_tokens := string_to_array(v_q, ' ');
  return query
  select p.id, p.first_name, p.surname, p.area_id, p.photo_path, ps.level_tier, ps.level_direction,
         (p.claimed_by_user_id is not null),
         exists (select 1 from core.follows f where f.user_id = v_uid and f.player_id = p.id)
    from core.players p
    left join core.player_sports ps
           on ps.player_id = p.id
          and ps.sport_id = (select primary_sport from core.profiles where user_id = v_uid)
   where not p.hidden and p.status = 'active'
     and (select bool_and(p.search_norm like '%' || t || '%') from unnest(v_tokens) t)
   order by (p.surname_norm = v_q) desc, similarity(p.search_norm, v_q) desc, p.surname, p.first_name
   limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
$$;

create or replace function api.claim_player(p_player_id uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_pr  core.profiles;
  v_pl  core.players;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  perform pg_advisory_xact_lock(hashtextextended('user:' || v_uid::text, 0));

  select * into v_pr from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;

  select * into v_pl from core.players where id = p_player_id for update;
  if not found or v_pl.status <> 'active' then
    raise exception 'player_not_claimable' using errcode = 'P0002';
  end if;

  if v_pr.claimed_player_id is not null then
    if v_pr.claimed_player_id = p_player_id then   -- replay
      return jsonb_build_object('player_id', p_player_id, 'claimed', true, 'replayed', true);
    end if;
    raise exception 'already_claimed_other: this account already claimed a player' using errcode = '23505';
  end if;
  if v_pl.claimed_by_user_id is not null then
    raise exception 'player_already_claimed' using errcode = '23505';
  end if;
  if v_pl.hidden then
    raise exception 'player_not_claimable' using errcode = 'P0002';
  end if;

  update core.players set claimed_by_user_id = v_uid where id = p_player_id;   -- trigger syncs the profile
  return jsonb_build_object('player_id', p_player_id, 'claimed', true, 'replayed', false);
end;
$$;

create or replace function api.follow_player(p_player_id uuid, p_relation text default 'known', p_source text default 'profile')
returns void
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_relation not in ('known', 'friend') or p_source not in ('onboarding', 'profile', 'card', 'invite') then
    raise exception 'invalid_argument' using errcode = '22023';
  end if;
  if not exists (select 1 from core.players where id = p_player_id and status = 'active' and not hidden) then
    raise exception 'player_not_found' using errcode = 'P0002';
  end if;
  insert into core.follows (user_id, player_id, relation, source)
  values (v_uid, p_player_id, p_relation, p_source)
  on conflict (user_id, player_id) do update
    set relation = case when core.follows.relation = 'friend' then 'friend' else excluded.relation end;
end;
$$;

create or replace function api.unfollow_player(p_player_id uuid)
returns void
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from core.follows where user_id = auth.uid() and player_id = p_player_id;
end;
$$;

-- whitelisted profile fields only: role, claim fields and ids can never be set from here
create or replace function api.update_profile(p_patch jsonb)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_row core.profiles;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'invalid_argument: patch must be an object' using errcode = '22023';
  end if;
  update core.profiles set
    first_name = case when p_patch ? 'first_name' then p_patch ->> 'first_name' else first_name end,
    surname = case when p_patch ? 'surname' then p_patch ->> 'surname' else surname end,
    display_name = case when p_patch ? 'display_name' then p_patch ->> 'display_name' else display_name end,
    gender = case when p_patch ? 'gender' then p_patch ->> 'gender' else gender end,
    area_id = case when p_patch ? 'area_id' then p_patch ->> 'area_id' else area_id end,
    area_ids = case when p_patch ? 'area_ids' then array(select jsonb_array_elements_text(p_patch -> 'area_ids')) else area_ids end,
    primary_sport = case when p_patch ? 'primary_sport' then p_patch ->> 'primary_sport' else primary_sport end,
    hand = case when p_patch ? 'hand' then p_patch ->> 'hand' else hand end,
    tournament_experience = case when p_patch ? 'tournament_experience' then p_patch ->> 'tournament_experience' else tournament_experience end,
    locale = case when p_patch ? 'locale' then p_patch ->> 'locale' else locale end,
    tz = case when p_patch ? 'tz' then p_patch ->> 'tz' else tz end,
    hidden = case when p_patch ? 'hidden' then (p_patch ->> 'hidden')::boolean else hidden end,
    onboarding_state = case when p_patch ? 'onboarding_state' then p_patch -> 'onboarding_state' else onboarding_state end,
    notification_prefs = case when p_patch ? 'notification_prefs' then p_patch -> 'notification_prefs' else notification_prefs end
  where user_id = v_uid and deleted_at is null
  returning * into v_row;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  return jsonb_build_object('user_id', v_row.user_id, 'display_name', v_row.display_name,
                            'primary_sport', v_row.primary_sport, 'hidden', v_row.hidden);
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges: nobody by default, then explicit.
-- ---------------------------------------------------------------------------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig
             from pg_proc p where p.pronamespace in ('api'::regnamespace, 'core'::regnamespace) loop
    execute format('revoke all on function %s from public, anon', f.sig);
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p where p.pronamespace = 'api'::regnamespace loop
    execute format('grant execute on function %s to authenticated, service_role', f.sig);
  end loop;
  -- core helpers: service role may call them; RLS-facing helpers were granted earlier
  for f in select p.oid::regprocedure as sig from pg_proc p
            where p.pronamespace = 'core'::regnamespace and p.prokind = 'f' loop
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
-- helpers used inside views and policies by the signed-in role
grant execute on function core.is_admin(), core.is_staff(), core.is_service(),
                          core.match_sides_json(uuid), core.can_write_athlete_photo(text),
                          core.normalize_search(text), core.athens_day(timestamptz), core.month_key(timestamptz)
  to authenticated;
