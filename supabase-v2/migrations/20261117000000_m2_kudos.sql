-- M2 part 4: kudos and reactions (prototype V2).
--   «Πες μια καλή κουβέντα» after logging a played match: five picks from the prototype's pool, by the opponent's
--   gender, plural for doubles (doubles-only lines too). Αποτελέσματα: «Πες κάτι στον Νίκο ›» for an opponent you
--   have not thanked yet, or for someone you follow. Εγώ: «Τι λένε για σένα», the kudos your player received.
--   The good word left on an opponent link becomes a kudo when that person joins.
--   Reactions: two chips per result with counts, one pick per person per match. Which two is our rule (the
--   prototype only shows examples): a player-logged match gets Μπράβο / Ρεβάνς, a 2-0 gets Πάμε / Περίπατος,
--   anything else Τι ματς / Κρίμα.
--   Hidden players and minors get no kudos.

-- the prototype's pool replaces the first seed (kept, inactive: kudos reference it)
alter table core.kudos_options
  add column key          text unique,
  add column doubles_only boolean not null default false,
  add column sort         int not null default 0;
update core.kudos_options set active = false where key is null;

insert into core.kudos_options (key, forms, doubles_only, sort) values
('strong_serve',    '{"m": "Δυνατό σερβίς", "f": "Δυνατό σερβίς", "plural": "Δυνατό σερβίς"}', false, 1),
('tough_second',    '{"m": "Δύσκολο δεύτερο σερβίς", "f": "Δύσκολο δεύτερο σερβίς", "plural": "Δύσκολο δεύτερο σερβίς"}', false, 2),
('steady_serve',    '{"m": "Σταθερό σερβίς", "f": "Σταθερό σερβίς", "plural": "Σταθερό σερβίς"}', false, 3),
('great_returns',   '{"m": "Ωραίες επιστροφές", "f": "Ωραίες επιστροφές", "plural": "Ωραίες επιστροφές"}', false, 4),
('steady_forehand', '{"m": "Σταθερό forehand", "f": "Σταθερό forehand", "plural": "Σταθερό forehand"}', false, 5),
('great_backhand',  '{"m": "Φοβερό backhand", "f": "Φοβερό backhand", "plural": "Φοβερό backhand"}', false, 6),
('deep_balls',      '{"m": "Βαθιές μπάλες", "f": "Βαθιές μπάλες", "plural": "Βαθιές μπάλες"}', false, 7),
('nice_slice',      '{"m": "Ωραίο slice", "f": "Ωραίο slice", "plural": "Ωραίο slice"}', false, 8),
('heavy_topspin',   '{"m": "Βαρύ τοπ σπιν", "f": "Βαρύ τοπ σπιν", "plural": "Βαρύ τοπ σπιν"}', false, 9),
('nice_angles',     '{"m": "Ωραίες γωνίες", "f": "Ωραίες γωνίες", "plural": "Ωραίες γωνίες"}', false, 10),
('steady_baseline', '{"m": "Σταθερός στη baseline", "f": "Σταθερή στη baseline", "plural": "Σταθεροί στη baseline"}', false, 11),
('great_net',       '{"m": "Φοβερό φιλέ", "f": "Φοβερό φιλέ", "plural": "Φοβερό φιλέ"}', false, 12),
('nice_volleys',    '{"m": "Ωραία βολέ", "f": "Ωραία βολέ", "plural": "Ωραία βολέ"}', false, 13),
('cannon_smash',    '{"m": "Κανόνι smash", "f": "Κανόνι smash", "plural": "Κανόνι smash"}', false, 14),
('nice_lobs',       '{"m": "Ωραίες λόμπες", "f": "Ωραίες λόμπες", "plural": "Ωραίες λόμπες"}', false, 15),
('nice_drops',      '{"m": "Ωραία ντροπ", "f": "Ωραία ντροπ", "plural": "Ωραία ντροπ"}', false, 16),
('passing_shots',   '{"m": "Πάσινγκ που δεν πιανόταν", "f": "Πάσινγκ που δεν πιανόταν", "plural": "Πάσινγκ που δεν πιανόταν"}', false, 17),
('quick_feet',      '{"m": "Γρήγορα πόδια", "f": "Γρήγορα πόδια", "plural": "Γρήγορα πόδια"}', false, 18),
('got_everything',  '{"m": "Τα γύρναγε όλα", "f": "Τα γύρναγε όλα", "plural": "Τα γύρναγαν όλα"}', false, 19),
('stamina',         '{"m": "Φοβερή αντοχή", "f": "Φοβερή αντοχή", "plural": "Φοβερή αντοχή"}', false, 20),
('read_the_game',   '{"m": "Διάβαζε το παιχνίδι", "f": "Διάβαζε το παιχνίδι", "plural": "Διάβαζαν το παιχνίδι"}', false, 21),
('changed_pace',    '{"m": "Άλλαζε ρυθμό", "f": "Άλλαζε ρυθμό", "plural": "Άλλαζαν ρυθμό"}', false, 22),
('calm_clutch',     '{"m": "Ψυχραιμία στα κρίσιμα", "f": "Ψυχραιμία στα κρίσιμα", "plural": "Ψυχραιμία στα κρίσιμα"}', false, 23),
('never_quit',      '{"m": "Δεν τα παράτησε", "f": "Δεν τα παράτησε", "plural": "Δεν τα παράτησαν"}', false, 24),
('turned_it',       '{"m": "Γύρισε το ματς", "f": "Γύρισε το ματς", "plural": "Γύρισαν το ματς"}', false, 25),
('fair_calls',      '{"m": "Δίκαιος στα αμφιλεγόμενα", "f": "Δίκαιη στα αμφιλεγόμενα", "plural": "Δίκαιοι στα αμφιλεγόμενα"}', false, 26),
('good_vibes',      '{"m": "Ωραία διάθεση", "f": "Ωραία διάθεση", "plural": "Ωραία διάθεση"}', false, 27),
('courtesy',        '{"m": "Ευγένεια στο γήπεδο", "f": "Ευγένεια στο γήπεδο", "plural": "Ευγένεια στο γήπεδο"}', false, 28),
('applauded',       '{"m": "Χειροκρότησε τις καλές μπάλες", "f": "Χειροκρότησε τις καλές μπάλες", "plural": "Χειροκρότησαν τις καλές μπάλες"}', false, 29),
('no_moaning',      '{"m": "Χωρίς γκρίνια", "f": "Χωρίς γκρίνια", "plural": "Χωρίς γκρίνια"}', false, 30),
('on_time',         '{"m": "Ήρθε στην ώρα του", "f": "Ήρθε στην ώρα της", "plural": "Ήρθαν στην ώρα τους"}', false, 31),
('chemistry',       '{"m": "Ωραία χημεία", "f": "Ωραία χημεία", "plural": "Ωραία χημεία"}', true, 32),
('covered_court',   '{"m": "Κάλυπταν όλο το γήπεδο", "f": "Κάλυπταν όλο το γήπεδο", "plural": "Κάλυπταν όλο το γήπεδο"}', true, 33),
('strong_duo',      '{"m": "Δυνατό δίδυμο", "f": "Δυνατό δίδυμο", "plural": "Δυνατό δίδυμο"}', true, 34),
('rematch',         '{"m": "Πάμε για ρεβάνς", "f": "Πάμε για ρεβάνς", "plural": "Πάμε για ρεβάνς"}', false, 35)
on conflict (key) do nothing;

-- one kudo per opponent: a doubles kudo reaches both
do $$
declare v_name text;
begin
  select conname into v_name from pg_constraint
   where conrelid = 'core.kudos'::regclass and contype = 'u'
     and pg_get_constraintdef(oid) = 'UNIQUE (from_user_id, match_id)';
  if v_name is not null then execute format('alter table core.kudos drop constraint %I', v_name); end if;
end $$;
alter table core.kudos add constraint kudos_from_match_to_key unique (from_user_id, match_id, to_player_id);
create index kudos_to_player_idx on core.kudos (to_player_id);

-- the prototype's reactions (the first seed stays, inactive)
update core.reaction_pool set active = false where key in ('deserved', 'close_one', 'big_upset', 'clean_win', 'comeback');
update core.reaction_pool set label_el = 'Τι ματς', label_en = 'What a match' where key = 'what_a_match';
insert into core.reaction_pool (key, label_el, label_en) values
('pity',    'Κρίμα',     'Shame'),
('bravo',   'Μπράβο',    'Well played'),
('rematch', 'Ρεβάνς',    'Rematch'),
('lets_go', 'Πάμε',      'Let''s go'),
('stroll',  'Περίπατος', 'Walk in the park')
on conflict (key) do nothing;

-- the two chips a result shows
create or replace function core.reaction_pair(p_match uuid)
returns text[]
language sql stable set search_path = core, pg_temp
as $$
  select case when m.source = 'user' then array['bravo', 'rematch']
              when split_part(coalesce(r.score_summary, ''), '-', 2) = '0' then array['lets_go', 'stroll']
              else array['what_a_match', 'pity'] end
    from core.matches m left join core.match_results r on r.match_id = m.id
   where m.id = p_match
$$;

create or replace function core.reactions_json(p_match uuid, p_uid uuid)
returns jsonb
language sql stable set search_path = core, pg_temp
as $$
  select jsonb_build_object(
    'options', (select jsonb_agg(jsonb_build_object('key', rp.key, 'label', rp.label_el)
                                 order by array_position(core.reaction_pair(p_match), rp.key))
                  from core.reaction_pool rp where rp.key = any (core.reaction_pair(p_match))),
    'counts', coalesce((select jsonb_object_agg(x.reaction_key, x.n)
                          from (select reaction_key, count(*)::int as n from core.reactions
                                 where match_id = p_match group by reaction_key) x), '{}'::jsonb),
    'mine', (select reaction_key from core.reactions where match_id = p_match and user_id = p_uid))
$$;

-- who the viewer can thank on this match: an opponent if they played it, else someone they follow who did
create or replace function core.kudo_target(p_uid uuid, p_match uuid)
returns jsonb
language plpgsql stable set search_path = core, pg_temp
as $$
declare
  v_me   uuid;
  v_side smallint;
  v_out  jsonb;
begin
  select claimed_player_id into v_me from core.profiles where user_id = p_uid;
  select side into v_side from core.match_participants where match_id = p_match and player_id = v_me;
  select jsonb_build_object('player_id', p.id, 'first_name', p.first_name, 'gender', p.gender) into v_out
    from core.match_participants mp
    join core.players p on p.id = mp.player_id
   where mp.match_id = p_match and not p.hidden and not p.is_minor and p.id is distinct from v_me
     and case when v_side is not null then mp.side <> v_side
              else exists (select 1 from core.follows f where f.user_id = p_uid and f.player_id = p.id) end
     and not exists (select 1 from core.kudos k where k.from_user_id = p_uid and k.match_id = p_match and k.to_player_id = p.id)
   order by mp.side, mp.position
   limit 1;
  return v_out;
end;
$$;

-- five lines to choose from; doubles-only lines only when the whole other side is thanked in doubles
create or replace function api.kudos_options(p_match_id uuid, p_to_player uuid default null)
returns jsonb
language plpgsql volatile security definer set search_path = core, extensions, pg_temp
as $$
declare v_doubles boolean;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select format <> 'singles' into v_doubles from core.matches where id = p_match_id;
  if v_doubles is null then raise exception 'match_not_found' using errcode = 'P0002'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('key', o.key, 'forms', o.forms))
      from (select key, forms from core.kudos_options
             where active and key is not null and (not doubles_only or (v_doubles and p_to_player is null))
             order by random() limit 5) o), '[]'::jsonb);
end;
$$;

-- p_to_player null: every opponent (the player's own match). A spectator thanks one player they follow.
create or replace function api.give_kudo(p_match_id uuid, p_option_key text, p_to_player uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_me     uuid;
  v_side   smallint;
  v_option uuid;
  v_n      int := 0;
  r        record;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select id into v_option from core.kudos_options where key = p_option_key and active;
  if v_option is null then raise exception 'bad_kudo' using errcode = '22023'; end if;
  if not exists (select 1 from core.matches m join core.match_results mr on mr.match_id = m.id
                  where m.id = p_match_id and m.status not in ('void', 'disputed')) then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;
  select claimed_player_id into v_me from core.profiles where user_id = v_uid;
  select side into v_side from core.match_participants where match_id = p_match_id and player_id = v_me;
  if v_side is null and p_to_player is null then raise exception 'not_your_match' using errcode = '42501'; end if;

  for r in
    select p.id, p.claimed_by_user_id
      from core.match_participants mp
      join core.players p on p.id = mp.player_id
     where mp.match_id = p_match_id and p.id is distinct from v_me
       and (p_to_player is null or p.id = p_to_player)
       and (v_side is null or mp.side <> v_side)
       and (v_side is not null or exists (select 1 from core.follows f where f.user_id = v_uid and f.player_id = p.id))
       and not p.hidden and not p.is_minor
  loop
    insert into core.kudos (from_user_id, to_player_id, match_id, option_id)
    values (v_uid, r.id, p_match_id, v_option)
    on conflict (from_user_id, match_id, to_player_id) do nothing;
    if found then
      v_n := v_n + 1;
      if r.claimed_by_user_id is not null then
        insert into core.notifications (user_id, type, payload, channel, dedupe_key)
        values (r.claimed_by_user_id, 'kudos', jsonb_build_object('match_id', p_match_id, 'option', p_option_key),
                'in_app', 'kudos:' || p_match_id || ':' || v_uid || ':' || r.id)
        on conflict (dedupe_key) do nothing;
      end if;
    end if;
  end loop;
  if v_n = 0 and not exists (select 1 from core.kudos where from_user_id = v_uid and match_id = p_match_id
                              and (p_to_player is null or to_player_id = p_to_player)) then
    raise exception 'nobody_to_thank' using errcode = '42501';
  end if;
  return jsonb_build_object('match_id', p_match_id, 'given', v_n);
end;
$$;

-- one reaction per person per match; null takes it back
create or replace function api.react(p_match_id uuid, p_key text)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from core.matches m join core.match_results r on r.match_id = m.id
                  where m.id = p_match_id and m.approved and m.status <> 'void') then
    raise exception 'match_not_found' using errcode = 'P0002';
  end if;
  if p_key is null then
    delete from core.reactions where user_id = v_uid and match_id = p_match_id;
  else
    if not (p_key = any (core.reaction_pair(p_match_id))) then raise exception 'bad_reaction' using errcode = '22023'; end if;
    insert into core.reactions (user_id, match_id, reaction_key) values (v_uid, p_match_id, p_key)
    on conflict (user_id, match_id) do update set reaction_key = excluded.reaction_key, created_at = now();
  end if;
  return core.reactions_json(p_match_id, v_uid);
end;
$$;

-- «Τι λένε για σένα»: what the viewer's player was told, most first (the app picks the gendered form)
create or replace function api.get_my_kudos()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me  uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select claimed_player_id into v_me from core.profiles where user_id = v_uid;
  if v_me is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('key', x.key, 'forms', x.forms, 'doubles_only', x.doubles_only, 'n', x.n)
                     order by x.n desc, x.sort)
      from (select o.key, o.forms, o.doubles_only, o.sort, count(*)::int as n
              from core.kudos k join core.kudos_options o on o.id = k.option_id
             where k.to_player_id = v_me and o.key is not null
             group by o.key, o.forms, o.doubles_only, o.sort) x), '[]'::jsonb);
end;
$$;

-- Αποτελέσματα gains the reactions and «Πες κάτι στον …»
create or replace function api.get_results(p_days int default 14, p_limit int default 60)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_days  int := least(greatest(coalesce(p_days, 14), 1), 90);
  v_limit int := least(greatest(coalesce(p_limit, 60), 1), 200);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  return coalesce((
    select jsonb_agg(row_to_json(d)::jsonb order by d.starts_at desc, d.match_id)
      from (
        select m.id as match_id, m.sport_id, m.format, m.starts_at, m.round, m.venue, m.area_id,
               t.name as tournament,
               core.match_sides_json(m.id) as sides,
               r.winner_side, r.sets, r.score_summary, r.retired, r.walkover,
               case when s.total > 0 then jsonb_build_object('side1', s.side1, 'side2', s.side2, 'total', s.total) end
                 as split,
               core.is_upset(case r.winner_side when 1 then s.side1 else s.side2 end, s.total, core.sport_rules(m.sport_id))
                 as upset,
               case when v.option is not null then
                 jsonb_build_object('pick', v.option, 'outcome', v.outcome, 'points', v.points) end as my,
               core.reactions_json(m.id, v_uid) as reactions,
               case when m.status <> 'disputed' then core.kudo_target(v_uid, m.id) end as kudo_to
          from core.matches m
          join core.match_results r on r.match_id = m.id
          left join core.tournaments t on t.id = m.tournament_id
          cross join lateral (
            select count(*)::int as total,
                   count(*) filter (where vv.option = 1)::int as side1,
                   count(*) filter (where vv.option = 2)::int as side2
              from core.votes vv
             where vv.subject_type = 'match' and vv.subject_id = m.id
          ) s
          left join core.votes v on v.subject_type = 'match' and v.subject_id = m.id and v.user_id = v_uid
         where m.approved
           and m.status <> 'void'
           and m.starts_at is not null
           and m.starts_at >= now() - make_interval(days => v_days)
         order by m.starts_at desc
         limit v_limit
      ) d), '[]'::jsonb);
end;
$$;

-- «Κράτα το ματς στο προφίλ σου» now also turns the link's good word into a kudo for the logger
create or replace function api.claim_via_link(p_token text)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_l      core.match_links;
  v_pr     core.profiles;
  v_pl     core.players;
  v_logger uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  v_l := core.link_by_token(p_token);
  perform pg_advisory_xact_lock(hashtextextended('user:' || v_uid::text, 0));
  select * into v_pr from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  select * into v_pl from core.players where id = v_l.player_id for update;
  if v_pr.claimed_player_id = v_pl.id then
    return jsonb_build_object('player_id', v_pl.id, 'claimed', true, 'replayed', true);
  end if;
  if v_pr.claimed_player_id is not null then
    raise exception 'already_claimed_other' using errcode = '23505';
  end if;
  if v_pl.claimed_by_user_id is not null or v_pl.status = 'merged' then
    raise exception 'player_already_claimed' using errcode = '23505';
  end if;
  update core.players set claimed_by_user_id = v_uid, status = 'active', hidden = false where id = v_pl.id;   -- trigger syncs the profile
  update core.match_links set claimed_at = now() where id = v_l.id;

  if v_l.kudo is not null then
    select pr.claimed_player_id into v_logger
      from core.matches m join core.profiles pr on pr.user_id = m.logged_by where m.id = v_l.match_id;
    if v_logger is not null then
      insert into core.kudos (from_user_id, to_player_id, match_id, option_id)
      select v_uid, v_logger, v_l.match_id, o.id
        from core.kudos_options o
       where o.key = case v_l.kudo when 'serve' then 'strong_serve' when 'backhand' then 'great_backhand'
                                   when 'calm' then 'calm_clutch' when 'feet' then 'quick_feet'
                                   when 'fair_play' then 'fair_calls' when 'company' then 'good_vibes' end
      on conflict (from_user_id, match_id, to_player_id) do nothing;
    end if;
  end if;
  return jsonb_build_object('player_id', v_pl.id, 'claimed', true, 'replayed', false);
end;
$$;

revoke all on function core.kudo_target(uuid, uuid) from public;
revoke all on function api.kudos_options(uuid, uuid) from public, anon;
revoke all on function api.give_kudo(uuid, text, uuid) from public, anon;
revoke all on function api.react(uuid, text) from public, anon;
revoke all on function api.get_my_kudos() from public, anon;
grant execute on function api.kudos_options(uuid, uuid) to authenticated, service_role;
grant execute on function api.give_kudo(uuid, text, uuid) to authenticated, service_role;
grant execute on function api.react(uuid, text) to authenticated, service_role;
grant execute on function api.get_my_kudos() to authenticated, service_role;
