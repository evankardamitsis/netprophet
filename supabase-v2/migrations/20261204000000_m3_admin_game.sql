-- M3 part 10: the staff side of the game. The quiz bank (templates: read, edit, add, retire) with a preview of any
-- player's set for any day, free or Pro, built and thrown away; the game settings as they are (quests, badges,
-- unlock ladder, points), read-only on purpose: packages/core is the one source of the rules and the shared vectors
-- check the database against it, so a threshold changes in code, not in a form; and a dry run of the month close.

-- a set can be built as Pro or free on demand (the preview); everyone else still gets core.is_pro
drop function core.quiz_build_set(uuid, date);
-- today's set for a player, built once (six; twelve with Pro), in the order Σενάριο, Διάλεξε έναν, Ποιος είναι;,
-- Άποψη, Σενάριο, Διάλεξε έναν; a family that cannot be filled falls back to Άποψη
create or replace function core.quiz_build_set(p_user uuid, p_day date, p_pro boolean default null)
returns uuid
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_set     uuid;
  v_sport   text;
  v_pro     boolean := coalesce(p_pro, core.is_pro(p_user));
  v_pattern text[] := array['s', 'c', 'q', 'o', 's', 'c'];
  v_used_t  uuid[] := '{}';
  v_used_p  uuid[] := '{}';
  v_seed    text;
  v_pos     int := 0;
  v_fam     text;
  t         record;
  v_n       int;
  v_players jsonb;
  v_ids     uuid[];
  v_content jsonb;
  v_who     jsonb;
  v_done    boolean;
begin
  select id into v_set from core.quiz_sets where user_id = p_user and quiz_day = p_day;
  if v_set is not null then return v_set; end if;
  select primary_sport into v_sport from core.profiles where user_id = p_user;
  v_sport := coalesce(v_sport, 'tennis');
  if v_pro then v_pattern := v_pattern || v_pattern; end if;

  insert into core.quiz_sets (user_id, quiz_day, sport_id, pro) values (p_user, p_day, v_sport, v_pro)
  on conflict (user_id, quiz_day) do nothing returning id into v_set;
  if v_set is null then   -- someone else built it a moment ago
    select id into v_set from core.quiz_sets where user_id = p_user and quiz_day = p_day;
    return v_set;
  end if;

  foreach v_fam in array v_pattern loop
    v_pos := v_pos + 1;
    v_done := false;
    v_seed := p_user::text || p_day::text || v_pos;
    for t in
      select * from core.quiz_templates
       where active and family in (v_fam, 'o') and id <> all (v_used_t)
       order by (family = 'o') <> (v_fam = 'o'), md5(v_seed || id::text)
    loop
      v_n := coalesce((t.slot_template ->> 'players')::int, 0);
      if t.family = 'q' then
        v_who := core.quiz_who(p_user, v_sport, t.guardrails ->> 'gender', v_seed, v_used_p);
        if v_who is null then continue; end if;
        v_ids := array(select jsonb_array_elements_text(v_who -> 'ids')::uuid);
        v_content := jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', v_who ->> 'q', 'clues', v_who -> 'clues',
                                        'options', v_who -> 'options', 'right', (v_who ->> 'right')::int, 'players', v_who -> 'players');
      else
        v_ids := array(select x.player_id from core.quiz_pool(p_user, v_sport, t.guardrails ->> 'gender', v_seed) x
                        where x.player_id <> all (v_used_p) limit v_n);
        if coalesce(array_length(v_ids, 1), 0) < v_n then continue; end if;
        select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                                  order by array_position(v_ids, p.id)), '[]'::jsonb)
          into v_players from core.players p where p.id = any (v_ids);
        v_content := jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', t.slot_template ->> 'q',
                                        'options', (select jsonb_agg(jsonb_build_object('label', o)) from jsonb_array_elements_text(t.option_templates) o),
                                        'players', v_players);
      end if;
      insert into core.quiz_set_cards (set_id, position, template_id, family, content, player_ids)
      values (v_set, v_pos, t.id, t.family, v_content, coalesce(v_ids, '{}'));
      v_used_t := v_used_t || t.id;
      v_used_p := v_used_p || coalesce(v_ids, '{}');
      v_done := true;
      exit;
    end loop;
    if not v_done then v_pos := v_pos - 1; end if;   -- nothing left at all: a shorter set
  end loop;
  return v_set;
end;
$$;
revoke all on function core.quiz_build_set(uuid, date, boolean) from public;

-- ---------------------------------------------------------------------------
-- Quiz bank
-- ---------------------------------------------------------------------------
create or replace function api.admin_quiz_templates()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', t.id, 'family', t.family, 'tag', t.slot_template ->> 'tag', 'q', t.slot_template ->> 'q',
             'players', coalesce((t.slot_template ->> 'players')::int, 0), 'options', t.option_templates,
             'gender', t.guardrails ->> 'gender', 'active', t.active,
             'used', (select count(*) from core.quiz_set_cards c where c.template_id = t.id),
             'answers', (select count(*) from core.quiz_set_cards c join core.votes v on v.subject_type = 'card' and v.subject_id = c.id
                          where c.template_id = t.id))
           order by case t.family when 's' then 1 when 'c' then 2 when 'q' then 3 else 4 end, t.active desc, t.slot_template ->> 'q')
      from core.quiz_templates t where t.trigger = 'static'), '[]'::jsonb);
end;
$$;
revoke all on function api.admin_quiz_templates() from public, anon;
grant execute on function api.admin_quiz_templates() to authenticated, service_role;

-- add (p_id null) or edit a template. p: {family, tag, q, players, options [..], gender, active}.
-- «Ποιος είναι;» cards come from the facts, so only their tag and active flag change.
create or replace function api.admin_save_quiz_template(p_id uuid, p jsonb)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_family  text := coalesce(p ->> 'family', (select family from core.quiz_templates where id = p_id));
  v_players int := coalesce((p ->> 'players')::int, 0);
  v_opts    jsonb := coalesce(p -> 'options', '[]'::jsonb);
  v_q       text := btrim(coalesce(p ->> 'q', ''));
  v_tag     text := btrim(coalesce(p ->> 'tag', ''));
  v_gender  text := nullif(p ->> 'gender', '');
  v_text    text;
  v_id      uuid := p_id;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_family is null or v_family not in ('s', 'c', 'q', 'o') then raise exception 'bad_family' using errcode = '22023'; end if;
  if v_tag = '' then raise exception 'tag_required' using errcode = '22023'; end if;
  if v_family = 'q' then
    if p_id is null then raise exception 'q_is_built_from_facts' using errcode = '22023'; end if;
    update core.quiz_templates
       set slot_template = slot_template || jsonb_build_object('tag', v_tag), active = coalesce((p ->> 'active')::boolean, active)
     where id = p_id;
    return jsonb_build_object('id', p_id);
  end if;
  if v_q = '' then raise exception 'question_required' using errcode = '22023'; end if;
  if jsonb_typeof(v_opts) <> 'array' or jsonb_array_length(v_opts) not between 2 and 4 then
    raise exception 'two_to_four_options' using errcode = '22023';
  end if;
  if v_family = 'o' then v_players := 0; v_gender := null; end if;
  if v_family <> 'o' and (v_players < 1 or v_players > 4 or v_gender is null or v_gender not in ('m', 'f')) then
    raise exception 'players_and_gender_required' using errcode = '22023';
  end if;
  -- every {pN...} must point at one of the players
  v_text := v_q || ' ' || (select string_agg(o, ' ') from jsonb_array_elements_text(v_opts) o);
  if exists (select 1 from regexp_matches(v_text, '\{p(\d)(\.(o|ton|ston|first|o_first))?\}', 'g') m where m[1]::int > v_players)
     or v_text ~ '\{(?!p\d(\.(o|ton|ston|first|o_first))?\})[^}]*\}' then
    raise exception 'bad_slot' using errcode = '22023';
  end if;

  if v_id is null then
    insert into core.quiz_templates (family, trigger, slot_template, option_templates, guardrails, active)
    values (v_family, 'static', jsonb_build_object('tag', v_tag, 'q', v_q, 'players', v_players), v_opts,
            case when v_gender is null then '{}'::jsonb else jsonb_build_object('gender', v_gender) end,
            coalesce((p ->> 'active')::boolean, true))
    returning id into v_id;
  else
    update core.quiz_templates
       set family = v_family, slot_template = jsonb_build_object('tag', v_tag, 'q', v_q, 'players', v_players),
           option_templates = v_opts,
           guardrails = case when v_gender is null then '{}'::jsonb else jsonb_build_object('gender', v_gender) end,
           active = coalesce((p ->> 'active')::boolean, active)
     where id = v_id and trigger = 'static';
    if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  end if;
  return jsonb_build_object('id', v_id);
end;
$$;
revoke all on function api.admin_save_quiz_template(uuid, jsonb) from public, anon;
grant execute on function api.admin_save_quiz_template(uuid, jsonb) to authenticated, service_role;

-- «preview day N»: the set a player would get that day, free or Pro, built and rolled back (a set that already
-- exists is shown as it is)
create or replace function api.admin_quiz_preview(p_email text, p_day date default null, p_pro boolean default false)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_user uuid;
  v_day  date := coalesce(p_day, core.quiz_day_key(now()));
  v_set  uuid;
  v_out  jsonb;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then raise exception 'no_such_user' using errcode = 'P0002'; end if;
  begin
    v_set := core.quiz_build_set(v_user, v_day, coalesce(p_pro, false));
    select jsonb_build_object('quiz_day', v_day, 'pro', s.pro,
             'cards', coalesce((select jsonb_agg(jsonb_build_object('position', c.position, 'family', c.family, 'content', c.content)
                                                 order by c.position)
                                  from core.quiz_set_cards c where c.set_id = v_set), '[]'::jsonb))
      into v_out from core.quiz_sets s where s.id = v_set;
    raise exception using errcode = 'P0001', message = 'preview_rollback';
  exception when sqlstate 'P0001' then
    null;   -- the built set is thrown away
  end;
  return v_out;
end;
$$;
revoke all on function api.admin_quiz_preview(text, date, boolean) from public, anon;
grant execute on function api.admin_quiz_preview(text, date, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Game settings, read-only
-- ---------------------------------------------------------------------------
create or replace function api.admin_game_config()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'points', (select config -> 'rules' from core.sports where id = 'tennis'),
    'quests', (select jsonb_agg(jsonb_build_object('key', key, 'period', period, 'target', target, 'title_el', title_el,
                                                   'triggers', triggers, 'reward', reward, 'active', active) order by sort)
                 from core.quest_defs),
    'badges', (select jsonb_agg(jsonb_build_object('key', key, 'name_el', name_el, 'counter', counter, 'thresholds', to_jsonb(thresholds),
                                                   'on_card', on_card, 'tier3_reward', tier3_reward) order by sort)
                 from core.badge_defs),
    'unlocks', (select jsonb_agg(jsonb_build_object('key', key, 'step', step, 'title_el', title_el, 'primary', primary_rule,
                                                    'backup_votes', backup_votes, 'features', to_jsonb(features), 'celebrate', celebrate)
                                 order by step)
                  from core.unlock_defs),
    'league', jsonb_build_object('group_size', 20, 'promote_top', 5, 'relegate_from', 16, 'award_top', 3),
    'quiz', jsonb_build_object('free', 6, 'pro', 12, 'required', 6, 'resets', '09:00 Athens'));
end;
$$;
revoke all on function api.admin_game_config() from public, anon;
grant execute on function api.admin_game_config() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Month close dry run: what closing a month would do, written nowhere
-- ---------------------------------------------------------------------------
create or replace function api.admin_league_preview(p_month text default null)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare v_month text := coalesce(p_month, core.month_key());
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object('month', v_month, 'groups', coalesce((
    select jsonb_agg(jsonb_build_object(
             'tier', l.tier, 'group_no', l.group_no, 'closed', l.closed_at is not null,
             'rows', (select jsonb_agg(r || jsonb_build_object(
                               'name', (select coalesce(pl.first_name || ' ' || pl.surname, pr.display_name, pr.first_name)
                                          from core.profiles pr left join core.players pl on pl.id = pr.claimed_player_id
                                         where pr.user_id = (r ->> 'userId')::uuid),
                               'points', coalesce((select sum(delta)::int from core.points_ledger
                                                    where user_id = (r ->> 'userId')::uuid and month_key = l.month_key), 0))
                             order by (r ->> 'position')::int)
                        from jsonb_array_elements(core.league_close_group((
                          select coalesce(jsonb_agg(jsonb_build_object('userId', m.user_id, 'points', coalesce(p.points, 0),
                                                                       'lastPointAt', p.last_at, 'league', l.tier, 'groupId', l.id)), '[]'::jsonb)
                            from core.league_members m
                            left join (select user_id, sum(delta)::int as points, max(created_at) as last_at
                                         from core.points_ledger where month_key = l.month_key group by user_id) p on p.user_id = m.user_id
                           where m.league_id = l.id))) r))
           order by case l.tier when 'gold' then 1 when 'silver' then 2 else 3 end, l.group_no)
      from core.leagues l where l.month_key = v_month), '[]'::jsonb));
end;
$$;
revoke all on function api.admin_league_preview(text) from public, anon;
grant execute on function api.admin_league_preview(text) to authenticated, service_role;
