-- Pro: «Το επόμενο τουρνουά για σένα» (founder, 17 Oct 2026: Pro is «ο βοηθός της σεζόν σου»; this perk moves it
-- from "during a tournament" to "before"). Tournaments still to come, or still open for entry, in the player's sport:
-- their own area first, then those whose entry closes soonest, each with its dates, area, surface, the entry
-- deadline, where to sign up, the organiser's categories («Μ 40+», «MEDIUM») and whether the player played an
-- earlier edition.
--
-- Who it is for: the organiser's categories are the "who" line. Players' playing levels stay hidden (founder,
-- 14 Oct), so a level never filters or orders the list and never shows. A tournament whose categories are all for
-- the other gender sorts after the ones that fit, within the player's area and outside it.
--
-- Free and Pro (decided here, server side, nothing hidden in the client):
--   free: the first tournament in full (deadline and sign-up link included) and `more`, how many others there are;
--   Pro:  every tournament, and a push two days before an entry deadline («Κλείνουν οι δηλώσεις»).
-- The free view shows the perk working on one real tournament and says how many more Pro would show.
--
-- The reminder goes to Pro users whose area is the tournament's, or who played an earlier edition (same name
-- without the year, or the same organiser link), once per tournament per user, through the same notifications and
-- outbox as the match reminders. No existing push reads notification_prefs, so this one does not either.

alter table core.tournaments add column if not exists entry_link text;
comment on column core.tournaments.entry_link is 'Where to sign up (the organiser''s form or page); staff set it.';

-- «Open Γλυφάδας 2026» and «Open Γλυφάδας 2025» are editions of one tournament
create or replace function core.tournament_name_key(p_name text)
returns text
language sql immutable set search_path = core, pg_temp
as $$
  select btrim(regexp_replace(regexp_replace(core.normalize_search(coalesce(p_name, '')), '[0-9]+', ' ', 'g'), '\s+', ' ', 'g'))
$$;

-- an earlier edition of tournament p_t that this player played in
create or replace function core.played_edition(p_player uuid, p_t uuid)
returns boolean
language sql stable security definer set search_path = core, pg_temp
as $$
  select p_player is not null and exists (
    select 1
      from core.tournaments t
      join core.tournaments o on o.id <> t.id and o.sport_id = t.sport_id
       and (core.tournament_name_key(o.name) = core.tournament_name_key(t.name)
            or (t.source_url is not null and o.source_url = t.source_url))
      join core.matches m on m.tournament_id = o.id and m.status <> 'void'
      join core.match_participants mp on mp.match_id = m.id and mp.player_id = p_player
     where t.id = p_t
       and (o.starts_on is null or t.starts_on is null or o.starts_on < t.starts_on))
$$;
revoke all on function core.played_edition(uuid, uuid) from public;

-- every tournament for this user, ordered; the RPC and the tests read it
create or replace function core.upcoming_for(p_user uuid, p_today date default core.athens_day(now()))
returns table (id uuid, ord bigint, area_match boolean, doc jsonb)
language sql stable security definer set search_path = core, pg_temp
as $$
  with me as (
    select pr.user_id, pr.primary_sport, pr.area_id, pr.area_ids, pr.gender, pr.claimed_player_id
      from core.profiles pr where pr.user_id = p_user
  ),
  c as (
    select t.*,
           (t.area_id is not null and (t.area_id = me.area_id or t.area_id = any(me.area_ids))) as area_match,
           (t.entry_deadline is not null and t.entry_deadline >= p_today) as open_entry,
           -- fit: a category for the player's gender, or none that names one
           (me.gender is null
            or not exists (select 1 from core.tournament_events e where e.tournament_id = t.id and e.gender is not null)
            or exists (select 1 from core.tournament_events e where e.tournament_id = t.id
                        and (e.gender is null or e.gender = me.gender or e.gender = 'mixed'))) as fits,
           core.played_edition(me.claimed_player_id, t.id) as played,
           me.claimed_player_id
      from core.tournaments t, me
     where t.sport_id = me.primary_sport
       and not t.is_minor_event
       and ((t.starts_on is not null and t.starts_on > p_today) or (t.entry_deadline is not null and t.entry_deadline >= p_today))
  )
  select c.id,
         row_number() over (order by c.area_match desc, c.fits desc, c.open_entry desc, c.entry_deadline nulls last,
                                     c.starts_on nulls last, c.name, c.id) as ord,
         c.area_match,
         jsonb_build_object(
           'id', c.id, 'name', c.name, 'venue', c.venue, 'area_id', c.area_id,
           'area', (select a.name_el from core.areas a where a.id = c.area_id),
           'surface', c.surface, 'starts_on', c.starts_on, 'ends_on', c.ends_on,
           'entry_deadline', c.entry_deadline, 'entry_open', c.open_entry, 'entry_link', c.entry_link,
           'categories', coalesce((select jsonb_agg(x.name order by x.name)
                                     from (select distinct e.name from core.tournament_events e where e.tournament_id = c.id) x), '[]'::jsonb),
           'played_before', c.played,
           'near', c.area_match)
    from c
$$;
revoke all on function core.upcoming_for(uuid, date) from public;

create or replace function api.upcoming_tournaments()
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_pro boolean;
  v_n   int;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  v_pro := core.is_pro(v_uid);
  select count(*) into v_n from core.upcoming_for(v_uid);
  return jsonb_build_object(
    'pro', v_pro,
    'items', coalesce((select jsonb_agg(u.doc order by u.ord) from core.upcoming_for(v_uid) u
                        where v_pro or u.ord = 1), '[]'::jsonb),
    'more', case when v_pro then 0 else greatest(v_n - 1, 0) end);
end;
$$;

-- two days before an entry deadline: a push to Pro users near it or who played an earlier edition
create or replace function core.entry_reminders(p_now timestamptz default now())
returns int
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  r     record;
  v_key text;
  v_msg jsonb;
  v_n   int := 0;
  v_day date := core.athens_day(p_now);
begin
  -- from 10:00 Athens, so nobody is woken up; a run missed on the day still sends the next day
  if extract(hour from p_now at time zone 'Europe/Athens') < 10 then return 0; end if;
  for r in
    select t.id, t.name, t.entry_deadline, pr.user_id
      from core.tournaments t
      join core.profiles pr on pr.primary_sport = t.sport_id and pr.deleted_at is null
     where not t.is_minor_event
       and t.entry_deadline between v_day + 1 and v_day + 2
       and (t.starts_on is null or t.starts_on > v_day)
       and core.is_pro(pr.user_id)
       and ((t.area_id is not null and (t.area_id = pr.area_id or t.area_id = any(pr.area_ids)))
            or core.played_edition(pr.claimed_player_id, t.id))
  loop
    v_key := 'entry:' || r.user_id || ':' || r.id;
    continue when exists (select 1 from core.notifications where dedupe_key = v_key);
    v_msg := jsonb_build_object(
      'title', 'Κλείνουν οι δηλώσεις',
      'body', r.name || ': δηλώσεις έως '
              || (array['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'])[extract(dow from r.entry_deadline)::int + 1]
              || ' ' || to_char(r.entry_deadline, 'FMDD/FMMM') || '. Μπαίνεις;',
      'data', jsonb_build_object('tournament_id', r.id));
    insert into core.notifications (user_id, type, payload, channel, dedupe_key)
    values (r.user_id, 'entry', v_msg, 'push', v_key)
    on conflict (dedupe_key) do nothing;
    if found then
      insert into core.outbox (kind, payload, idempotency_key)
      values ('push', jsonb_build_object('user_id', r.user_id, 'dedupe_key', v_key, 'type', 'entry', 'message', v_msg), 'push:' || v_key)
      on conflict (idempotency_key) do nothing;
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function core.entry_reminders(timestamptz) from public;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('np-entry-reminders', '15 * * * *', $c$select core.entry_reminders()$c$);
  end if;
end;
$$;

-- staff: the entry deadline and the sign-up link of one tournament (null clears)
create or replace function api.admin_set_tournament_entry(p_id uuid, p_entry_deadline date, p_entry_link text)
returns void
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_link text := nullif(btrim(coalesce(p_entry_link, '')), '');
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_link is not null and v_link !~* '^https?://' then raise exception 'entry_link_invalid' using errcode = '22023'; end if;
  update core.tournaments set entry_deadline = p_entry_deadline, entry_link = v_link where id = p_id;
  if not found then raise exception 'tournament_not_found' using errcode = 'P0002'; end if;
end;
$$;

-- the admin list and the save carry the two new fields
create or replace function api.admin_tournaments()
returns jsonb
language plpgsql stable security definer set search_path = core, extensions, pg_temp
as $$
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', t.id, 'name', t.name, 'venue', t.venue, 'area_id', t.area_id, 'surface', t.surface,
             'starts_on', t.starts_on, 'ends_on', t.ends_on, 'active', t.active,
             'entry_deadline', t.entry_deadline, 'entry_link', t.entry_link,
             'source_kind', t.source_kind, 'source_url', t.source_url, 'draw_url', t.draw_url, 'ongoing', t.ongoing,
             'season_start_year', t.season_start_year, 'last_run_at', t.last_run_at,
             'matches', (select count(*) from core.matches m where m.tournament_id = t.id),
             'open_reviews', (select count(*) from core.ingest_reviews r where r.tournament_id = t.id and r.status = 'open'),
             'draws', (select count(*) from core.tournament_draws d where d.tournament_id = t.id),
             'last_run', (select jsonb_build_object('at', r.started_at, 'trigger', r.trigger, 'health', r.health,
                                                    'rows_seen', r.rows_seen, 'counts', r.counts, 'error', r.error)
                            from core.ingest_runs r where r.tournament_id = t.id and r.kind = 'schedule' order by r.started_at desc limit 1),
             'last_draw_run', (select jsonb_build_object('at', r.started_at, 'trigger', r.trigger, 'health', r.health,
                                                    'rows_seen', r.rows_seen, 'counts', r.counts, 'error', r.error)
                            from core.ingest_runs r where r.tournament_id = t.id and r.kind = 'draws' order by r.started_at desc limit 1))
           order by t.ongoing desc, t.active desc, t.starts_on desc nulls last, t.name)
      from core.tournaments t), '[]'::jsonb);
end;
$$;

create or replace function api.admin_save_tournament(p jsonb)
returns uuid
language plpgsql security definer set search_path = core, extensions, pg_temp
as $$
declare
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  if not core.is_staff() then raise exception 'forbidden' using errcode = '42501'; end if;
  if coalesce(btrim(p ->> 'name'), '') = '' then raise exception 'name_required' using errcode = '22023'; end if;
  if coalesce((p ->> 'ongoing')::boolean, false) and coalesce(btrim(p ->> 'source_url'), '') = '' and coalesce(btrim(p ->> 'draw_url'), '') = '' then
    raise exception 'source_required' using errcode = '22023';
  end if;
  if coalesce(btrim(p ->> 'entry_link'), '') <> '' and btrim(p ->> 'entry_link') !~* '^https?://' then
    raise exception 'entry_link_invalid' using errcode = '22023';
  end if;
  if v_id is null then
    insert into core.tournaments (sport_id, name, venue, area_id, surface, starts_on, ends_on, source,
                                  source_kind, source_url, draw_url, ongoing, season_start_year, entry_deadline, entry_link)
    values (coalesce(p ->> 'sport_id', 'tennis'), btrim(p ->> 'name'), nullif(btrim(p ->> 'venue'), ''),
            nullif(p ->> 'area_id', ''), nullif(p ->> 'surface', ''),
            nullif(p ->> 'starts_on', '')::date, nullif(p ->> 'ends_on', '')::date, 'import',
            nullif(p ->> 'source_kind', ''), nullif(btrim(p ->> 'source_url'), ''), nullif(btrim(p ->> 'draw_url'), ''),
            coalesce((p ->> 'ongoing')::boolean, false), nullif(p ->> 'season_start_year', '')::int,
            nullif(p ->> 'entry_deadline', '')::date, nullif(btrim(p ->> 'entry_link'), ''))
    returning id into v_id;
  else
    update core.tournaments
       set name = btrim(p ->> 'name'), venue = nullif(btrim(p ->> 'venue'), ''), area_id = nullif(p ->> 'area_id', ''),
           surface = nullif(p ->> 'surface', ''), starts_on = nullif(p ->> 'starts_on', '')::date,
           ends_on = nullif(p ->> 'ends_on', '')::date,
           source_kind = case when p ? 'source_kind' then nullif(p ->> 'source_kind', '') else source_kind end,
           source_url = case when p ? 'source_url' then nullif(btrim(p ->> 'source_url'), '') else source_url end,
           draw_url = case when p ? 'draw_url' then nullif(btrim(p ->> 'draw_url'), '') else draw_url end,
           ongoing = case when p ? 'ongoing' then (p ->> 'ongoing')::boolean else ongoing end,
           season_start_year = case when p ? 'season_start_year' then nullif(p ->> 'season_start_year', '')::int else season_start_year end,
           entry_deadline = case when p ? 'entry_deadline' then nullif(p ->> 'entry_deadline', '')::date else entry_deadline end,
           entry_link = case when p ? 'entry_link' then nullif(btrim(p ->> 'entry_link'), '') else entry_link end
     where id = v_id;
    if not found then raise exception 'tournament_not_found' using errcode = 'P0002'; end if;
  end if;
  return v_id;
end;
$$;

revoke all on function api.upcoming_tournaments() from public, anon;
revoke all on function api.admin_set_tournament_entry(uuid, date, text) from public, anon;
grant execute on function api.upcoming_tournaments() to authenticated, service_role;
grant execute on function api.admin_set_tournament_entry(uuid, date, text) to authenticated, service_role;
