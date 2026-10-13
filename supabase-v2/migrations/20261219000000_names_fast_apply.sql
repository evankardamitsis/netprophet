-- Names: «Fix all» timed out for the founder (1,269 names took 8 s, the signed-in limit). Marking the used words as
-- approved compared every dictionary word with every name (millions of regex splits); the words are now collected
-- once and matched by key.

create or replace function api.admin_apply_names(p_player_ids uuid[] default null, p_confidence text default 'high')
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare v_n int;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_player_ids is null and p_confidence is distinct from 'high' then
    raise exception 'pick_players' using errcode = '22023';   -- review rows are approved one by one or in a picked set
  end if;
  create temp table np_apply on commit drop as
  select * from core.name_proposals() x
   where x.confidence in ('high', 'review')
     and (p_player_ids is null and x.confidence = 'high' or x.player_id = any (p_player_ids))
     and core.name_caps_key(x.proposed_first) = core.name_caps_key(x.first_name)
     and core.name_caps_key(x.proposed_surname) = core.name_caps_key(x.surname);
  update core.players p set first_name = a.proposed_first, surname = a.proposed_surname, updated_at = now()
    from np_apply a where p.id = a.player_id;
  get diagnostics v_n = row_count;
  -- the words those names used become approved (collected once: one lookup per word, not per word and name)
  update core.name_spellings ns set approved = true
    from (select distinct 'first' as kind, w from np_apply, unnest(regexp_split_to_array(core.name_caps_key(first_name), '[ -]+')) w
          union
          select distinct 'surname', w from np_apply, unnest(regexp_split_to_array(core.name_caps_key(surname), '[ -]+')) w) x
   where ns.kind = x.kind and ns.caps_key = x.w and not ns.approved;
  drop table np_apply;
  return jsonb_build_object('applied', v_n);
end;
$$;
