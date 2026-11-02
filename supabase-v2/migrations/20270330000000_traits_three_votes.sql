-- «Πώς παίζει»: at most three votes per person per player (founder, 2 Nov 2026: "you can vote on 3 stuff max").
--
-- One vote per person per phrase per player stays (the primary key). On top of it a person picks at most three
-- phrases for a player; a phrase they wrote themselves (waiting for review) is one of the three. Taking a vote back
-- frees a place. Votes given before this rule stay as they are (five at most on 2 Nov); they only stop new ones.
-- api.get_traits says how many I used and the limit, so the app can show «2 από 3». api.vote_trait and
-- api.suggest_trait refuse a fourth with 'too_many_votes'.
-- Copied from 20270314000000_player_card_traits_open.sql with the limit added.

create or replace function core.trait_votes_max()
returns int
language sql immutable set search_path = core, pg_temp
as $$ select 3 $$;

create or replace function core.trait_votes_left(p_user uuid, p_player uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select (select count(*) from core.trait_votes where voter_user_id = p_user and player_id = p_player) < core.trait_votes_max()
$$;
revoke execute on function core.trait_votes_left(uuid, uuid) from public, anon, authenticated;
grant execute on function core.trait_votes_left(uuid, uuid) to service_role;

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
    -- my votes on this player, of core.trait_votes_max() (phrases waiting for review count too)
    'my_votes', (select count(*)::int from core.trait_votes where player_id = p_player and voter_user_id = v_uid),
    'max_votes', core.trait_votes_max(),
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
      if not core.trait_votes_left(v_uid, p_player) then raise exception 'too_many_votes' using errcode = '54000'; end if;
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
    if not core.trait_votes_left(v_uid, p_player) then raise exception 'too_many_votes' using errcode = '54000'; end if;
    insert into core.trait_defs (sport_id, label_el, label_en, status, created_by)
    values (v_sport, jsonb_build_object('m', v_label, 'f', v_label), v_label, 'pending', v_uid)
    returning id into v_id;
  end if;
  if not exists (select 1 from core.trait_votes where voter_user_id = v_uid and player_id = p_player and trait_id = v_id) then
    if not core.trait_votes_left(v_uid, p_player) then raise exception 'too_many_votes' using errcode = '54000'; end if;
    insert into core.trait_votes (voter_user_id, player_id, sport_id, trait_id)
    values (v_uid, p_player, v_sport, v_id) on conflict do nothing;
  end if;
  return api.get_traits(p_player);
end;
$$;
revoke all on function api.suggest_trait(uuid, text) from public, anon;
grant execute on function api.suggest_trait(uuid, text) to authenticated, service_role;

