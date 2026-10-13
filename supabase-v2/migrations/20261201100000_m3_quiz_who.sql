-- «Ποιος είναι;» on the real roster: no player has an area yet and none has a five-match form, so the card needed
-- facts nobody had and every set fell back to Άποψη. The clues are now whatever exists, and the two others always
-- differ in level, so the level alone tells them apart.

-- «Ποιος είναι;»: the answer and two others of the same gender and a different level, with the facts that exist
-- (area, level and its direction, form or a left hand) as clues; the roster has no areas yet, so the level must do
create or replace function core.quiz_who(p_user uuid, p_sport text, p_gender text, p_seed text, p_used uuid[])
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_right record;
  v_lvl   text;
  v_clues jsonb := '[]'::jsonb;
  v_wins  int;
  v_n     int;
  v_opts  jsonb;
  v_ids   uuid[];
begin
  select * into v_right from core.quiz_pool(p_user, p_sport, p_gender, p_seed) x
   where x.player_id <> all (p_used) and x.level_tier is not null limit 1;
  if v_right.player_id is null then return null; end if;

  v_ids := array(select x.player_id from core.quiz_pool(p_user, p_sport, p_gender, p_seed || 'd') x
                  where x.player_id <> all (p_used) and x.player_id <> v_right.player_id
                    and x.level_tier is not null and x.level_tier <> v_right.level_tier
                  limit 2);
  if coalesce(array_length(v_ids, 1), 0) < 2 then return null; end if;

  if v_right.area_id is not null then
    v_clues := v_clues || to_jsonb((select name_el from core.areas where id = v_right.area_id));
  end if;
  v_lvl := 'level ' || case when v_right.level_tier = trunc(v_right.level_tier) then trunc(v_right.level_tier)::int::text
                            else replace(v_right.level_tier::text, '.', ',') end;
  v_clues := v_clues || to_jsonb(v_lvl || case v_right.level_direction
               when 'up' then ' και ανεβαίνει'
               when 'down' then ''
               else case when v_right.gender = 'f' then ' και σταθερή' else ' και σταθερός' end end);
  v_n := jsonb_array_length(coalesce(v_right.form, '[]'::jsonb));
  if v_n >= 3 then
    select count(*) into v_wins from jsonb_array_elements_text(v_right.form) r where r = 'W';
    v_clues := v_clues || to_jsonb(v_wins || case when v_wins = 1 then ' νίκη στα ' else ' νίκες στα ' end || v_n || ' τελευταία');
  elsif v_right.hand = 'L' then
    v_clues := v_clues || to_jsonb(case when v_right.gender = 'f' then 'Αριστερόχειρη' else 'Αριστερόχειρας' end);
  end if;

  v_ids := array(select u from unnest(v_ids || v_right.player_id) u order by md5(p_seed || 'o' || u::text));
  select jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender)
                   order by array_position(v_ids, p.id))
    into v_opts from core.players p where p.id = any (v_ids);
  return jsonb_build_object(
    'q', (case jsonb_array_length(v_clues) when 1 then 'Ένα στοιχείο, ' when 2 then 'Δύο στοιχεία, ' when 3 then 'Τρία στοιχεία, '
                                          else 'Τέσσερα στοιχεία, ' end)
         || case when p_gender = 'f' then 'μία παίκτρια.' else 'ένας παίκτης.' end,
    'clues', v_clues,
    'players', v_opts,
    'options', (select jsonb_agg(jsonb_build_object('label', '{p' || i || '}')) from generate_series(1, 3) i),
    'right', array_position(v_ids, v_right.player_id) - 1,
    'ids', to_jsonb(v_ids));
end;
$$;
