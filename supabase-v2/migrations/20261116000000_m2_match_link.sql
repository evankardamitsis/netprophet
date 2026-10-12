-- M2 part 3: the opponent link /m/<token>, for people not in the app (members confirm in the feed).
-- From the prototype (isOpv): the match and «Έγινε έτσι;» → «Έτσι έγινε» / «Όχι ακριβώς» («Πώς έληξε;», «Δεν έπαιξα εγώ»),
-- a good word back, then «Κράτα το ματς στο προφίλ σου» (join and claim). «Κρύψε με από το NetProphet» on every link.
--   One link per unclaimed opponent, open at least 7 days. Only a hash of the token is kept, so a resend rotates it.
--   Anyone holding the link can answer for that opponent, hide or show them, and claim them after signing in.
--   A wrong, expired or unknown token is one error (link_not_found), so a lookup never tells which.
--   The good word is kept on the link for now; kudos proper are M2 part 4.

alter table core.match_links
  add column player_id   uuid not null references core.players (id) on delete cascade,
  add column kudo        text check (kudo in ('serve', 'backhand', 'calm', 'feet', 'fair_play', 'company')),
  add column answered_at timestamptz;
create unique index match_links_match_player_idx on core.match_links (match_id, player_id);

create or replace function core.link_hash(p_token text)
returns text language sql immutable set search_path = pg_catalog
as $$ select encode(sha256(convert_to(p_token, 'UTF8')), 'hex') $$;

-- 12 random bytes (the random parts of two v4 uuids), url-safe base64: 16 characters
create or replace function core.new_link_token()
returns text language sql volatile set search_path = pg_catalog
as $$
  select translate(encode(substring(uuid_send(gen_random_uuid()) from 1 for 6)
                          || substring(uuid_send(gen_random_uuid()) from 11 for 6), 'base64'), '+/', '-_')
$$;

create or replace function core.link_by_token(p_token text)
returns core.match_links
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare v_l core.match_links;
begin
  select * into v_l from core.match_links
   where token_hash = core.link_hash(coalesce(p_token, '')) and expires_at > now();
  if not found then raise exception 'link_not_found' using errcode = 'P0002'; end if;
  return v_l;
end;
$$;
revoke all on function core.link_by_token(text) from public;

-- the answer itself, shared by the feed (api.answer_confirmation) and the link (api.answer_link)
create or replace function core.answer_confirmation(p_match_id uuid, p_player uuid, p_answer text, p_fix jsonb, p_via text)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_side    smallint;
  v_m       core.matches;
  v_r       core.match_results;
  v_winner  smallint;
  v_lost    int;
  v_outcome text;
begin
  if p_answer not in ('yes', 'fix', 'not_me') then raise exception 'bad_answer' using errcode = '22023'; end if;
  if not exists (select 1 from core.match_confirmations
                  where match_id = p_match_id and player_id = p_player and state = 'pending') then
    raise exception 'nothing_to_confirm' using errcode = 'P0002';
  end if;
  select * into v_m from core.matches where id = p_match_id for update;
  select * into v_r from core.match_results where match_id = p_match_id;
  select side into v_side from core.match_participants where match_id = p_match_id and player_id = p_player;

  if p_answer = 'yes' then
    update core.match_confirmations set state = 'confirmed', via = p_via, at = now()
     where match_id = p_match_id and player_id = p_player;
    update core.matches set counts_for_levels = true where id = p_match_id and status = 'confirmed';
    v_outcome := 'confirmed';
  elsif p_answer = 'not_me' then
    update core.match_confirmations set state = 'not_me', via = p_via, at = now()
     where match_id = p_match_id and player_id = p_player;
    perform core.dispute_match(p_match_id, 'not_me');
    v_outcome := 'disputed';
  else
    if p_fix is null or (p_fix ->> 'winner') not in ('me', 'them') or (p_fix ->> 'sets') not in ('2-0', '2-1') then
      raise exception 'bad_fix' using errcode = '22023';
    end if;
    v_winner := case when p_fix ->> 'winner' = 'me' then v_side else 3 - v_side end;
    v_lost := split_part(p_fix ->> 'sets', '-', 2)::int;
    if v_winner = v_r.winner_side then
      -- the same winner: correct the sets, votes stand
      update core.match_results set sets = '[]'::jsonb, sets_won = 2, sets_lost = v_lost,
             result_version = result_version + 1, entered_at = now()
       where match_id = p_match_id;
      update core.match_confirmations set state = 'confirmed', via = p_via, proposed_fix = p_fix, at = now()
       where match_id = p_match_id and player_id = p_player;
      update core.matches set counts_for_levels = true where id = p_match_id and status = 'confirmed';
      v_outcome := 'corrected';
    else
      update core.match_confirmations set state = 'disputed', via = p_via, proposed_fix = p_fix, at = now()
       where match_id = p_match_id and player_id = p_player;
      perform core.dispute_match(p_match_id, 'other_winner');
      v_outcome := 'disputed';
    end if;
  end if;

  -- the logger hears back
  if v_m.logged_by is not null then
    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (v_m.logged_by, 'confirmation',
            jsonb_build_object('match_id', p_match_id, 'outcome', v_outcome, 'by_player', p_player, 'via', p_via),
            'in_app', 'confirmation:' || p_match_id || ':' || p_player)
    on conflict (dedupe_key) do nothing;
  end if;
  return jsonb_build_object('match_id', p_match_id, 'outcome', v_outcome);
end;
$$;
revoke all on function core.answer_confirmation(uuid, uuid, text, jsonb, text) from public;

create or replace function api.answer_confirmation(p_match_id uuid, p_answer text, p_fix jsonb default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_me  uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select claimed_player_id into v_me from core.profiles where user_id = v_uid;
  return core.answer_confirmation(p_match_id, v_me, p_answer, p_fix, 'feed');
end;
$$;

-- the logger's links: one per opponent still waiting to confirm who is not in the app. Each call makes new tokens
-- (only hashes are kept) and keeps each link open 7 more days; the Done screen calls it once and shares what it got.
create or replace function api.match_links(p_match_id uuid)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_out jsonb := '[]'::jsonb;
  v_tok text;
  r     record;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from core.matches where id = p_match_id and logged_by = v_uid) then
    raise exception 'not_your_match' using errcode = '42501';
  end if;
  for r in
    select p.id, p.first_name, p.surname, p.gender
      from core.match_confirmations c
      join core.players p on p.id = c.player_id
      join core.match_participants mp on mp.match_id = c.match_id and mp.player_id = p.id
     where c.match_id = p_match_id and c.state = 'pending' and p.claimed_by_user_id is null and not p.is_minor
     order by mp.position
  loop
    v_tok := core.new_link_token();
    insert into core.match_links (match_id, player_id, token_hash)
    values (p_match_id, r.id, core.link_hash(v_tok))
    on conflict (match_id, player_id) do update
       set token_hash = excluded.token_hash, resend_count = core.match_links.resend_count + 1,
           expires_at = greatest(core.match_links.expires_at, now() + interval '7 days');
    v_out := v_out || jsonb_build_object('player_id', r.id, 'first_name', r.first_name, 'surname', r.surname,
                                         'gender', r.gender, 'token', v_tok);
  end loop;
  return v_out;
end;
$$;

-- what the link shows: the match from the opponent's side. Opening it is recorded.
create or replace function api.get_match_link(p_token text)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_l  core.match_links := core.link_by_token(p_token);
  v_m  core.matches;
  v_lp core.players;
begin
  update core.match_links set opened_at = coalesce(opened_at, now()) where id = v_l.id;
  select * into v_m from core.matches where id = v_l.match_id;
  select p.* into v_lp from core.profiles pr join core.players p on p.id = pr.claimed_player_id where pr.user_id = v_m.logged_by;
  return (
    select jsonb_build_object(
             'match_id', v_m.id, 'format', v_m.format, 'starts_at', v_m.starts_at,
             'tournament', (select name from core.tournaments where id = v_m.tournament_id),
             'sides', core.match_sides_json(v_m.id),
             'my_side', (select side from core.match_participants where match_id = v_m.id and player_id = v_l.player_id),
             'winner_side', r.winner_side, 'score', r.score_summary,
             'player', jsonb_build_object('id', p.id, 'first_name', p.first_name, 'surname', p.surname, 'gender', p.gender,
                                          'hidden', p.hidden, 'claimed', p.claimed_by_user_id is not null),
             'logged_by', case when v_lp.id is null then null
                               else jsonb_build_object('player_id', v_lp.id, 'first_name', v_lp.first_name,
                                                       'surname', v_lp.surname, 'gender', v_lp.gender) end,
             'state', coalesce(c.state, 'pending'), 'kudo', v_l.kudo, 'expires_at', v_l.expires_at)
      from core.players p
      left join core.match_results r on r.match_id = v_m.id
      left join core.match_confirmations c on c.match_id = v_m.id and c.player_id = p.id
     where p.id = v_l.player_id);
end;
$$;

create or replace function api.answer_link(p_token text, p_answer text, p_fix jsonb default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_l   core.match_links := core.link_by_token(p_token);
  v_out jsonb;
begin
  v_out := core.answer_confirmation(v_l.match_id, v_l.player_id, p_answer, p_fix, 'link');
  update core.match_links set answered_at = now() where id = v_l.id;
  return v_out;
end;
$$;

-- «Πες κι εσύ μια καλή κουβέντα»: one pick, kept on the link
create or replace function api.link_kudo(p_token text, p_kudo text)
returns void
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare v_l core.match_links := core.link_by_token(p_token);
begin
  if p_kudo not in ('serve', 'backhand', 'calm', 'feet', 'fair_play', 'company') then
    raise exception 'bad_kudo' using errcode = '22023';
  end if;
  update core.match_links set kudo = p_kudo where id = v_l.id;
end;
$$;

-- «Κρύψε με από το NetProphet», and back again from the same link. A claimed player manages this in the app.
create or replace function api.hide_via_link(p_token text, p_hidden boolean)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare v_l core.match_links := core.link_by_token(p_token);
begin
  if exists (select 1 from core.players where id = v_l.player_id and claimed_by_user_id is not null) then
    raise exception 'player_claimed' using errcode = '42501';
  end if;
  update core.players set hidden = coalesce(p_hidden, true) where id = v_l.player_id;
  return jsonb_build_object('player_id', v_l.player_id, 'hidden', coalesce(p_hidden, true));
end;
$$;

-- «Κράτα το ματς στο προφίλ σου»: after signing in, the link's player becomes yours (a new name stops being pending)
create or replace function api.claim_via_link(p_token text)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_l   core.match_links;
  v_pr  core.profiles;
  v_pl  core.players;
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
  return jsonb_build_object('player_id', v_pl.id, 'claimed', true, 'replayed', false);
end;
$$;

revoke all on function api.match_links(uuid) from public, anon;
revoke all on function api.claim_via_link(text) from public, anon;
revoke all on function api.get_match_link(text) from public;
revoke all on function api.answer_link(text, text, jsonb) from public;
revoke all on function api.link_kudo(text, text) from public;
revoke all on function api.hide_via_link(text, boolean) from public;
grant execute on function api.match_links(uuid) to authenticated, service_role;
grant execute on function api.claim_via_link(text) to authenticated, service_role;
-- the link works without an account
grant execute on function api.get_match_link(text) to anon, authenticated, service_role;
grant execute on function api.answer_link(text, text, jsonb) to anon, authenticated, service_role;
grant execute on function api.link_kudo(text, text) to anon, authenticated, service_role;
grant execute on function api.hide_via_link(text, boolean) to anon, authenticated, service_role;
