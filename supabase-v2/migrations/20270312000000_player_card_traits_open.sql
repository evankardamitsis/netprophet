-- The player card after TestFlight build 16 (founder, 22 Oct 2026).
--
-- 1. «Πώς παίζει» is open to everyone signed in (it was: only people who played the player, so almost everyone saw
--    a wall of zeros and could not tap). Still one vote per person per phrase per player (the primary key), never on
--    your own player, never on minors or hidden players, your own phrases still wait for staff (three at most), and a
--    daily cap on taps. The profile now offers the eight phrases with the most votes (approved phrases fill in).
-- 2. «Τελευταία ματς» gets what a clean row needs: the games (winner first, the app turns them to the player's side),
--    the tournament and the round. Matches waiting for staff (review 'pending') are left out of the record and the list,
--    as the form dots already do (core.player_form).

-- ---------------------------------------------------------------------------
-- Traits: who may vote (same signature: security pass 2 keeps it away from authenticated)
-- ---------------------------------------------------------------------------
create or replace function core.trait_can_vote(p_user uuid, p_player uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select p_user is not null
     and exists (select 1 from core.players p
                  where p.id = p_player and p.status = 'active' and not p.is_minor and not p.hidden
                    and p.claimed_by_user_id is distinct from p_user)
$$;

-- taps a day (votes put on in the last 24 hours, own phrases included)
create or replace function core.trait_rate_ok(p_user uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select (select count(*) from core.trait_votes where voter_user_id = p_user and created_at > now() - interval '1 day') < 100
$$;
revoke execute on function core.trait_rate_ok(uuid) from public, anon, authenticated;
grant execute on function core.trait_rate_ok(uuid) to service_role;

-- «Πώς παίζει»: the top eight for a player (counts), what I tapped, my phrases waiting for approval
create or replace function api.get_traits(p_player uuid)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_sport text;
  v_p     core.players;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_p from core.players where id = p_player;
  if v_p.id is null or v_p.is_minor or v_p.hidden then raise exception 'not_found' using errcode = 'P0002'; end if;
  select coalesce(primary_sport, 'tennis') into v_sport from core.profiles where user_id = v_uid;
  return jsonb_build_object(
    'player_id', p_player,
    'gender', v_p.gender,
    'is_me', v_p.claimed_by_user_id = v_uid,
    'can_vote', core.trait_can_vote(v_uid, p_player),
    'voters', (select count(distinct voter_user_id) from core.trait_votes where player_id = p_player),
    'traits', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'label_el', x.label_el, 'label_en', x.label_en,
                                          'count', x.n, 'mine', x.mine, 'pending', x.status = 'pending') order by x.ord)
        from (select t.id, t.label_el, t.label_en, t.status,
                     (select count(*) from core.trait_votes v where v.trait_id = t.id and v.player_id = p_player)::int as n,
                     exists (select 1 from core.trait_votes v where v.trait_id = t.id and v.player_id = p_player and v.voter_user_id = v_uid) as mine,
                     row_number() over (order by (select count(*) from core.trait_votes v where v.trait_id = t.id and v.player_id = p_player) desc,
                                                 t.created_at, t.id) as ord
                from core.trait_defs t
               where t.sport_id = v_sport and t.status = 'approved') x
       where x.ord <= 8), '[]'::jsonb)
      || coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'label_el', t.label_el, 'label_en', t.label_en,
                                          'count', null, 'mine', true, 'pending', true) order by t.created_at)
        from core.trait_defs t
       where t.status = 'pending' and t.created_by = v_uid
         and exists (select 1 from core.trait_votes v where v.trait_id = t.id and v.player_id = p_player)), '[]'::jsonb));
end;
$$;
revoke all on function api.get_traits(uuid) from public, anon;
grant execute on function api.get_traits(uuid) to authenticated, service_role;

-- tap a phrase on or off
create or replace function api.vote_trait(p_player uuid, p_trait uuid, p_on boolean default true)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  t     core.trait_defs;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not core.trait_can_vote(v_uid, p_player) then raise exception 'not_allowed' using errcode = '42501'; end if;
  select * into t from core.trait_defs where id = p_trait;
  if t.id is null or (t.status <> 'approved' and t.created_by is distinct from v_uid) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if coalesce(p_on, true) then
    if not exists (select 1 from core.trait_votes where voter_user_id = v_uid and player_id = p_player and trait_id = p_trait) then
      if not core.trait_rate_ok(v_uid) then raise exception 'rate_limited' using errcode = '54000'; end if;
      insert into core.trait_votes (voter_user_id, player_id, sport_id, trait_id)
      values (v_uid, p_player, t.sport_id, p_trait) on conflict do nothing;
    end if;
  else
    delete from core.trait_votes where voter_user_id = v_uid and player_id = p_player and trait_id = p_trait;
  end if;
  return api.get_traits(p_player);
end;
$$;
revoke all on function api.vote_trait(uuid, uuid, boolean) from public, anon;
grant execute on function api.vote_trait(uuid, uuid, boolean) to authenticated, service_role;

-- «+ Πρόσθεσε κάτι δικό σου»: a new phrase, counted for this player, shown once approved (three waiting at most)
create or replace function api.suggest_trait(p_player uuid, p_label text)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_label text := btrim(regexp_replace(coalesce(p_label, ''), '\s+', ' ', 'g'));
  v_sport text;
  v_id    uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not core.trait_can_vote(v_uid, p_player) then raise exception 'not_allowed' using errcode = '42501'; end if;
  if char_length(v_label) < 3 or char_length(v_label) > 40 then raise exception 'bad_label' using errcode = '22023'; end if;
  if (select count(*) from core.trait_defs where created_by = v_uid and status = 'pending') >= 3 then
    raise exception 'too_many_pending' using errcode = '54000';
  end if;
  if not core.trait_rate_ok(v_uid) then raise exception 'rate_limited' using errcode = '54000'; end if;
  select coalesce(primary_sport, 'tennis') into v_sport from core.profiles where user_id = v_uid;
  -- the same words as an approved phrase: just vote for it
  select id into v_id from core.trait_defs
   where sport_id = v_sport and status = 'approved'
     and (lower(label_el ->> 'm') = lower(v_label) or lower(label_el ->> 'f') = lower(v_label));
  if v_id is null then
    insert into core.trait_defs (sport_id, label_el, label_en, status, created_by)
    values (v_sport, jsonb_build_object('m', v_label, 'f', v_label), v_label, 'pending', v_uid)
    returning id into v_id;
  end if;
  insert into core.trait_votes (voter_user_id, player_id, sport_id, trait_id)
  values (v_uid, p_player, v_sport, v_id) on conflict do nothing;
  return api.get_traits(p_player);
end;
$$;
revoke all on function api.suggest_trait(uuid, text) from public, anon;
grant execute on function api.suggest_trait(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- The profile: api.get_player (20270227000000_identity_checks) with the games, tournament and round on the last
-- matches, and the staff review respected everywhere
-- ---------------------------------------------------------------------------
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
    -- an account holds this player (never which one)
    'claimed', exists (select 1 from core.players where id = p_player_id and claimed_by_user_id is not null),
    'record_year', (
      select jsonb_build_object('w', count(*) filter (where r.won), 'l', count(*) filter (where not r.won))
        from core.player_results(p_player_id, v_sport) r
       where extract(year from core.athens_day(r.starts_at)) = v_year),
    'last_matches', coalesce((
      select jsonb_agg(x.j order by x.starts_at desc)
        from (
          select r.starts_at, jsonb_build_object(
                   'match_id', r.match_id, 'starts_at', r.starts_at, 'format', r.format,
                   'won', r.won, 'score', r.score_summary, 'sets', coalesce(r.sets, '[]'::jsonb),
                   'tournament', (select t.name from core.tournaments t where t.id = m.tournament_id),
                   'round', nullif(btrim(coalesce(m.round, '')), ''),
                   'level', (select e.name from core.tournament_events e where e.id = m.event_id),
                   'discipline', m.provenance ->> 'discipline',
                   'retired', r.retired, 'walkover', r.walkover,
                   'partner', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                                 from core.match_participants o
                                where o.match_id = r.match_id and o.side = r.side and o.player_id <> p_player_id),
                   'opponents', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                                   from core.match_participants o
                                  where o.match_id = r.match_id and o.side <> r.side)) as j
            from core.player_results(p_player_id, v_sport) r
            join core.matches m on m.id = r.match_id
           order by r.starts_at desc nulls last
           limit 5
        ) x), '[]'::jsonb),
    'next_match', (
      select jsonb_build_object(
               'match_id', m.id, 'starts_at', m.starts_at, 'format', m.format,
               'tournament', (select t.name from core.tournaments t where t.id = m.tournament_id),
               'round', nullif(btrim(coalesce(m.round, '')), ''),
               'level', (select e.name from core.tournament_events e where e.id = m.event_id),
               'discipline', m.provenance ->> 'discipline',
               'partner', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                             from core.match_participants o
                            where o.match_id = m.id and o.side = mp.side and o.player_id <> p_player_id),
               'opponents', (select coalesce(jsonb_agg(core.player_ref_json(o.player_id) order by o.position), '[]'::jsonb)
                               from core.match_participants o
                              where o.match_id = m.id and o.side <> mp.side))
        from core.match_participants mp
        join core.matches m on m.id = mp.match_id
       where mp.player_id = p_player_id and m.approved and m.review is distinct from 'pending'
         and m.status in ('announced', 'scheduled')
         and m.starts_at > now()
       order by m.starts_at
       limit 1));
end;
$$;
