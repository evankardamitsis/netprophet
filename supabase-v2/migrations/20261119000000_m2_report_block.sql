-- M2 part 5b: report and block (App Store guideline 1.2 for user content).
--   Report: a match (wrong result, never played, offensive) or a player (offensive name, fake), with an optional
--   note. Reports land in the moderation queue; staff hide the match or player, or dismiss the report.
--   Block: someone who logs matches. You stop seeing the matches they log (feed and Αποτελέσματα), their kudos stop
--   showing on your Εγώ and they can no longer send you any. They are not told. Unblock from Εγώ.
--   Confirmations still reach you, so you can dispute a match a blocked person logs against you.

create table core.blocks (
  user_id          uuid not null references auth.users (id) on delete cascade,
  blocked_user_id  uuid not null references auth.users (id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  check (user_id <> blocked_user_id)
);
alter table core.blocks enable row level security;
grant select on core.blocks to authenticated;
create policy blocks_own_read on core.blocks for select to authenticated using (user_id = (select auth.uid()));

create table core.reports (
  id                uuid primary key default gen_random_uuid(),
  reporter_user_id  uuid not null references auth.users (id) on delete cascade,
  entity_type       text not null check (entity_type in ('match', 'player')),
  entity_id         uuid not null,
  reason            text not null check (reason in ('wrong_result', 'never_played', 'offensive', 'fake', 'other')),
  note              text check (char_length(note) <= 500),
  status            text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  decided_by        uuid references auth.users (id) on delete set null,
  decided_at        timestamptz,
  created_at        timestamptz not null default now()
);
create unique index reports_one_open_idx on core.reports (reporter_user_id, entity_type, entity_id) where status = 'open';
create index reports_open_idx on core.reports (created_at) where status = 'open';
alter table core.reports enable row level security;

create or replace function core.is_blocked(p_viewer uuid, p_other uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$ select p_viewer is not null and p_other is not null
          and exists (select 1 from core.blocks where user_id = p_viewer and blocked_user_id = p_other) $$;
revoke all on function core.is_blocked(uuid, uuid) from public;

-- «Αναφορά»: one open report per person and thing; at most 20 a day
create or replace function api.report(p_entity_type text, p_entity_id uuid, p_reason text, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_entity_type = 'match' and not exists (select 1 from core.matches where id = p_entity_id)
     or p_entity_type = 'player' and not exists (select 1 from core.players where id = p_entity_id)
     or p_entity_type not in ('match', 'player') then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if (select count(*) from core.reports where reporter_user_id = v_uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'too_many_reports' using errcode = '54000';
  end if;
  insert into core.reports (reporter_user_id, entity_type, entity_id, reason, note)
  values (v_uid, p_entity_type, p_entity_id, p_reason, nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (reporter_user_id, entity_type, entity_id) where status = 'open' do update set reason = excluded.reason, note = excluded.note;
  return jsonb_build_object('reported', true);
end;
$$;

-- «Μπλοκ»: the person behind a player (claimed) or the one who logged a match
create or replace function api.block(p_player_id uuid default null, p_match_id uuid default null)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_other uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_player_id is not null then
    select claimed_by_user_id into v_other from core.players where id = p_player_id;
  else
    select logged_by into v_other from core.matches where id = p_match_id;
  end if;
  if v_other is null or v_other = v_uid then raise exception 'nobody_to_block' using errcode = 'P0002'; end if;
  insert into core.blocks (user_id, blocked_user_id) values (v_uid, v_other) on conflict do nothing;
  return jsonb_build_object('blocked', true);
end;
$$;

-- who «Μπλοκ» would block, for the sheet: the player's account, or whoever logged the match; null when nobody
create or replace function api.block_target(p_player_id uuid default null, p_match_id uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_uid   uuid := auth.uid();
  v_other uuid;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_player_id is not null then
    select claimed_by_user_id into v_other from core.players where id = p_player_id;
  else
    select logged_by into v_other from core.matches where id = p_match_id;
  end if;
  if v_other is null or v_other = v_uid then return null; end if;
  return (select jsonb_build_object('first_name', coalesce(p.first_name, pr.first_name), 'gender', coalesce(p.gender, pr.gender),
                                    'blocked', core.is_blocked(v_uid, v_other))
            from core.profiles pr left join core.players p on p.id = pr.claimed_player_id
           where pr.user_id = v_other);
end;
$$;

create or replace function api.unblock(p_user_id uuid)
returns void
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from core.blocks where user_id = auth.uid() and blocked_user_id = p_user_id;
end;
$$;

-- Εγώ › «Μπλοκαρισμένοι»
create or replace function api.get_blocks()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('user_id', b.blocked_user_id,
                                        'first_name', coalesce(p.first_name, pr.first_name), 'surname', coalesce(p.surname, pr.surname))
                     order by b.created_at desc)
      from core.blocks b
      join core.profiles pr on pr.user_id = b.blocked_user_id
      left join core.players p on p.id = pr.claimed_player_id
     where b.user_id = auth.uid()), '[]'::jsonb);
end;
$$;

-- staff: close a report, after hiding what it points at or not
create or replace function api.admin_close_report(p_report_id uuid, p_hide boolean)
returns jsonb
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare v_r core.reports;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v_r from core.reports where id = p_report_id and status = 'open';
  if not found then raise exception 'not_open' using errcode = 'P0002'; end if;
  if p_hide then
    if v_r.entity_type = 'match' then update core.matches set approved = false where id = v_r.entity_id;
    else update core.players set hidden = true where id = v_r.entity_id; end if;
  end if;
  -- every open report on the same thing closes with it
  update core.reports set status = case when p_hide then 'actioned' else 'dismissed' end, decided_by = auth.uid(), decided_at = now()
   where entity_type = v_r.entity_type and entity_id = v_r.entity_id and status = 'open';
  return jsonb_build_object('entity_type', v_r.entity_type, 'entity_id', v_r.entity_id, 'hidden', p_hide);
end;
$$;

-- the queue gains the open reports
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
       where r.status = 'open'), '[]'::jsonb));
end;
$$;

-- blocked people's matches and kudos stop showing; they can no longer thank you
create or replace function api.get_feed(p_limit int default 20)
returns jsonb
language plpgsql security definer stable set search_path = core, extensions, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_sport   text;
  v_area    text;
  v_claimed uuid;
  v_limit   int := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_content jsonb;
  v_ads     jsonb;
  v_ad_n    int;
  v_out     jsonb := '[]'::jsonb;
  v_el      jsonb;
  v_i       int := 0;
  v_offset  int := extract(doy from core.athens_day())::int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select primary_sport, area_id, claimed_player_id into v_sport, v_area, v_claimed
    from core.profiles where user_id = v_uid and deleted_at is null;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;

  v_content := coalesce((
    select jsonb_agg(jsonb_build_object('kind', 'result', 'id', i.id, 'created_at', i.created_at, 'payload', i.payload)
                     order by i.created_at)
      from (select * from core.feed_inbox
             where user_id = v_uid and kind = 'result' and seen_at is null
             order by created_at limit v_limit) i), '[]'::jsonb);

  v_content := v_content || coalesce((
    select jsonb_agg(q.card order by q.voted, q.not_circle, q.starts_at nulls last, q.id)
      from (
        select m.id, m.starts_at, (mv.id is not null) as voted, not c.in_circle as not_circle,
               jsonb_build_object(
                 'kind', 'match', 'match_id', m.id, 'format', m.format, 'starts_at', m.starts_at,
                 'venue', m.venue, 'round', m.round, 'status', m.status,
                 'tournament', case when t.id is not null then jsonb_build_object('id', t.id, 'name', t.name) end,
                 'sides', core.match_sides_json(m.id),
                 'in_circle', c.in_circle,
                 'my_vote', mv.option,
                 'split', case when mv.id is not null then core.vote_split(m.id) end) as card
          from core.matches m
          left join core.votes mv on mv.user_id = v_uid and mv.subject_type = 'match' and mv.subject_id = m.id
          left join core.tournaments t on t.id = m.tournament_id
          cross join lateral (
            select exists (select 1 from core.match_participants mp
                             join core.follows f on f.player_id = mp.player_id and f.user_id = v_uid
                            where mp.match_id = m.id) as in_circle) c
         where m.sport_id = v_sport and m.approved and core.match_is_open(m)
           and not exists (select 1 from core.match_participants mp
                             join core.players p on p.id = mp.player_id
                            where mp.match_id = m.id and (p.hidden or mp.player_id = v_claimed))
           and not core.is_blocked(v_uid, m.logged_by)
         order by (mv.id is not null), c.in_circle desc, m.starts_at nulls last, m.id
         limit v_limit) q), '[]'::jsonb);

  select coalesce(jsonb_agg(jsonb_build_object('kind', 'sponsored', 'id', s.id, 'label', 'Χορηγούμενο',
                                               'sponsor', s.sponsor, 'title', s.title, 'subtitle', s.subtitle,
                                               'cta_url', s.cta_url) order by s.weight desc, s.id), '[]'::jsonb)
    into v_ads
    from core.sponsored_cards s
   where s.status = 'active' and s.placement = 'feed'
     and (s.starts_at is null or s.starts_at <= now()) and (s.ends_at is null or s.ends_at > now())
     and (cardinality(s.area_ids) = 0 or v_area = any (s.area_ids));
  v_ad_n := jsonb_array_length(v_ads);

  for v_el in select * from jsonb_array_elements(v_content) loop
    v_out := v_out || jsonb_build_array(v_el);
    v_i := v_i + 1;
    if v_ad_n > 0 and v_i % 4 = 0 then
      v_out := v_out || jsonb_build_array(v_ads -> (((v_i / 4) - 1 + v_offset) % v_ad_n));
    end if;
  end loop;

  return jsonb_build_object('items', v_out, 'count', jsonb_array_length(v_out));
end;
$$;

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
           and not core.is_blocked(v_uid, m.logged_by)
           and m.starts_at is not null
           and m.starts_at >= now() - make_interval(days => v_days)
         order by m.starts_at desc
         limit v_limit
      ) d), '[]'::jsonb);
end;
$$;

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
             where k.to_player_id = v_me and o.key is not null and not core.is_blocked(v_uid, k.from_user_id)
             group by o.key, o.forms, o.doubles_only, o.sort) x), '[]'::jsonb);
end;
$$;

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
       and not core.is_blocked(p.claimed_by_user_id, v_uid)
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

revoke all on function api.report(text, uuid, text, text) from public, anon;
revoke all on function api.block(uuid, uuid) from public, anon;
revoke all on function api.unblock(uuid) from public, anon;
revoke all on function api.block_target(uuid, uuid) from public, anon;
revoke all on function api.get_blocks() from public, anon;
revoke all on function api.admin_close_report(uuid, boolean) from public, anon;
grant execute on function api.report(text, uuid, text, text) to authenticated, service_role;
grant execute on function api.block(uuid, uuid) to authenticated, service_role;
grant execute on function api.unblock(uuid) to authenticated, service_role;
grant execute on function api.block_target(uuid, uuid) to authenticated, service_role;
grant execute on function api.get_blocks() to authenticated, service_role;
grant execute on function api.admin_close_report(uuid, boolean) to authenticated, service_role;
