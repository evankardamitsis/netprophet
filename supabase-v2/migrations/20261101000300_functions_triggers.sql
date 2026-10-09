-- NetProphet v2 baseline 4/8: auth helpers, integrity triggers, claim sync, new-user bootstrap.

-- ---------------------------------------------------------------------------
-- Authorisation helpers (used by RLS policies and RPCs)
-- ---------------------------------------------------------------------------
create or replace function core.is_admin()
returns boolean language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (
    select 1 from core.profiles
    where user_id = auth.uid() and role = 'admin' and deleted_at is null
  )
$$;

create or replace function core.is_staff()
returns boolean language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (
    select 1 from core.profiles
    where user_id = auth.uid() and role in ('admin', 'editor') and deleted_at is null
  )
$$;

-- service_role key (edge functions, cron through the edge function). Never true for a user JWT.
create or replace function core.is_service()
returns boolean language sql stable set search_path = pg_temp
as $$ select coalesce(auth.role(), '') = 'service_role' $$;

-- rules for a sport, with defaults, so no function hardcodes tennis
create or replace function core.sport_rules(p_sport text)
returns jsonb language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
           'correct', 10, 'upset', 30, 'chain', 5, 'freeze_max', 2,
           'free_freeze_every_votes', 15, 'first_free_freeze_at_streak', 3,
           'upset_share_max', 0.35, 'upset_min_votes', 10,
           'streak_milestones', jsonb_build_array(3, 5, 7, 10)
         ) || coalesce((select config -> 'rules' from core.sports where id = p_sport), '{}'::jsonb)
$$;

-- ---------------------------------------------------------------------------
-- New auth user -> profile + game state (ported idea from v1 handle_new_user)
-- ---------------------------------------------------------------------------
create or replace function core.handle_new_user()
returns trigger language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  meta  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_full text := coalesce(nullif(meta ->> 'full_name', ''), nullif(meta ->> 'name', ''));
begin
  insert into core.profiles (user_id, first_name, surname, display_name, locale)
  values (
    new.id,
    nullif(meta ->> 'first_name', ''),
    nullif(meta ->> 'surname', ''),
    coalesce(v_full, nullif(trim(coalesce(meta ->> 'first_name', '') || ' ' || coalesce(meta ->> 'surname', '')), ''),
             split_part(coalesce(new.email, ''), '@', 1)),
    case when meta ->> 'locale' = 'en' then 'en' else 'el' end
  )
  on conflict (user_id) do nothing;

  insert into core.user_game_state (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function core.handle_new_user();

-- a user can never promote themselves
create or replace function core.guard_profile_role()
returns trigger language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  -- only client sessions (PostgREST sets the role GUC) are restricted; migrations, seeds and ops run as owner
  if new.role is distinct from old.role
     and coalesce(current_setting('role', true), 'none') in ('authenticated', 'anon')
     and not (core.is_service() or core.is_admin()) then
    raise exception 'forbidden: role can only be changed by an admin' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger profiles_guard_role before update on core.profiles
  for each row execute function core.guard_profile_role();

-- ---------------------------------------------------------------------------
-- Claim sync (ported from v1 sync_profile_on_player_claim): players is the source of truth,
-- the profile follows. One player per user, one user per player (unique indexes on both sides).
-- ---------------------------------------------------------------------------
create or replace function core.sync_profile_on_player_claim()
returns trigger language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if new.claimed_by_user_id is not null then
    update core.profiles
       set claim_status = 'claimed',
           claimed_player_id = new.id,
           claim_completed_at = coalesce(claim_completed_at, now())
     where user_id = new.claimed_by_user_id;
  else
    update core.profiles
       set claimed_player_id = null,
           claim_status = case when claim_status = 'claimed' then 'skipped' else claim_status end
     where claimed_player_id = new.id;
  end if;
  return new;
end;
$$;
create trigger player_claim_sync
  after insert or update of claimed_by_user_id on core.players
  for each row execute function core.sync_profile_on_player_claim();

-- ---------------------------------------------------------------------------
-- Match integrity
-- ---------------------------------------------------------------------------
-- Sides must be complete for the match format and respect the sport's mixed rules.
-- Deferred, so a match and its participants can be inserted in one transaction in any order.
create or replace function core.check_match_participants()
returns trigger language plpgsql set search_path = core, pg_temp
as $$
declare
  v_match   core.matches;
  v_id      uuid := coalesce(new.match_id, old.match_id);
  v_cfg     jsonb;
  v_size    int;
  v_side    int;
  v_cnt     int;
  v_m       int;
  v_f       int;
  v_rules   jsonb;
begin
  select * into v_match from core.matches where id = v_id;
  if not found then return null; end if;   -- match deleted (cascade)

  select config into v_cfg from core.sports where id = v_match.sport_id;
  v_cfg := coalesce(v_cfg, '{}'::jsonb);
  if v_cfg -> 'formats' is not null and (v_cfg -> 'formats') -> v_match.format is null then
    raise exception 'match_format_not_allowed: % for sport %', v_match.format, v_match.sport_id;
  end if;
  v_size := coalesce(((v_cfg -> 'formats') -> v_match.format ->> 'side_size')::int,
                     case v_match.format when 'singles' then 1 else 2 end);
  v_rules := coalesce(v_cfg -> 'mixed_rules', '{}'::jsonb);

  for v_side in 1..2 loop
    select count(*) into v_cnt from core.match_participants where match_id = v_id and side = v_side;
    if v_cnt <> v_size then
      raise exception 'match_sides_incomplete: side % has % players, expected %', v_side, v_cnt, v_size;
    end if;
  end loop;

  if v_match.format = 'singles' and coalesce((v_rules ->> 'singles_same_gender')::boolean, true) then
    if (select count(distinct p.gender) from core.match_participants mp
          join core.players p on p.id = mp.player_id
         where mp.match_id = v_id and p.gender is not null) > 1 then
      raise exception 'mixed_rules: men and women do not play each other in singles';
    end if;
  end if;

  if v_match.format = 'mixed' then
    for v_side in 1..2 loop
      select count(*) filter (where p.gender = 'm'), count(*) filter (where p.gender = 'f')
        into v_m, v_f
        from core.match_participants mp join core.players p on p.id = mp.player_id
       where mp.match_id = v_id and mp.side = v_side;
      if (v_m + v_f) = 2 and (v_m <> 1 or v_f <> 1) then
        raise exception 'mixed_rules: each side of a mixed match needs one man and one woman';
      end if;
    end loop;
  end if;
  return null;
end;
$$;
create constraint trigger match_participants_check
  after insert or update or delete on core.match_participants
  deferrable initially deferred
  for each row execute function core.check_match_participants();

-- Result coherence (idea ported from the v1 super tie-break validation and the pivot branch):
--   sets are winner-first; winner_side must play in the match; the winner must take the
--   majority of sets; the match must end exactly when someone reaches the majority;
--   a super tie-break set ("stb") is only allowed as the deciding set at 1-1.
-- Retired and walkover results relax the completeness rules.
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
      -- the match ends as soon as someone reaches the majority: no further sets
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
create trigger match_results_coherence
  before insert or update on core.match_results
  for each row execute function core.check_match_result();

-- ---------------------------------------------------------------------------
-- Append-only and immutability guards
-- ---------------------------------------------------------------------------
create or replace function core.ledger_append_only()
returns trigger language plpgsql set search_path = pg_temp
as $$
begin
  -- a cascade from deleting the auth user (account deletion) runs at trigger depth 2: allowed
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  raise exception 'points_ledger is append-only (%)', tg_op using errcode = '42501';
end;
$$;
create trigger points_ledger_no_change before update or delete on core.points_ledger
  for each row execute function core.ledger_append_only();
create trigger points_ledger_no_truncate before truncate on core.points_ledger
  for each statement execute function core.ledger_append_only();

-- a cast vote never changes subject or option; only resolution columns move
create or replace function core.votes_immutable()
returns trigger language plpgsql set search_path = pg_temp
as $$
begin
  if new.user_id <> old.user_id or new.subject_type <> old.subject_type or new.subject_id <> old.subject_id
     or new.option <> old.option or new.created_at <> old.created_at then
    raise exception 'votes are immutable once cast' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger votes_immutable before update on core.votes
  for each row execute function core.votes_immutable();

-- max N unused freezes per user (N from sport rules, default 2)
create or replace function core.freeze_cap()
returns trigger language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_max int;
begin
  v_max := (core.sport_rules(coalesce((select primary_sport from core.profiles where user_id = new.user_id), 'tennis')) ->> 'freeze_max')::int;
  if (select count(*) from core.freezes where user_id = new.user_id and used_at is null) >= v_max then
    raise exception 'freeze_cap: at most % unused freezes', v_max;
  end if;
  return new;
end;
$$;
create trigger freezes_cap before insert on core.freezes
  for each row execute function core.freeze_cap();
