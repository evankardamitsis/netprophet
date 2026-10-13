-- M3 part 8: traits, «Πώς παίζει» on a player's profile and «Πώς σε βλέπουν» on Εγώ. Short phrases about how
-- someone plays, voted by people who have played them (a match with a result, as opponent or partner). The
-- profile shows the top six (with the approved list filling in while there are few votes) and lets you tap what
-- applies or add your own; your own phrase shows to everyone once staff approve it. Εγώ shows your top three; the
-- counts are Pro (free players see the order, the app blurs the numbers). Never on minors, never on your own
-- player, and who voted is never exposed. Traits still weigh 0 in the level algorithm.

-- ---------------------------------------------------------------------------
-- The starting list (label_el: {m, f})
-- ---------------------------------------------------------------------------
insert into core.trait_defs (sport_id, label_el, label_en, status) values
('tennis', '{"m": "Δυνατό σερβίς", "f": "Δυνατό σερβίς"}',                       'Strong serve',            'approved'),
('tennis', '{"m": "Δεν χάνει tie-break", "f": "Δεν χάνει tie-break"}',           'Never loses a tie-break', 'approved'),
('tennis', '{"m": "Αργεί να ζεσταθεί", "f": "Αργεί να ζεσταθεί"}',               'Slow to warm up',         'approved'),
('tennis', '{"m": "Fair play", "f": "Fair play"}',                               'Fair play',               'approved'),
('tennis', '{"m": "Φωνάζει στον εαυτό του", "f": "Φωνάζει στον εαυτό της"}',     'Talks to themselves',     'approved'),
('tennis', '{"m": "Κόβει πολύ την μπάλα", "f": "Κόβει πολύ την μπάλα"}',         'Lots of slice',           'approved'),
('tennis', '{"m": "Γρήγορα πόδια", "f": "Γρήγορα πόδια"}',                       'Quick feet',              'approved'),
('tennis', '{"m": "Σταθερό forehand", "f": "Σταθερό forehand"}',                 'Steady forehand',         'approved'),
('tennis', '{"m": "Ψυχραιμία στα κρίσιμα", "f": "Ψυχραιμία στα κρίσιμα"}',       'Cool on the big points',  'approved'),
('tennis', '{"m": "Καλό βολέ", "f": "Καλό βολέ"}',                               'Good volley',             'approved'),
('tennis', '{"m": "Μαχητής", "f": "Μαχήτρια"}',                                  'Fighter',                 'approved'),
('tennis', '{"m": "Παίζει έξυπνα", "f": "Παίζει έξυπνα"}',                       'Plays smart',             'approved');

create index trait_votes_player_idx on core.trait_votes (player_id, trait_id);

-- ---------------------------------------------------------------------------
-- Who may vote
-- ---------------------------------------------------------------------------
-- the voter's own player shared a match with a result with this player (either side)
create or replace function core.trait_can_vote(p_user uuid, p_player uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select exists (
    select 1
      from core.players me
      join core.match_participants a on a.player_id = me.id
      join core.match_participants b on b.match_id = a.match_id and b.player_id = p_player
      join core.matches m on m.id = a.match_id
     where me.claimed_by_user_id = p_user and me.id <> p_player and m.status <> 'void'
       and exists (select 1 from core.match_results r where r.match_id = m.id))
    and not exists (select 1 from core.players p where p.id = p_player and (p.is_minor or p.hidden or p.status <> 'active'))
$$;

-- ---------------------------------------------------------------------------
-- API
-- ---------------------------------------------------------------------------
-- «Πώς παίζει»: the top six for a player (counts), what I tapped, my phrases waiting for approval
create or replace function api.get_traits(p_player uuid)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_sport text;
  v_p     core.players;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_p from core.players where id = p_player;
  if v_p.id is null or v_p.is_minor or v_p.hidden then raise exception 'not_found' using errcode = 'P0002'; end if;
  select coalesce(primary_sport, 'tennis') into v_sport from core.profiles where user_id = v_uid;
  return jsonb_build_object(
    'player_id', p_player,
    'gender', v_p.gender,
    'is_me', v_p.claimed_by_user_id = v_uid,
    'can_vote', core.trait_can_vote(v_uid, p_player),
    'voters', (select count(distinct voter_user_id) from core.trait_votes where player_id = p_player),
    'traits', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'label_el', x.label_el, 'label_en', x.label_en,
                                          'count', x.n, 'mine', x.mine, 'pending', x.status = 'pending') order by x.ord)
        from (select t.id, t.label_el, t.label_en, t.status,
                     (select count(*) from core.trait_votes v where v.trait_id = t.id and v.player_id = p_player)::int as n,
                     exists (select 1 from core.trait_votes v where v.trait_id = t.id and v.player_id = p_player and v.voter_user_id = v_uid) as mine,
                     row_number() over (order by (select count(*) from core.trait_votes v where v.trait_id = t.id and v.player_id = p_player) desc,
                                                 t.created_at, t.id) as ord
                from core.trait_defs t
               where t.sport_id = v_sport and t.status = 'approved') x
       where x.ord <= 6), '[]'::jsonb)
      || coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'label_el', t.label_el, 'label_en', t.label_en,
                                          'count', null, 'mine', true, 'pending', true) order by t.created_at)
        from core.trait_defs t
       where t.status = 'pending' and t.created_by = v_uid
         and exists (select 1 from core.trait_votes v where v.trait_id = t.id and v.player_id = p_player)), '[]'::jsonb));
end;
$$;
revoke all on function api.get_traits(uuid) from public, anon;
grant execute on function api.get_traits(uuid) to authenticated, service_role;

-- tap a phrase on or off
create or replace function api.vote_trait(p_player uuid, p_trait uuid, p_on boolean default true)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  t     core.trait_defs;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not core.trait_can_vote(v_uid, p_player) then raise exception 'not_played' using errcode = '42501'; end if;
  select * into t from core.trait_defs where id = p_trait;
  if t.id is null or (t.status <> 'approved' and t.created_by is distinct from v_uid) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if coalesce(p_on, true) then
    insert into core.trait_votes (voter_user_id, player_id, sport_id, trait_id)
    values (v_uid, p_player, t.sport_id, p_trait) on conflict do nothing;
  else
    delete from core.trait_votes where voter_user_id = v_uid and player_id = p_player and trait_id = p_trait;
  end if;
  return api.get_traits(p_player);
end;
$$;
revoke all on function api.vote_trait(uuid, uuid, boolean) from public, anon;
grant execute on function api.vote_trait(uuid, uuid, boolean) to authenticated, service_role;

-- «+ Πρόσθεσε κάτι δικό σου»: a new phrase, counted for this player, shown once approved (three waiting at most)
create or replace function api.suggest_trait(p_player uuid, p_label text)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_label text := btrim(regexp_replace(coalesce(p_label, ''), '\s+', ' ', 'g'));
  v_sport text;
  v_id    uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not core.trait_can_vote(v_uid, p_player) then raise exception 'not_played' using errcode = '42501'; end if;
  if char_length(v_label) < 3 or char_length(v_label) > 40 then raise exception 'bad_label' using errcode = '22023'; end if;
  if (select count(*) from core.trait_defs where created_by = v_uid and status = 'pending') >= 3 then
    raise exception 'too_many_pending' using errcode = '54000';
  end if;
  select coalesce(primary_sport, 'tennis') into v_sport from core.profiles where user_id = v_uid;
  -- the same words as an approved phrase: just vote for it
  select id into v_id from core.trait_defs
   where sport_id = v_sport and status = 'approved'
     and (lower(label_el ->> 'm') = lower(v_label) or lower(label_el ->> 'f') = lower(v_label));
  if v_id is null then
    insert into core.trait_defs (sport_id, label_el, label_en, status, created_by)
    values (v_sport, jsonb_build_object('m', v_label, 'f', v_label), v_label, 'pending', v_uid)
    returning id into v_id;
  end if;
  insert into core.trait_votes (voter_user_id, player_id, sport_id, trait_id)
  values (v_uid, p_player, v_sport, v_id) on conflict do nothing;
  return api.get_traits(p_player);
end;
$$;
revoke all on function api.suggest_trait(uuid, text) from public, anon;
grant execute on function api.suggest_trait(uuid, text) to authenticated, service_role;

-- «Πώς σε βλέπουν»: my top three; the counts only with Pro
create or replace function api.get_my_traits()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me  uuid;
  v_pro boolean;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select id into v_me from core.players where claimed_by_user_id = v_uid;
  v_pro := core.is_pro(v_uid);
  return jsonb_build_object(
    'pro', v_pro,
    'gender', (select gender from core.players where id = v_me),
    'voters', (select count(distinct voter_user_id) from core.trait_votes where player_id = v_me),
    'traits', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'label_el', x.label_el, 'label_en', x.label_en,
                                          'count', case when v_pro then x.n end, 'share', round(x.n::numeric / x.top, 2)) order by x.n desc, x.id)
        from (select t.id, t.label_el, t.label_en, count(*)::int as n, max(count(*)) over ()::int as top
                from core.trait_votes v join core.trait_defs t on t.id = v.trait_id and t.status = 'approved'
               where v.player_id = v_me
               group by t.id, t.label_el, t.label_en
               order by count(*) desc, t.id limit 3) x), '[]'::jsonb));
end;
$$;
revoke all on function api.get_my_traits() from public, anon;
grant execute on function api.get_my_traits() to authenticated, service_role;

-- staff: approve a phrase (fixing the words, with a feminine form if needed) or drop it
create or replace function api.admin_decide_trait(p_trait uuid, p_approve boolean, p_label_m text default null,
                                                  p_label_f text default null, p_label_en text default null)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if not exists (select 1 from core.trait_defs where id = p_trait and status = 'pending') then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if p_approve then
    update core.trait_defs
       set status = 'approved',
           label_el = jsonb_build_object('m', coalesce(nullif(btrim(p_label_m), ''), label_el ->> 'm'),
                                         'f', coalesce(nullif(btrim(p_label_f), ''), nullif(btrim(p_label_m), ''), label_el ->> 'f')),
           label_en = coalesce(nullif(btrim(p_label_en), ''), label_en)
     where id = p_trait;
  else
    delete from core.trait_defs where id = p_trait;   -- its votes go with it
  end if;
  return jsonb_build_object('id', p_trait, 'approved', p_approve);
end;
$$;
revoke all on function api.admin_decide_trait(uuid, boolean, text, text, text) from public, anon;
grant execute on function api.admin_decide_trait(uuid, boolean, text, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Moderation: pending phrases join the queue (20261119 admin_moderation plus traits)
-- ---------------------------------------------------------------------------
create or replace function api.admin_moderation()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'disputes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
               'tournament', (select name from core.tournaments where id = m.tournament_id),
               'sides', core.match_sides_json(m.id),
               'winner_side', r.winner_side, 'score', r.score_summary,
               'reason', m.provenance -> 'disputed' ->> 'reason',
               'logged_by', (select jsonb_build_object('first_name', pr.first_name, 'surname', pr.surname)
                               from core.profiles pr where pr.user_id = m.logged_by),
               'answers', (select coalesce(jsonb_agg(jsonb_build_object(
                                    'player', p.first_name || ' ' || p.surname, 'side', mp.side,
                                    'state', c.state, 'via', c.via, 'fix', c.proposed_fix)), '[]'::jsonb)
                             from core.match_confirmations c
                             join core.players p on p.id = c.player_id
                             join core.match_participants mp on mp.match_id = c.match_id and mp.player_id = c.player_id
                            where c.match_id = m.id),
               'votes', (select count(*) from core.votes v where v.subject_type = 'match' and v.subject_id = m.id))
             order by m.starts_at desc)
        from core.matches m left join core.match_results r on r.match_id = m.id
       where m.status = 'disputed'), '[]'::jsonb),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
               'player_id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'source', p.source,
               'created_at', p.created_at, 'claimed', p.claimed_by_user_id is not null,
               'matches', (select count(*) from core.match_participants mp where mp.player_id = p.id),
               'similar', (select coalesce(jsonb_agg(jsonb_build_object('player_id', q.id, 'name', q.first_name || ' ' || q.surname,
                                                                        'claimed', q.claimed_by_user_id is not null)), '[]'::jsonb)
                             from (select o.* from core.players o
                                    where o.status = 'active' and o.id <> p.id
                                      and similarity(o.search_norm, p.search_norm) > 0.3
                                    order by similarity(o.search_norm, p.search_norm) desc limit 3) q))
             order by p.created_at)
        from core.players p
       where p.status = 'pending'), '[]'::jsonb),
    'tournaments', coalesce((
      select jsonb_agg(jsonb_build_object('text', x.text, 'matches', x.n, 'last', x.last) order by x.last desc)
        from (select m.provenance ->> 'tournament_suggestion' as text, count(*)::int as n, max(m.starts_at) as last
                from core.matches m
               where m.tournament_id is null and m.status <> 'void'
                 and m.provenance ? 'tournament_suggestion' and not m.provenance ? 'suggestion_done'
               group by 1) x), '[]'::jsonb),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'entity_type', r.entity_type, 'entity_id', r.entity_id, 'reason', r.reason, 'note', r.note,
               'created_at', r.created_at,
               'reporter', (select coalesce(pr.display_name, pr.first_name || ' ' || pr.surname) from core.profiles pr where pr.user_id = r.reporter_user_id),
               'what', case r.entity_type
                         when 'player' then (select jsonb_build_object('name', p.first_name || ' ' || p.surname, 'hidden', p.hidden)
                                               from core.players p where p.id = r.entity_id)
                         else (select jsonb_build_object('sides', core.match_sides_json(m.id), 'starts_at', m.starts_at,
                                                         'hidden', not m.approved, 'source', m.source)
                                 from core.matches m where m.id = r.entity_id) end,
               'reports', (select count(*) from core.reports o where o.entity_type = r.entity_type and o.entity_id = r.entity_id and o.status = 'open'))
             order by r.created_at)
        from core.reports r
       where r.status = 'open'), '[]'::jsonb),
    -- «Πώς παίζει»: what players added, waiting for a yes
    'traits', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'label_el', t.label_el, 'label_en', t.label_en, 'created_at', t.created_at,
               'by', (select coalesce(pr.display_name, pr.first_name || ' ' || pr.surname) from core.profiles pr where pr.user_id = t.created_by),
               'player', (select p.first_name || ' ' || p.surname from core.trait_votes v join core.players p on p.id = v.player_id
                           where v.trait_id = t.id order by v.created_at limit 1),
               'votes', (select count(*) from core.trait_votes v where v.trait_id = t.id))
             order by t.created_at)
        from core.trait_defs t
       where t.status = 'pending'), '[]'::jsonb));
end;
$$;
