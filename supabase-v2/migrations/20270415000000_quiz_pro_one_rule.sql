-- One rule card a day for Pro too, not two (founder, 6 Nov): the rules last twice as long before they come back, and the
-- freed place goes to life on court. Everything else in the set is as in 20270413000000_quiz_variety.
create or replace function core.quiz_build_set(p_user uuid, p_day date, p_pro boolean default null)
returns uuid
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_set     uuid;
  v_sport   text;
  v_pro     boolean := coalesce(p_pro, core.is_pro(p_user));
  v_want    int;
  v_real    int;
  v_people  int;
  v_rules   int;
  v_base    text := p_user::text || p_day::text;
  v_cards   jsonb := '[]'::jsonb;
  v_used_t  uuid[] := '{}';
  v_used_p  uuid[] := '{}';
  v_got     int := 0;
  v_kind    text;
  v_kinds   text[] := array['pre', 'post_who', 'post_third', 'score', 'comeback', 'h2h', 'busy', 'month', 'cup', 'who'];
  v_seed    text;
  v_dyn     jsonb;
  v_who     jsonb;
  v_ids     uuid[];
  v_n       int;
  v_players jsonb;
  v_content jsonb;
  v_step    text;
  t         record;
begin
  select id into v_set from core.quiz_sets where user_id = p_user and quiz_day = p_day;
  if v_set is not null then return v_set; end if;
  select primary_sport into v_sport from core.profiles where user_id = p_user;
  v_sport := coalesce(v_sport, 'tennis');
  v_want := case when v_pro then 12 else 6 end;
  v_real := case when v_pro then 6 else 3 end;
  v_people := case when v_pro then 2 else 1 end;
  v_rules := 1;

  insert into core.quiz_sets (user_id, quiz_day, sport_id, pro) values (p_user, p_day, v_sport, v_pro)
  on conflict (user_id, quiz_day) do nothing returning id into v_set;
  if v_set is null then
    select id into v_set from core.quiz_sets where user_id = p_user and quiz_day = p_day;
    return v_set;
  end if;

  if extract(isodow from p_day) = 1 then v_kinds := array_append(v_kinds, 'weekly'); end if;

  -- from the real matches: one of a kind, in a different order each day
  foreach v_kind in array array(select k from unnest(v_kinds) k order by md5(v_base || k)) loop
    exit when jsonb_array_length(v_cards) >= v_real;
    v_seed := v_base || v_kind;
    v_dyn := case
      when v_kind in ('score', 'comeback', 'h2h', 'busy') then core.quiz_real(p_user, v_sport, v_kind, p_day, v_seed, v_used_p, v_used_t)
      when v_kind = 'month' then core.quiz_month(p_user, v_sport, p_day, v_seed, v_used_p, v_used_t)
      when v_kind = 'cup' then core.quiz_tournament(p_user, v_sport, 'cup', p_day, v_seed, v_used_p, v_used_t)
      when v_kind = 'who' then null
      else core.quiz_dynamic(p_user, v_sport, v_kind, p_day, v_seed, v_used_p, v_used_t) end;
    if v_kind = 'who' then
      for t in select * from core.quiz_templates where active and trigger = 'static' and family = 'q' order by md5(v_seed || id::text) loop
        v_who := core.quiz_who(p_user, v_sport, t.guardrails ->> 'gender', v_seed, v_used_p);
        continue when v_who is null;
        v_dyn := jsonb_build_object('template_id', t.id, 'family', 'q', 'ids', v_who -> 'ids',
          'content', jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', v_who ->> 'q', 'clues', v_who -> 'clues',
                                        'options', v_who -> 'options', 'right', (v_who ->> 'right')::int, 'players', v_who -> 'players'));
        exit;
      end loop;
    end if;
    continue when v_dyn is null;
    v_cards := v_cards || jsonb_build_object('t', v_dyn -> 'template_id', 'f', coalesce(v_dyn ->> 'family', 'd'), 'c', v_dyn -> 'content', 'i', v_dyn -> 'ids');
    v_used_t := v_used_t || (v_dyn ->> 'template_id')::uuid;
    v_used_p := v_used_p || array(select jsonb_array_elements_text(v_dyn -> 'ids')::uuid);
  end loop;

  -- then the people you know, the rules, and life on court up to the full set; what you were asked lately waits
  foreach v_step in array array['people', 'rule', 'fill'] loop
    v_got := 0;
    for t in
      select q.* from core.quiz_templates q
       where q.active and q.id <> all (v_used_t)
         and case v_step when 'people' then q.trigger = 'static' and q.family in ('s', 'c')
                         when 'rule' then q.trigger = 'rule'
                         else q.trigger = 'static' and q.family = 'o' end
       order by exists (select 1 from core.quiz_set_cards c join core.quiz_sets s on s.id = c.set_id
                         where s.user_id = p_user and s.quiz_day > p_day - 30 and c.template_id = q.id),
                md5(v_base || v_step || q.id::text)
    loop
      exit when jsonb_array_length(v_cards) >= v_want;
      exit when v_step = 'people' and v_got >= v_people;
      exit when v_step = 'rule' and v_got >= v_rules;
      v_n := coalesce((t.slot_template ->> 'players')::int, 0);
      v_ids := '{}';
      v_players := '[]'::jsonb;
      if v_n > 0 then
        v_ids := array(select x.player_id from core.quiz_pool(p_user, v_sport, t.guardrails ->> 'gender', v_base || t.id::text) x
                        where x.player_id <> all (v_used_p) limit v_n);
        continue when coalesce(array_length(v_ids, 1), 0) < v_n;
        select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                                  order by array_position(v_ids, p.id)), '[]'::jsonb)
          into v_players from core.players p where p.id = any (v_ids);
      end if;
      v_content := jsonb_build_object('tag', t.slot_template ->> 'tag', 'q', t.slot_template ->> 'q',
                                      'options', (select jsonb_agg(jsonb_build_object('label', o)) from jsonb_array_elements_text(t.option_templates) o),
                                      'players', v_players);
      if t.trigger = 'rule' then
        v_content := v_content || jsonb_build_object('right', (t.slot_template ->> 'right')::int, 'reveal', t.slot_template ->> 'reveal');
      end if;
      v_cards := v_cards || jsonb_build_object('t', t.id, 'f', t.family, 'c', v_content, 'i', to_jsonb(v_ids));
      v_used_t := v_used_t || t.id;
      v_used_p := v_used_p || v_ids;
      v_got := v_got + 1;
    end loop;
  end loop;

  -- no fixed order
  insert into core.quiz_set_cards (set_id, position, template_id, family, content, player_ids)
  select v_set, row_number() over (order by md5(v_base || 'o' || (c ->> 't'))), (c ->> 't')::uuid, c ->> 'f', c -> 'c',
         array(select jsonb_array_elements_text(c -> 'i')::uuid)
    from jsonb_array_elements(v_cards) c;
  return v_set;
end;
$$;
revoke all on function core.quiz_build_set(uuid, date, boolean) from public;
