-- A retired match can stop at any score (founder, 17 Oct 2026: "Set 2 can't be a draw" was refused in admin Results;
-- "if ret all results are possible"). check_match_result is the M2 one with an early branch for retired results:
-- sets only have to be game counts from 0 to 99, a level set is fine, and the summary counts the sets each side led.

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

    -- sets only, no games (player-logged): the winner reached the majority, the loser did not
    if v_n = 0 and new.sets_won is not null then
      if new.sets_lost is null or new.sets_won < v_need or new.sets_lost >= v_need or new.sets_won + new.sets_lost > v_best then
        raise exception 'result_incoherent: % - % is not a finished best of %', new.sets_won, new.sets_lost, v_best;
      end if;
      new.score_summary := new.sets_won || '-' || new.sets_lost;
      return new;
    end if;

    if v_n > v_best then raise exception 'result_incoherent: more than % sets', v_best; end if;

    -- a retirement can stop at any score (founder, 17 Oct: "if ret all results are possible"): the sets only have to
    -- be game counts; who won is what staff chose
    if new.retired then
      for v_i in 0..v_n - 1 loop
        v_set := new.sets -> v_i;
        if jsonb_typeof(v_set) <> 'object' or jsonb_typeof(v_set -> 'w') <> 'number' or jsonb_typeof(v_set -> 'l') <> 'number' then
          raise exception 'result_incoherent: set % must be {"w":int,"l":int}', v_i + 1;
        end if;
        if (v_set ->> 'w')::int not between 0 and 99 or (v_set ->> 'l')::int not between 0 and 99 then
          raise exception 'result_incoherent: set % has an impossible score', v_i + 1;
        end if;
        if (v_set ->> 'w')::int > (v_set ->> 'l')::int then v_ws := v_ws + 1;
        elsif (v_set ->> 'l')::int > (v_set ->> 'w')::int then v_ls := v_ls + 1; end if;
      end loop;
      new.score_summary := case when v_n = 0 then null else v_ws || '-' || v_ls end;
      return new;
    end if;

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
