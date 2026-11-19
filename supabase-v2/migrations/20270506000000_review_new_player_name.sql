-- «New player» on a review card can carry the name staff know (founder, 19 Nov 2026: "i know the player, i need to
-- add them with their first name"). A decision {new: true, first, surname} creates the player with that name; empty
-- fields fall back to the sheet's spelling, as before. api.admin_resolve_ingest_review as in
-- 20270421000000_review_held_place.sql, the change marked.

create or replace function api.admin_resolve_ingest_review(p_id uuid, p jsonb)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v    core.ingest_reviews;
  v_row jsonb;
  v_s  int;
  v_i  int;
  v_pp jsonb;
  v_d  jsonb;
  v_out jsonb := '{}'::jsonb;
  v_o   core.ingest_reviews;
  v_freed int := 0;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v from core.ingest_reviews where id = p_id and status = 'open' for update;
  if not found then raise exception 'review_not_found' using errcode = 'P0002'; end if;

  if coalesce((p ->> 'dismiss')::boolean, false) then
    update core.ingest_reviews set status = 'dismissed', resolved_by = auth.uid(), resolved_at = now(), updated_at = now() where id = p_id;
    return jsonb_build_object('dismissed', true);
  end if;

  if v.kind = 'people' then
    v_row := v.payload -> 'row';
    for v_s in 1..2 loop
      for v_i in 0 .. jsonb_array_length(v_row -> ('side' || v_s)) - 1 loop
        v_pp := v_row -> ('side' || v_s) -> v_i;
        -- a decision names its place on the card (side:index) when one spelling is two people, else its spelling
        select d into v_d from jsonb_array_elements(p -> 'decisions') d
         where d ->> 'slot' = v_s || ':' || v_i or (not d ? 'slot' and d ->> 'raw' = v_pp ->> 'raw')
         order by (d ? 'slot') desc limit 1;
        if v_d is not null then
          v_row := jsonb_set(v_row, array['side' || v_s, v_i::text],
                     case when coalesce((v_d ->> 'new')::boolean, false)
                          then jsonb_build_object('new', jsonb_build_object(
                            -- CHANGED (20270506000000): staff may type the person's name when they know it
                            'surname', coalesce(nullif(btrim(v_d ->> 'surname'), ''), v_pp ->> 'surname'),
                            'first', coalesce(nullif(btrim(v_d ->> 'first'), ''), v_pp ->> 'first')), 'raw', v_pp ->> 'raw')
                          else jsonb_build_object('player_id', v_d ->> 'player_id', 'raw', v_pp ->> 'raw') end);
        end if;
        v_d := null;
      end loop;
    end loop;
    -- the people the run was sure about: the same rules again (an alias or a certain match links, else new);
    -- an unclear one staff did not decide is an error (in its place when the hold names one)
    for v_s in 1..2 loop
      for v_i in 0 .. jsonb_array_length(v_row -> ('side' || v_s)) - 1 loop
        v_pp := v_row -> ('side' || v_s) -> v_i;
        if not (v_pp ? 'player_id' or v_pp ? 'new') then
          if exists (select 1 from jsonb_array_elements(v.payload -> 'unclear') u
                      where u ->> 'raw' = v_pp ->> 'raw' and (not u ? 'slot' or u ->> 'slot' = v_s || ':' || v_i)) then
            raise exception 'person_undecided' using errcode = '22023', detail = coalesce(v_pp ->> 'raw', '');
          end if;
          v_d := core.ingest_person(v_pp, v.tournament_id);
          v_row := jsonb_set(v_row, array['side' || v_s, v_i::text],
                     case when v_d ->> 'how' in ('alias', 'match', 'tournament', 'surname')
                          then jsonb_build_object('player_id', v_d ->> 'player_id', 'raw', v_pp ->> 'raw')
                          else jsonb_build_object('new', jsonb_build_object('surname', v_pp ->> 'surname', 'first', v_pp ->> 'first'), 'raw', v_pp ->> 'raw') end);
        end if;
      end loop;
    end loop;
    -- one player twice on one match is never saved: say so instead of the database's duplicate key
    select to_jsonb(x ->> 'raw') into v_pp
      from jsonb_array_elements((v_row -> 'side1') || (v_row -> 'side2')) x
     where x ? 'player_id'
       and (select count(*) from jsonb_array_elements((v_row -> 'side1') || (v_row -> 'side2')) y where y ->> 'player_id' = x ->> 'player_id') > 1
     limit 1;
    if v_pp is not null then
      raise exception 'same_player_twice' using errcode = '22023', detail = v_pp #>> '{}';
    end if;
    v_out := core.ingest_apply(v.tournament_id, jsonb_build_array(v_row), auth.uid(), v.run_id);
  elsif v.kind = 'walkover' then
    if (p ->> 'winner_side') not in ('1', '2') then raise exception 'winner_required' using errcode = '22023'; end if;
    perform core.set_result(v.match_id, (p ->> 'winner_side')::int, '[]'::jsonb, null, null, false, true, auth.uid());
    v_out := jsonb_build_object('results', 1);
  end if;

  update core.ingest_reviews set status = 'done', resolved_by = auth.uid(), resolved_at = now(), updated_at = now() where id = p_id;

  -- a decision writes the sheet's spelling as an alias: other rows held only for names now known go in too
  if v.kind = 'people' then
    for v_o in select * from core.ingest_reviews o
                where o.tournament_id = v.tournament_id and o.kind = 'people' and o.status = 'open'
                  and not exists (select 1 from jsonb_array_elements(o.payload -> 'unclear') u
                                   where not exists (select 1 from core.player_aliases a
                                                      where a.alias_norm = core.normalize_search(btrim(coalesce(u ->> 'raw', ''))))) loop
      perform core.ingest_apply(v_o.tournament_id, jsonb_build_array(v_o.payload -> 'row'), auth.uid(), v_o.run_id);
      update core.ingest_reviews set status = 'done', resolved_by = auth.uid(), resolved_at = now(), updated_at = now()
       where id = v_o.id and status = 'open'
         and exists (select 1 from core.matches m where m.source = 'import' and m.source_ref = v_o.fingerprint);
      if found then v_freed := v_freed + 1; end if;
    end loop;
  end if;
  return v_out || jsonb_build_object('also_released', v_freed);
end;
$$;
