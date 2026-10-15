-- Other players' drawn avatars (founder, 14 Oct 2026: avatars in use). A player with an account shows their drawn
-- player in lists: the one they picked, or 'default' (the app draws the default from the player id and gender). A
-- roster player without an account, or a hidden profile, gets null: the app keeps the initials, never a face for a
-- real person who did not choose one (docs/v2/avatar.md). The three shared player shapes gain `avatar`; the match
-- sides also gain `gender`.

create or replace function core.player_avatar(p_player uuid)
returns text language sql stable set search_path = core, pg_temp
as $$
  select coalesce(pr.avatar, 'default')
    from core.players p
    join core.profiles pr on pr.user_id = p.claimed_by_user_id and pr.deleted_at is null and not pr.hidden
   where p.id = p_player
$$;
grant execute on function core.player_avatar(uuid) to authenticated, service_role;

create or replace function core.match_sides_json(p_match uuid)
returns jsonb language sql stable set search_path = core, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('side', s.side, 'players', s.players) order by s.side), '[]'::jsonb)
  from (
    select mp.side,
           jsonb_agg(jsonb_build_object(
             'id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'photo_path', p.photo_path,
             'area_id', p.area_id, 'level_tier', ps.level_tier, 'level_direction', ps.level_direction,
             'gender', p.gender, 'avatar', core.player_avatar(p.id)
           ) order by mp.position) as players
      from core.match_participants mp
      join core.players p on p.id = mp.player_id
      left join core.player_sports ps
             on ps.player_id = p.id and ps.sport_id = (select sport_id from core.matches where id = p_match)
     where mp.match_id = p_match
     group by mp.side
  ) s
$$;

create or replace function core.player_card_json(p_player uuid, p_uid uuid, p_sport text)
returns jsonb language sql stable set search_path = core, pg_temp
as $$
  select jsonb_build_object(
           'id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender,
           'name_forms', p.name_forms, 'area_id', p.area_id,
           'level_tier', ps.level_tier, 'level_direction', ps.level_direction,
           'is_followed', f.player_id is not null, 'relation', f.relation,
           'form', core.player_form(p.id, p_sport), 'avatar', core.player_avatar(p.id))
    from core.players p
    left join core.player_sports ps on ps.player_id = p.id and ps.sport_id = p_sport
    left join core.follows f on f.user_id = p_uid and f.player_id = p.id
   where p.id = p_player
$$;

create or replace function core.player_ref_json(p_player uuid)
returns jsonb language sql stable set search_path = core, pg_temp
as $$
  select jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname,
                            'gender', p.gender, 'name_forms', p.name_forms, 'avatar', core.player_avatar(p.id))
    from core.players p where p.id = p_player
$$;
