-- Claiming a real roster player needs admin approval (founder, 18 Oct 2026).
--   «Εγώ είμαι» on a roster player (and a link to a roster player) no longer claims at once: it sends a request that
--   staff approve or reject in moderation («Αιτήματα παικτών»). The profile says 'requested' meanwhile.
--   A pending player made from a logged match can still be claimed at once through its link: nobody owns that name yet.
--   Approve does what claim_player did (the player becomes theirs, the profile follows); reject clears the request.
--   The user hears back in the app (an in_app notification 'claim_review').

alter table core.profiles drop constraint profiles_claim_status_check;
alter table core.profiles add constraint profiles_claim_status_check
  check (claim_status in ('none', 'claimed', 'skipped', 'creation_requested', 'requested'));

create table core.claim_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  player_id   uuid not null references core.players (id) on delete cascade,
  via         text not null default 'app' check (via in ('app', 'link')),
  link_id     uuid references core.match_links (id) on delete set null,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  decided_by  uuid references auth.users (id) on delete set null
);
comment on table core.claim_requests is 'A user asks to be a roster player; staff decide. One open request per user.';
create unique index claim_requests_open_user on core.claim_requests (user_id) where status = 'pending';
create index claim_requests_open on core.claim_requests (created_at) where status = 'pending';
alter table core.claim_requests enable row level security;
grant select on core.claim_requests to authenticated;
create policy claim_requests_own_read on core.claim_requests for select to authenticated
  using (user_id = (select auth.uid()) or core.is_staff());

-- the request: one open per user (a new pick replaces the old one), the profile shows 'requested'
create or replace function core.request_claim(p_uid uuid, p_player uuid, p_via text, p_link uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_open core.claim_requests;
begin
  select * into v_open from core.claim_requests where user_id = p_uid and status = 'pending' for update;
  if found and v_open.player_id = p_player then
    return jsonb_build_object('player_id', p_player, 'claimed', false, 'requested', true, 'replayed', true);
  end if;
  if found then
    update core.claim_requests set status = 'cancelled', decided_at = now() where id = v_open.id;
  end if;
  insert into core.claim_requests (user_id, player_id, via, link_id) values (p_uid, p_player, p_via, p_link);
  update core.profiles set claim_status = 'requested' where user_id = p_uid;
  return jsonb_build_object('player_id', p_player, 'claimed', false, 'requested', true, 'replayed', false);
end;
$$;
revoke all on function core.request_claim(uuid, uuid, text, uuid) from public;

-- what a link claim does after the player is theirs: the link is used, its good word becomes a kudo
create or replace function core.finish_link_claim(p_link uuid, p_uid uuid)
returns void
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_l      core.match_links;
  v_logger uuid;
begin
  select * into v_l from core.match_links where id = p_link;
  if not found then return; end if;
  update core.match_links set claimed_at = coalesce(claimed_at, now()) where id = v_l.id;
  if v_l.kudo is not null then
    select pr.claimed_player_id into v_logger
      from core.matches m join core.profiles pr on pr.user_id = m.logged_by where m.id = v_l.match_id;
    if v_logger is not null then
      insert into core.kudos (from_user_id, to_player_id, match_id, option_id)
      select p_uid, v_logger, v_l.match_id, o.id
        from core.kudos_options o
       where o.key = case v_l.kudo when 'serve' then 'strong_serve' when 'backhand' then 'great_backhand'
                                   when 'calm' then 'calm_clutch' when 'feet' then 'quick_feet'
                                   when 'fair_play' then 'fair_calls' when 'company' then 'good_vibes' end
      on conflict (from_user_id, match_id, to_player_id) do nothing;
    end if;
  end if;
end;
$$;
revoke all on function core.finish_link_claim(uuid, uuid) from public;

-- «Εγώ είμαι»: a roster player is asked for, not taken
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
      return jsonb_build_object('player_id', p_player_id, 'claimed', true, 'requested', false, 'replayed', true);
    end if;
    raise exception 'already_claimed_other: this account already claimed a player' using errcode = '23505';
  end if;
  if v_pl.claimed_by_user_id is not null then
    raise exception 'player_already_claimed' using errcode = '23505';
  end if;
  if v_pl.hidden then
    raise exception 'player_not_claimable' using errcode = 'P0002';
  end if;

  return core.request_claim(v_uid, p_player_id, 'app', null);
end;
$$;

-- a link: its pending player (made from the logged match) is taken at once; a roster player is asked for
create or replace function api.claim_via_link(p_token text)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_l      core.match_links;
  v_pr     core.profiles;
  v_pl     core.players;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  v_l := core.link_by_token(p_token);
  perform pg_advisory_xact_lock(hashtextextended('user:' || v_uid::text, 0));
  select * into v_pr from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  select * into v_pl from core.players where id = v_l.player_id for update;
  if v_pr.claimed_player_id = v_pl.id then
    return jsonb_build_object('player_id', v_pl.id, 'claimed', true, 'requested', false, 'replayed', true);
  end if;
  if v_pr.claimed_player_id is not null then
    raise exception 'already_claimed_other' using errcode = '23505';
  end if;
  if v_pl.claimed_by_user_id is not null or v_pl.status = 'merged' then
    raise exception 'player_already_claimed' using errcode = '23505';
  end if;
  -- a player who chose to hide is never taken through a link someone else sent
  if v_pl.hidden then raise exception 'player_hidden' using errcode = '42501'; end if;

  if v_pl.status = 'active' then
    return core.request_claim(v_uid, v_pl.id, 'link', v_l.id);
  end if;

  update core.players set claimed_by_user_id = v_uid, status = 'active' where id = v_pl.id;   -- trigger syncs the profile
  perform core.finish_link_claim(v_l.id, v_uid);
  return jsonb_build_object('player_id', v_pl.id, 'claimed', true, 'requested', false, 'replayed', false);
end;
$$;

-- «Δεν με βρίσκω» / skip after a request: the request stands
create or replace function api.set_claim_status(p_status text)
returns text
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_now text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_status not in ('skipped', 'creation_requested') then
    raise exception 'invalid_argument: claim status' using errcode = '22023';
  end if;
  select claim_status into v_now from core.profiles where user_id = v_uid and deleted_at is null for update;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  if v_now = p_status then return v_now; end if;   -- replay
  if v_now = 'requested' then return v_now; end if;   -- staff decide the request first
  if v_now = 'claimed' then raise exception 'already_claimed' using errcode = '23505'; end if;
  -- none -> skipped | creation_requested; skipped -> creation_requested (changed their mind)
  if not (v_now = 'none' or (v_now = 'skipped' and p_status = 'creation_requested')) then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;
  update core.profiles set claim_status = p_status where user_id = v_uid;
  return p_status;
end;
$$;

-- «Αιτήματα παικτών»: open requests, oldest first --------------------------------------------------------------
create or replace function api.admin_claim_queue()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'user_id', q.user_id, 'via', q.via, 'created_at', q.created_at,
             'user', jsonb_build_object(
                       'name', nullif(btrim(concat_ws(' ', pr.first_name, pr.surname)), ''),
                       'display_name', pr.display_name, 'area_id', pr.area_id,
                       'joined_at', pr.created_at),
             'player', jsonb_build_object(
                         'id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'area_id', p.area_id,
                         'birth_year', p.birth_year, 'source', p.source,
                         'claimed', p.claimed_by_user_id is not null,
                         'matches', (select count(*) from core.match_participants mp where mp.player_id = p.id)),
             -- other people asking for the same player
             'others', (select count(*) from core.claim_requests o
                         where o.player_id = q.player_id and o.status = 'pending' and o.id <> q.id))
           order by q.created_at, q.id)
      from core.claim_requests q
      join core.profiles pr on pr.user_id = q.user_id
      join core.players p on p.id = q.player_id
     where q.status = 'pending'), '[]'::jsonb);
end;
$$;

-- «Έγκριση» / «Απόρριψη» ------------------------------------------------------------------------------------------
create or replace function api.admin_review_claim(p_user uuid, p_approve boolean)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_q        core.claim_requests;
  v_pr       core.profiles;
  v_pl       core.players;
  v_decision text := case when p_approve then 'approved' else 'rejected' end;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_approve is null then raise exception 'bad_decision' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('user:' || p_user::text, 0));
  select * into v_q from core.claim_requests where user_id = p_user and status = 'pending' for update;
  if not found then raise exception 'no_request' using errcode = 'P0002'; end if;

  if p_approve then
    -- the claim exactly as claim_player made it
    select * into v_pr from core.profiles where user_id = p_user and deleted_at is null;
    if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
    select * into v_pl from core.players where id = v_q.player_id for update;
    if v_pr.claimed_player_id is not null and v_pr.claimed_player_id <> v_pl.id then
      raise exception 'already_claimed_other' using errcode = '23505';
    end if;
    if v_pl.claimed_by_user_id is not null and v_pl.claimed_by_user_id <> p_user then
      raise exception 'player_already_claimed' using errcode = '23505';
    end if;
    if v_pl.status <> 'active' then raise exception 'player_not_claimable' using errcode = 'P0002'; end if;
    update core.players set claimed_by_user_id = p_user where id = v_pl.id;   -- trigger syncs the profile
    if v_q.link_id is not null then perform core.finish_link_claim(v_q.link_id, p_user); end if;
  else
    update core.profiles set claim_status = 'none' where user_id = p_user and claim_status = 'requested';
  end if;
  update core.claim_requests set status = v_decision, decided_at = now(), decided_by = auth.uid() where id = v_q.id;

  insert into core.notifications (user_id, type, payload, channel, dedupe_key)
  values (p_user, 'claim_review', jsonb_build_object('player_id', v_q.player_id, 'decision', v_decision), 'in_app',
          'claim_review:' || v_q.id)
  on conflict (dedupe_key) do nothing;
  return jsonb_build_object('user_id', p_user, 'player_id', v_q.player_id, 'decision', v_decision);
end;
$$;

revoke all on function api.admin_claim_queue() from public, anon;
revoke all on function api.admin_review_claim(uuid, boolean) from public, anon;
grant execute on function api.admin_claim_queue() to authenticated, service_role;
grant execute on function api.admin_review_claim(uuid, boolean) to authenticated, service_role;
