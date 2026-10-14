-- The drawn avatars in use (founder, 14 Oct 2026: "create avatars same way you created the ball animations"; style
-- approved the same day). A player picks one of the 12 drawn defaults (apps/app/src/lib/avatar.ts); none picked means
-- the default the app works out from the account. Skin and hair are part of the person and never sold, so this is a
-- plain profile choice, not a cosmetic. get_me returns it with the profile.

alter table core.profiles add column avatar text
  check (avatar is null or avatar in ('m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6'));

create or replace function api.set_avatar(p_key text)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_key is not null and p_key not in ('m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6') then
    raise exception 'unknown_avatar' using errcode = '22023';
  end if;
  update core.profiles set avatar = p_key where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  return jsonb_build_object('avatar', p_key);
end;
$$;
revoke all on function api.set_avatar(text) from public, anon;
grant execute on function api.set_avatar(text) to authenticated, service_role;

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
                  'claim_status', pr.claim_status, 'avatar', pr.avatar)
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
                  'max', (v_rules ->> 'freeze_max')::int),
                'level', core.game_level(gs.total_points, coalesce((v_rules ->> 'game_level_step')::int, 100)))
              from core.user_game_state gs where gs.user_id = v_uid),
    'pro', v_pro,
    'unlocks', coalesce((select jsonb_agg(unlock_key order by unlocked_at) from core.unlock_progress where user_id = v_uid), '[]'::jsonb),
    'inbox_unseen', (select count(*) from core.feed_inbox where user_id = v_uid and seen_at is null),
    'circle_count', (select count(*) from core.follows where user_id = v_uid),
    'results_at', (select max(m.resolved_at) from core.matches m
                    where m.sport_id = v_sport and m.resolved_at is not null and m.approved and m.status <> 'void'
                      and m.resolved_at > now() - interval '14 days' and m.resolved_at <= now())
  );
end;
$$;
