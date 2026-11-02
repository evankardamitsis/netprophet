-- Month medals (founder, 2 Nov 2026). When a month closes, the top 3 of each Κατηγορία group win a medal for their
-- Baller: gold for 1st, silver for 2nd, bronze for 3rd, with the month on it. Earned, never sold, one a month, and
-- they add up: a trophy shelf on the profile shows every one. Each winner also gets a Greek email (sent by the
-- admin's 08:30 morning route, no new cron), unless they switched it off (notification_prefs.medal_email).
--
-- Staff (profile role admin or editor) never take a prize place: they are skipped and the next players move up.
-- That holds for the medals and for the rewards league_close already gave (the crown for 1st, Frame «Κορυφαίος του
-- μήνα» for the top 3). Only the prizes: core.league_close_group (the parity copy of closeGroup in packages/core)
-- stays as it is, so staff still have their place on the board and in promotion and relegation.
--
-- One row a month per user in core.month_medals (month_key, league, place 1..3, points, emailed_at), rather than a
-- cosmetic item per month: the wardrobe is a fixed catalogue, a medal is dated. The Baller does not wear a medal
-- yet; the shelf shows them.
--
-- October 2026 is already closed: the end of this file awards it from the stored final ranks with the same rule.

create table core.month_medals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  league_id   uuid not null references core.leagues (id) on delete cascade,
  month_key   text not null check (month_key ~ '^\d{4}-\d{2}$'),
  tier        text not null check (tier in ('bronze', 'silver', 'gold')),
  place       int  not null check (place between 1 and 3),
  points      int  not null check (points > 0),
  awarded_at  timestamptz not null default now(),
  emailed_at  timestamptz,
  unique (user_id, month_key),
  unique (league_id, place)
);
create index month_medals_due_idx on core.month_medals (awarded_at) where emailed_at is null;
alter table core.month_medals enable row level security;
-- no policies: read through api.get_medals, written by core.month_medals_award only

-- a given account is staff (core.is_staff reads auth.uid(), which is null when the cron closes the month)
create or replace function core.is_staff_user(p_user uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (select 1 from core.profiles
                  where user_id = p_user and role in ('admin', 'editor') and deleted_at is null)
$$;
revoke all on function core.is_staff_user(uuid) from public;

-- the store review accounts (review_password_only, play_review_account) play like anyone but never take a prize:
-- in October 2026 play-review@ finished 2nd and would have taken a real player's medal
create or replace function core.is_review_account(p_user uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (select 1 from auth.users
                  where id = p_user and lower(trim(coalesce(email, ''))) in ('review@monadlabs.gr', 'play-review@monadlabs.gr'))
$$;
revoke all on function core.is_review_account(uuid) from public;

-- ---------------------------------------------------------------------------
-- The prizes of one closed group, from its final ranks: staff and players without points are left out, the rest
-- keep their order and the first three win (store review accounts are left out like staff). Gold also brings the crown, all three the Frame. Safe to run again.
-- ---------------------------------------------------------------------------
create or replace function core.month_medals_award(p_league uuid)
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_l core.leagues;
  r   record;
  v_n int := 0;
begin
  select * into v_l from core.leagues where id = p_league;
  if v_l.id is null then return 0; end if;
  for r in
    select x.user_id, x.points, row_number() over (order by x.final_rank, x.user_id)::int as place
      from (select m.user_id, m.final_rank, m.final_points as points
              from core.league_members m
             where m.league_id = v_l.id and m.final_rank is not null and coalesce(m.final_points, 0) > 0
               and not core.is_staff_user(m.user_id) and not core.is_review_account(m.user_id)) x
     order by place
     limit 3
  loop
    insert into core.month_medals (user_id, league_id, month_key, tier, place, points)
    values (r.user_id, v_l.id, v_l.month_key, v_l.tier, r.place, r.points)
    on conflict do nothing;
    if r.place = 1 then
      insert into core.user_cosmetics (user_id, item_id, source)
      select r.user_id, id, 'earned' from core.cosmetic_items where key = 'gear_crown'
      on conflict do nothing;
    end if;
    insert into core.user_cosmetics (user_id, item_id, source)
    select r.user_id, id, 'earned' from core.cosmetic_items where key = 'frame_month_top'
    on conflict do nothing;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.month_medals_award(uuid) from public;

-- ---------------------------------------------------------------------------
-- The month close: ranks, moves and the board as before; the prizes now come from core.month_medals_award, and
-- the «Κατάταξη · …» moment says which medal you won ('medal': 1, 2, 3 or null; 'award' is true with a medal)
-- ---------------------------------------------------------------------------
create or replace function core.league_close(p_league uuid)
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_l     core.leagues;
  v_res   jsonb;
  r       jsonb;
  v_pts   int;
  v_place int;
  v_n     int := 0;
begin
  select * into v_l from core.leagues where id = p_league for update;
  if v_l.id is null or v_l.closed_at is not null then return 0; end if;

  v_res := core.league_close_group((
    select coalesce(jsonb_agg(jsonb_build_object('userId', m.user_id, 'points', coalesce(p.points, 0),
                                                 'lastPointAt', p.last_at, 'league', v_l.tier, 'groupId', v_l.id)), '[]'::jsonb)
      from core.league_members m
      left join (select user_id, sum(delta)::int as points, max(created_at) as last_at
                   from core.points_ledger where month_key = v_l.month_key group by user_id) p on p.user_id = m.user_id
     where m.league_id = v_l.id));

  for r in select value from jsonb_array_elements(v_res) loop
    v_pts := coalesce((select sum(delta)::int from core.points_ledger
                        where user_id = (r ->> 'userId')::uuid and month_key = v_l.month_key), 0);
    update core.league_members
       set final_rank = (r ->> 'position')::int, final_points = v_pts,
           outcome = case r ->> 'movement' when 'promote' then 'promoted' when 'relegate' then 'relegated' else 'stayed' end
     where league_id = v_l.id and user_id = (r ->> 'userId')::uuid;
  end loop;

  -- the prizes: top 3 with points, staff left out (crown, Frame and the month medal)
  perform core.month_medals_award(v_l.id);

  for r in select value from jsonb_array_elements(v_res) loop
    v_pts := coalesce((select final_points from core.league_members
                        where league_id = v_l.id and user_id = (r ->> 'userId')::uuid), 0);
    v_place := (select place from core.month_medals where league_id = v_l.id and user_id = (r ->> 'userId')::uuid);
    if v_pts > 0 then
      insert into core.feed_inbox (user_id, kind, ref, payload)
      values ((r ->> 'userId')::uuid, 'celebration', 'league:' || v_l.id,
              jsonb_build_object('type', 'league', 'month', v_l.month_key, 'tier', v_l.tier,
                                 'position', (r ->> 'position')::int, 'movement', r ->> 'movement',
                                 'next_tier', r ->> 'nextLeague', 'award', v_place is not null, 'medal', v_place))
      on conflict (user_id, kind, ref) do nothing;
    end if;
    v_n := v_n + 1;
  end loop;
  update core.leagues set closed_at = now() where id = v_l.id;
  -- the top 3 count towards «Κορυφαίος του μήνα»
  perform core.badges_refresh((x ->> 'userId')::uuid) from jsonb_array_elements(v_res) x;
  return v_n;
end;
$$;
revoke all on function core.league_close(uuid) from public;

-- ---------------------------------------------------------------------------
-- The trophy shelf: my medals (no argument) or the medals of the account that holds a player (never which account).
-- Hidden and deleted profiles show none. Newest month first.
-- ---------------------------------------------------------------------------
create or replace function api.get_medals(p_player_id uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_user uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_player_id is null then
    v_user := auth.uid();
  else
    select pl.claimed_by_user_id into v_user from core.players pl where pl.id = p_player_id;
  end if;
  if v_user is null or not exists (select 1 from core.profiles pr
                                    where pr.user_id = v_user and pr.deleted_at is null
                                      and (not pr.hidden or v_user = auth.uid())) then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('month', mm.month_key, 'place', mm.place, 'tier', mm.tier)
                     order by mm.month_key desc)
      from core.month_medals mm where mm.user_id = v_user), '[]'::jsonb);
end;
$$;
revoke all on function api.get_medals(uuid) from public, anon;
grant execute on function api.get_medals(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- The winners' email, sent by the admin's morning route (service role only): the medals not emailed yet, for
-- accounts with an email that did not switch it off; then each one is marked once Resend took it.
-- ---------------------------------------------------------------------------
create or replace function api.admin_medal_emails_due()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', mm.id,
             'email', u.email,
             'first_name', nullif(btrim(coalesce(pr.first_name, pr.display_name, '')), ''),
             'place', mm.place,
             'month', mm.month_key,
             'tier', mm.tier) order by mm.awarded_at, mm.id)
      from core.month_medals mm
      join core.profiles pr on pr.user_id = mm.user_id and pr.deleted_at is null
      join auth.users u on u.id = mm.user_id
     where mm.emailed_at is null and u.email is not null and btrim(u.email) <> ''
       and core.push_wants(mm.user_id, 'medal_email')), '[]'::jsonb);
end;
$$;
revoke all on function api.admin_medal_emails_due() from public, anon, authenticated;
grant execute on function api.admin_medal_emails_due() to service_role;

create or replace function api.admin_medal_emails_sent(p_ids uuid[])
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_n int;
begin
  if not core.is_service() then raise exception 'forbidden' using errcode = '42501'; end if;
  update core.month_medals set emailed_at = now() where id = any (coalesce(p_ids, '{}')) and emailed_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function api.admin_medal_emails_sent(uuid[]) from public, anon, authenticated;
grant execute on function api.admin_medal_emails_sent(uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- Backfill: every group already closed gets its prizes by the new rule. On the live data that is October 2026
-- (group fec8faca): gold to the 2nd on the board, silver to the 3rd, no bronze (the 4th had no points), and the
-- crown to the new 1st. Earned things nobody loses: the founder keeps the crown and Frame October gave. The medals
-- go out by email with the next 08:30 run (emailed_at stays null). Their October moment was already shown, so the
-- feed is left as it is.
-- ---------------------------------------------------------------------------
do $$
declare v_id uuid;
begin
  for v_id in select l.id from core.leagues l
               where l.closed_at is not null
                 and not exists (select 1 from core.month_medals mm where mm.league_id = l.id)
               order by l.month_key, l.tier, l.group_no loop
    perform core.month_medals_award(v_id);
  end loop;
end;
$$;
