-- Admin (founder, 6 Nov 2026: "a total for players and a new tab for Users of the app with stats and actions").
--   * api.admin_players_summary: the roster's totals. A merged entry is not a person, so it does not count.
--   * api.admin_users: every account with its numbers, and the totals on top. Admins only, as it shows emails.
--   * api.admin_revoke_pro: ends the Pro an admin gave (promo, gift). A paid subscription is the store's and stays.
--   * api.admin_set_user_hidden: off the Ladder and the lists that hide a profile (core.profiles.hidden), or back.
-- «Last opened» is the latest of a cold launch (push_tokens.last_seen_at) and a refreshed sign-in (auth.sessions.updated_at),
-- as in core.opened_app_since. Someone with notifications refused has only the second.

create or replace function api.admin_players_summary()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return (select jsonb_build_object(
            'total', count(*) filter (where p.status <> 'merged'),
            'claimed', count(*) filter (where p.status <> 'merged' and p.claimed_by_user_id is not null),
            'pending', count(*) filter (where p.status = 'pending'),
            'hidden', count(*) filter (where p.status <> 'merged' and p.hidden),
            'minors', count(*) filter (where p.status <> 'merged' and p.is_minor))
            from core.players p);
end;
$$;
revoke all on function api.admin_players_summary() from public, anon;
grant execute on function api.admin_players_summary() to authenticated, service_role;

create or replace function api.admin_users(p_query text default null, p_filter text default 'all', p_limit int default 500)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_q      text := core.normalize_search(coalesce(p_query, ''));
  v_filter text := coalesce(p_filter, 'all');
begin
  if not (core.is_service() or core.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return (
    with base as (
      select pr.user_id, pr.first_name, pr.surname, pr.display_name, pr.baller_name, pr.hidden, pr.role, pr.created_at,
             u.email,
             (select max(pt.last_seen_at) from core.push_tokens pt where pt.user_id = pr.user_id) as device_seen,
             (select max(se.updated_at) from auth.sessions se where se.user_id = pr.user_id) as session_seen,
             (select string_agg(distinct pt.platform, ', ') from core.push_tokens pt where pt.user_id = pr.user_id) as devices,
             core.is_pro(pr.user_id) as pro,
             (select pl.id from core.players pl where pl.claimed_by_user_id = pr.user_id limit 1) as player_id
        from core.profiles pr
        join auth.users u on u.id = pr.user_id
       where pr.deleted_at is null
    ), people as (
      select b.*, greatest(b.device_seen, b.session_seen) as last_opened from base b
    )
    select jsonb_build_object(
      'stats', (select jsonb_build_object(
                  'total', count(*),
                  'new_7d', count(*) filter (where created_at > now() - interval '7 days'),
                  'opened_7d', count(*) filter (where last_opened > now() - interval '7 days'),
                  'opened_30d', count(*) filter (where last_opened > now() - interval '30 days'),
                  'devices', count(*) filter (where devices is not null),
                  'pro', count(*) filter (where pro),
                  'claimed', count(*) filter (where player_id is not null))
                  from people),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'user_id', x.user_id, 'email', x.email,
                 'name', coalesce(nullif(btrim(concat_ws(' ', x.first_name, x.surname)), ''), nullif(btrim(x.display_name), '')),
                 'baller_name', x.baller_name, 'hidden', x.hidden, 'role', x.role, 'created_at', x.created_at,
                 'last_opened', x.last_opened, 'devices', x.devices, 'pro', x.pro,
                 'pro_source', (select e.source from core.entitlements e
                                 where e.user_id = x.user_id and e.key = 'pro' and e.status = 'active' and e.starts_at <= now()
                                   and (e.ends_at is null or e.ends_at > now())
                                 order by e.ends_at desc nulls first limit 1),
                 'pro_until', (select e.ends_at from core.entitlements e
                                where e.user_id = x.user_id and e.key = 'pro' and e.status = 'active' and e.starts_at <= now()
                                  and (e.ends_at is null or e.ends_at > now())
                                order by e.ends_at desc nulls first limit 1),
                 'player_id', x.player_id,
                 'player', (select concat_ws(' ', pl.first_name, pl.surname) from core.players pl where pl.id = x.player_id),
                 'points', coalesce(g.total_points, 0), 'streak', coalesce(g.streak, 0), 'streak_best', coalesce(g.streak_best, 0),
                 'votes', coalesce(g.votes_cast, 0), 'correct', coalesce(g.votes_correct, 0), 'active_days', coalesce(g.active_days, 0),
                 'quizzes', (select count(*) from core.quiz_sets s where s.user_id = x.user_id and s.awarded_at is not null))
               order by x.last_opened desc nulls last, x.created_at desc)
          from (select * from people p
                 where (v_q = '' or core.normalize_search(concat_ws(' ', p.first_name, p.surname, p.display_name, p.baller_name, p.email)) like '%' || v_q || '%')
                   and case v_filter
                         when 'new' then p.created_at > now() - interval '7 days'
                         when 'pro' then p.pro
                         when 'device' then p.devices is not null
                         when 'claimed' then p.player_id is not null
                         when 'gone' then p.last_opened is null or p.last_opened <= now() - interval '30 days'
                         when 'hidden' then p.hidden
                         else true end
                 order by p.last_opened desc nulls last, p.created_at desc
                 limit least(greatest(coalesce(p_limit, 500), 1), 1000)) x
          left join core.user_game_state g on g.user_id = x.user_id), '[]'::jsonb));
end;
$$;
revoke all on function api.admin_users(text, text, int) from public, anon;
grant execute on function api.admin_users(text, text, int) to authenticated, service_role;

create or replace function api.admin_revoke_pro(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare v_n int;
begin
  if not (core.is_service() or core.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  update core.entitlements set status = 'expired', ends_at = now()
   where user_id = p_user_id and key = 'pro' and source in ('promo', 'gift') and status = 'active';
  get diagnostics v_n = row_count;
  return jsonb_build_object('ended', v_n, 'still_pro', core.is_pro(p_user_id));
end;
$$;
revoke all on function api.admin_revoke_pro(uuid) from public, anon;
grant execute on function api.admin_revoke_pro(uuid) to authenticated, service_role;

create or replace function api.admin_set_user_hidden(p_user_id uuid, p_hidden boolean)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not (core.is_service() or core.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  update core.profiles set hidden = coalesce(p_hidden, false), updated_at = now() where user_id = p_user_id and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  return jsonb_build_object('user_id', p_user_id, 'hidden', coalesce(p_hidden, false));
end;
$$;
revoke all on function api.admin_set_user_hidden(uuid, boolean) from public, anon;
grant execute on function api.admin_set_user_hidden(uuid, boolean) to authenticated, service_role;
