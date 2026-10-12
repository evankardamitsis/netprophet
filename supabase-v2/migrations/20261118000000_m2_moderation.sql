-- M2 part 5a: the moderation queue (admin). Player-logged matches go live at once (founder, 12 Oct), so the queue
-- reviews after the fact:
--   Disputed matches: keep the logged result (the points come back), turn it round (the other side won: votes flip,
--   the new right calls get their points), or void it (the points stay taken back). The σερί is never rewritten.
--   A dispute already used each person's one 'correction' row for the match, so a decision writes 'admin_adjust'.
--   Pending players (new names typed in «+ Ματς»): approve (optionally fixing the spelling) or merge into the
--   roster player they really are. A merge moves matches, confirmations, follows, kudos, links, traits and gifts,
--   moves a claim when the target has none, and keeps the old spelling as an alias for imports.
--   «Άλλο» tournament names: link the matches to a tournament, or leave them as friendlies.

-- one player into another ------------------------------------------------------------------------------------
create or replace function core.merge_player(p_src uuid, p_dst uuid, p_by uuid)
returns void
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_s core.players;
  v_d core.players;
begin
  if p_src = p_dst then raise exception 'same_player' using errcode = '22023'; end if;
  select * into v_s from core.players where id = p_src for update;
  select * into v_d from core.players where id = p_dst for update;
  if v_s.id is null or v_d.id is null then raise exception 'player_not_found' using errcode = 'P0002'; end if;
  if v_s.status = 'merged' or v_d.status = 'merged' then raise exception 'already_merged' using errcode = '23505'; end if;
  if v_s.claimed_by_user_id is not null and v_d.claimed_by_user_id is not null then
    raise exception 'both_claimed' using errcode = '23505';
  end if;
  if exists (select 1 from core.match_participants a join core.match_participants b on b.match_id = a.match_id
              where a.player_id = p_src and b.player_id = p_dst) then
    raise exception 'same_match: both players are in one match' using errcode = '23505';
  end if;

  update core.match_participants set player_id = p_dst where player_id = p_src;
  update core.match_confirmations set player_id = p_dst where player_id = p_src;
  update core.match_links set player_id = p_dst where player_id = p_src;
  update core.gifts set receiver_player_id = p_dst where receiver_player_id = p_src;
  -- rows that would be duplicates on the target go; the rest move
  delete from core.follows f where f.player_id = p_src
     and exists (select 1 from core.follows g where g.user_id = f.user_id and g.player_id = p_dst);
  update core.follows set player_id = p_dst where player_id = p_src;
  delete from core.kudos k where k.to_player_id = p_src
     and exists (select 1 from core.kudos j where j.from_user_id = k.from_user_id and j.match_id = k.match_id and j.to_player_id = p_dst);
  update core.kudos set to_player_id = p_dst where to_player_id = p_src;
  delete from core.trait_votes t where t.player_id = p_src
     and exists (select 1 from core.trait_votes u where u.voter_user_id = t.voter_user_id and u.player_id = p_dst and u.trait_id = t.trait_id);
  update core.trait_votes set player_id = p_dst where player_id = p_src;
  update core.player_aliases set player_id = p_dst where player_id = p_src;
  insert into core.player_aliases (alias_norm, player_id, created_by)
  values (core.normalize_search(v_s.first_name || ' ' || v_s.surname), p_dst, p_by)
  on conflict (alias_norm) do nothing;

  if v_s.claimed_by_user_id is not null then
    update core.players set claimed_by_user_id = null where id = p_src;            -- the trigger frees the profile
    update core.players set claimed_by_user_id = v_s.claimed_by_user_id where id = p_dst;
  end if;
  update core.players set status = 'merged', merged_into = p_dst, hidden = true where id = p_src;
end;
$$;
revoke all on function core.merge_player(uuid, uuid, uuid) from public;

-- the queue --------------------------------------------------------------------------------------------------
create or replace function api.admin_moderation()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'disputes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
               'tournament', (select name from core.tournaments where id = m.tournament_id),
               'sides', core.match_sides_json(m.id),
               'winner_side', r.winner_side, 'score', r.score_summary,
               'reason', m.provenance -> 'disputed' ->> 'reason',
               'logged_by', (select jsonb_build_object('first_name', pr.first_name, 'surname', pr.surname)
                               from core.profiles pr where pr.user_id = m.logged_by),
               'answers', (select coalesce(jsonb_agg(jsonb_build_object(
                                    'player', p.first_name || ' ' || p.surname, 'side', mp.side,
                                    'state', c.state, 'via', c.via, 'fix', c.proposed_fix)), '[]'::jsonb)
                             from core.match_confirmations c
                             join core.players p on p.id = c.player_id
                             join core.match_participants mp on mp.match_id = c.match_id and mp.player_id = c.player_id
                            where c.match_id = m.id),
               'votes', (select count(*) from core.votes v where v.subject_type = 'match' and v.subject_id = m.id))
             order by m.starts_at desc)
        from core.matches m left join core.match_results r on r.match_id = m.id
       where m.status = 'disputed'), '[]'::jsonb),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
               'player_id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'source', p.source,
               'created_at', p.created_at, 'claimed', p.claimed_by_user_id is not null,
               'matches', (select count(*) from core.match_participants mp where mp.player_id = p.id),
               'similar', (select coalesce(jsonb_agg(jsonb_build_object('player_id', q.id, 'name', q.first_name || ' ' || q.surname,
                                                                        'claimed', q.claimed_by_user_id is not null)), '[]'::jsonb)
                             from (select o.* from core.players o
                                    where o.status = 'active' and o.id <> p.id
                                      and similarity(o.search_norm, p.search_norm) > 0.3
                                    order by similarity(o.search_norm, p.search_norm) desc limit 3) q))
             order by p.created_at)
        from core.players p
       where p.status = 'pending'), '[]'::jsonb),
    'tournaments', coalesce((
      select jsonb_agg(jsonb_build_object('text', x.text, 'matches', x.n, 'last', x.last) order by x.last desc)
        from (select m.provenance ->> 'tournament_suggestion' as text, count(*)::int as n, max(m.starts_at) as last
                from core.matches m
               where m.tournament_id is null and m.status <> 'void'
                 and m.provenance ? 'tournament_suggestion' and not m.provenance ? 'suggestion_done'
               group by 1) x), '[]'::jsonb));
end;
$$;

-- a disputed match: 'keep' the logged result, 'flip' it (the other side won), or 'void' it
create or replace function api.admin_resolve_dispute(p_match_id uuid, p_decision text)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_m     core.matches;
  v_r     core.match_results;
  v_pts   int;
  v_lost  int;
  v_new   smallint;
  v_n     int := 0;
  r       record;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_decision not in ('keep', 'flip', 'void') then raise exception 'bad_decision' using errcode = '22023'; end if;
  select * into v_m from core.matches where id = p_match_id for update;
  if not found or v_m.status <> 'disputed' then raise exception 'not_disputed' using errcode = 'P0002'; end if;
  select * into v_r from core.match_results where match_id = p_match_id;

  if p_decision = 'keep' then
    -- what the dispute took back comes back
    for r in select user_id, -sum(delta)::int as back from core.points_ledger
              where ref_type = 'match' and ref_id = p_match_id and reason = 'correction'
              group by user_id having sum(delta) < 0
    loop
      v_n := v_n + core.award_points(r.user_id, r.back, 'admin_adjust', 'match', p_match_id, 'moderation:' || p_match_id || ':' || r.user_id);
    end loop;
    update core.matches set status = 'confirmed', counts_for_levels = true where id = p_match_id;
    update core.match_confirmations set state = 'confirmed', via = 'admin', at = now() where match_id = p_match_id;

  elsif p_decision = 'flip' then
    v_new := 3 - v_r.winner_side;
    -- the sets the other side gave, if they said; else the same count turned round
    select split_part(c.proposed_fix ->> 'sets', '-', 2)::int into v_lost
      from core.match_confirmations c where c.match_id = p_match_id and c.proposed_fix ? 'sets' limit 1;
    update core.match_results set winner_side = v_new, sets = '[]'::jsonb, sets_won = 2,
           sets_lost = coalesce(v_lost, v_r.sets_lost, 0), result_version = result_version + 1, entered_at = now()
     where match_id = p_match_id;
    v_pts := (core.sport_rules(v_m.sport_id) ->> 'correct')::int;
    update core.votes set outcome = case when option = v_new then 'correct' else 'wrong' end,
                          points = case when option = v_new then v_pts else 0 end
     where subject_type = 'match' and subject_id = p_match_id and resolved_at is not null and outcome <> 'none';
    -- the dispute already took every point back; the new right calls earn the base points (no chain, no upset)
    for r in select user_id from core.votes
              where subject_type = 'match' and subject_id = p_match_id and outcome = 'correct'
    loop
      v_n := v_n + core.award_points(r.user_id, v_pts, 'admin_adjust', 'match', p_match_id, 'moderation:' || p_match_id || ':' || r.user_id);
    end loop;
    update core.matches set status = 'confirmed', counts_for_levels = true where id = p_match_id;
    update core.match_confirmations set state = 'confirmed', via = 'admin', at = now() where match_id = p_match_id;

  else
    update core.votes set outcome = 'none', points = 0
     where subject_type = 'match' and subject_id = p_match_id and resolved_at is not null;
    update core.matches set status = 'void', counts_for_levels = false where id = p_match_id;
  end if;

  update core.matches
     set provenance = provenance || jsonb_build_object('moderation', jsonb_build_object('decision', p_decision, 'by', auth.uid(), 'at', now()))
   where id = p_match_id;
  if v_m.logged_by is not null then
    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (v_m.logged_by, 'moderation', jsonb_build_object('match_id', p_match_id, 'decision', p_decision), 'in_app',
            'moderation:' || p_match_id)
    on conflict (dedupe_key) do nothing;
  end if;
  return jsonb_build_object('match_id', p_match_id, 'decision', p_decision, 'points', v_n);
end;
$$;

-- a pending player: 'approve' (with the spelling fixed if given) or 'merge' into p_target
create or replace function api.admin_decide_player(p_player_id uuid, p_action text, p_target uuid default null,
                                                   p_first text default null, p_surname text default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_action = 'approve' then
    update core.players
       set status = 'active',
           first_name = coalesce(nullif(btrim(p_first), ''), first_name),
           surname = coalesce(nullif(btrim(p_surname), ''), surname)
     where id = p_player_id and status = 'pending';
    if not found then raise exception 'not_pending' using errcode = 'P0002'; end if;
  elsif p_action = 'merge' then
    if p_target is null then raise exception 'target_required' using errcode = '22023'; end if;
    perform core.merge_player(p_player_id, p_target, auth.uid());
  else
    raise exception 'bad_action' using errcode = '22023';
  end if;
  return jsonb_build_object('player_id', p_player_id, 'action', p_action);
end;
$$;

-- «Άλλο» tournament names: every match with this name goes to p_tournament_id, or stays a friendly (null)
create or replace function api.admin_tournament_suggestion(p_text text, p_tournament_id uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare v_n int;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_tournament_id is not null and not exists (select 1 from core.tournaments where id = p_tournament_id) then
    raise exception 'tournament_not_found' using errcode = 'P0002';
  end if;
  update core.matches
     set tournament_id = p_tournament_id,
         provenance = provenance || jsonb_build_object('suggestion_done', true)
   where tournament_id is null and provenance ->> 'tournament_suggestion' = p_text and not provenance ? 'suggestion_done';
  get diagnostics v_n = row_count;
  return jsonb_build_object('text', p_text, 'matches', v_n, 'tournament_id', p_tournament_id);
end;
$$;

revoke all on function api.admin_moderation() from public, anon;
revoke all on function api.admin_resolve_dispute(uuid, text) from public, anon;
revoke all on function api.admin_decide_player(uuid, text, uuid, text, text) from public, anon;
revoke all on function api.admin_tournament_suggestion(text, uuid) from public, anon;
grant execute on function api.admin_moderation() to authenticated, service_role;
grant execute on function api.admin_resolve_dispute(uuid, text) to authenticated, service_role;
grant execute on function api.admin_decide_player(uuid, text, uuid, text, text) to authenticated, service_role;
grant execute on function api.admin_tournament_suggestion(text, uuid) to authenticated, service_role;
