-- Names: a proposal is «ready» only when no word of it is still in capitals. Words the dictionary leaves as they are
-- (Latin capitals «VOLGKO», a Greek word written with a Latin letter) gave «Έρρικος ΒΑΣΙΛΕΙΟΥ» in the sure list;
-- those now wait under «Check these».

create or replace function core.name_proposals()
returns table (player_id uuid, first_name text, surname text, proposed_first text, proposed_surname text,
               confidence text, claimed boolean)
language sql stable set search_path = core, pg_temp
as $$
  select p.id, p.first_name, p.surname, f.spelling, s.spelling,
         case when f.spelling is null or s.spelling is null then 'missing'
              when f.spelling ~ '[Α-ΩA-Z]{2}' or s.spelling ~ '[Α-ΩA-Z]{2}' then 'review'   -- a word still in capitals
              when f.confidence = 'high' and s.confidence = 'high' then 'high' else 'review' end,
         p.claimed_by_user_id is not null
    from core.players p
    cross join lateral core.name_spell('first', p.first_name) f
    cross join lateral core.name_spell('surname', p.surname) s
   where p.status <> 'merged'
     and (core.name_is_caps(p.first_name) or core.name_is_caps(p.surname)
          or p.first_name ~ '(^|[ -])[Α-Ω]{2,}($|[ -])' or p.surname ~ '(^|[ -])[Α-Ω]{2,}($|[ -])')
$$;
