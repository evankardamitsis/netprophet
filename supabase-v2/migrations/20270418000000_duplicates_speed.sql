-- «Διπλοί παίκτες» stopped loading (11 Nov 2026): core.duplicate_candidates took 23s and the admin's calls end at 8s.
-- The planner joined every active roster row with every other one (2,360 x 2,360, about 4.4 million pairs) before it
-- kept the ~200 candidate pairs. The candidates are now fixed first and only their two rows are looked up: about 1s.
-- Same rules, same pairs: the live result was compared before and after (188 pairs, identical).

CREATE OR REPLACE FUNCTION core.duplicate_candidates()
 RETURNS TABLE(a uuid, b uuid, keep_id uuid, drop_id uuid, confidence text, evidence jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'core', 'extensions', 'pg_temp'
AS $function$
  with p as materialized (
    select pl.id, pl.first_name, pl.surname, pl.status, pl.is_minor, pl.hidden, pl.birth_year, pl.created_at,
           pl.claimed_by_user_id is not null as claimed,
           core.name_key(pl.surname || ' ' || pl.first_name) as k1,
           core.name_key(pl.first_name || ' ' || pl.surname) as k2,
           core.name_sound(core.name_key(pl.surname)) as ss,
           coalesce(pl.gender, core.first_gender(pl.first_name)) as g,
           btrim(pl.first_name) = '' as no_first,
           core.name_sound(split_part(core.name_key(pl.first_name), ' ', 1)) as fw,
           (select count(*)::int from core.match_participants mp where mp.player_id = pl.id) as n
      from core.players pl
     where pl.status in ('active', 'pending')
       -- «είμαι καινούριος» requests are decided on moderation, which already shows «πιθανό ίδιο με …»
       and not exists (select 1 from core.claim_requests q where q.player_id = pl.id and q.via = 'new' and q.status = 'pending')),
  seen as materialized (
    select mp.player_id as id, m.tournament_id as t, null::text as tab
      from core.match_participants mp join core.matches m on m.id = mp.match_id where m.tournament_id is not null
    union
    select (pp ->> 'player_id')::uuid, d.tournament_id, d.tab
      from core.tournament_draws d, jsonb_array_elements(coalesce(d.draw -> 'entrants', '[]'::jsonb)) e,
           jsonb_array_elements(coalesce(e -> 'players', '[]'::jsonb)) pp
     where pp ->> 'player_id' is not null),
  raw_pairs as materialized (
    select x.id as a, y.id as b from p x join p y on y.ss = x.ss and x.id < y.id
     where x.ss <> ''
       and (x.k1 = y.k1 or core.name_sound(x.k1) = core.name_sound(y.k1)
            or core.same_named_person(x.surname || ' ' || x.first_name, y.surname, y.first_name))
    union
    select least(x.id, y.id), greatest(x.id, y.id) from p x join p y on y.k2 = x.k1 and x.id <> y.id where x.k1 <> x.k2),
  -- the first side looked up for the candidate pairs only (about 200): without this step the planner paired every row
  -- with every row (millions) before narrowing to the candidates, and the page went past the 8s limit
  rx as materialized (select r.a, r.b, x as xr from raw_pairs r join p x on x.id = r.a),
  pairs as (
    select r.a, r.b, x.n as an, y.n as bn, x.claimed as ac, y.claimed as bc,
           x.is_minor = y.is_minor and x.hidden = y.hidden as same_flags,
           -- a row nothing hangs on: no match, no account, not hidden, not a minor
           x.n = 0 and not x.claimed and not x.hidden and not x.is_minor as a_empty,
           y.n = 0 and not y.claimed and not y.hidden and not y.is_minor as b_empty,
           least(length(x.fw), length(y.fw)) as short,
           case when x.k1 = y.k1 or x.k1 = y.k2 then 'exact'
                when core.name_sound(x.k1) in (core.name_sound(y.k1), core.name_sound(y.k2)) then 'sound'
                else 'prefix' end as key,
           (select coalesce(jsonb_agg(distinct t.name), '[]'::jsonb) from core.tournaments t
             where t.id in (select s1.t from seen s1 join seen s2 on s2.t = s1.t where s1.id = r.a and s2.id = r.b)) as shared
      from rx r cross join lateral (select (r.xr).*) x join p y on y.id = r.b
     where core.gender_fits(x.g, y.g)
       and not (x.claimed and y.claimed)
       and (x.birth_year is null or y.birth_year is null or abs(x.birth_year - y.birth_year) <= 1)
       and not exists (select 1 from core.match_participants m1 join core.match_participants m2 on m2.match_id = m1.match_id
                        where m1.player_id = r.a and m2.player_id = r.b)
       -- two entries in one draw are two people
       and not exists (select 1 from seen s1 join seen s2 on s2.t = s1.t and s2.tab = s1.tab where s1.id = r.a and s2.id = r.b)
       and not exists (select 1 from core.duplicate_dismissals dd where dd.a = r.a and dd.b = r.b)),
  kept as (
    select pr.* from pairs pr
     -- a first name that only fits needs the same tournament, or a row with nothing in it, to be worth a look
     where pr.key <> 'prefix' or jsonb_array_length(pr.shared) > 0 or least(pr.an, pr.bn) = 0),
  deg as (select z.id, count(*)::int as pairs from (select k.a as id from kept k union all select k.b from kept k) z group by z.id),
  judged as (
    select k.a, k.b, k.key, k.shared, k.an, k.bn, k.ac, k.bc,
           case
             -- the same name, and one of the two rows has no match and no account: nothing can be lost
             when k.key = 'exact' and k.same_flags and ((k.an = 0 and not k.ac) or (k.bn = 0 and not k.bc)) then 'sure'
             -- what the import now links by itself: an empty row from a draw and the one player of that tournament its
             -- name fits, with at least three letters of first name (an initial is not enough)
             when k.key <> 'exact' and jsonb_array_length(k.shared) > 0 and k.short >= 3
                  and ((k.a_empty and da.pairs = 1) or (k.b_empty and db.pairs = 1)) then 'sure'
             else 'likely' end as confidence
      from kept k join deg da on da.id = k.a join deg db on db.id = k.b)
  select j.a, j.b, s.keep, case when s.keep = j.a then j.b else j.a end, j.confidence,
         jsonb_build_object('key', j.key, 'shared_tournaments', j.shared, 'matches', jsonb_build_array(j.an, j.bn),
                            'claimed', jsonb_build_array(j.ac, j.bc))
    from judged j, lateral (select core.merge_survivor(j.a, j.b) as keep) s
$function$;
