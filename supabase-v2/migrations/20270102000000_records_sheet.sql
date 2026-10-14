-- Records sheet (match-data-automation.md, "Records sheet"): the admin mirrors every tournament's matches into one
-- Google Sheet after each run. This is the one read it needs: tournaments with their totals, every tournament match
-- as a flat row, and the matches changed since the last write. The writer lives in apps/admin (lib/v2/records.ts);
-- the last write time is kept in the sheet's own Changes tab, so nothing here stores state.
--
-- Raw sheet spellings are not kept on a match (they become player_aliases), so a match row names the roster players
-- it is linked to. result_source is read from who entered the result: a player on the match, nobody (a scheduled
-- sheet run), or staff (staff results and staff-started sheet runs look the same here).

create or replace function core.records_match_json(m core.matches)
returns jsonb
language sql stable security definer set search_path = core, pg_temp
as $$
  select jsonb_build_object(
    'match_id', m.id, 'tournament_id', m.tournament_id,
    'source', m.source, 'source_ref', m.source_ref,
    'tab', m.provenance ->> 'tab', 'row', m.provenance -> 'row',
    'starts_at', m.starts_at, 'venue', m.venue, 'club', c.name, 'court', m.court,
    'category_raw', m.provenance ->> 'category_raw', 'level', e.name, 'discipline', m.provenance ->> 'discipline',
    'format', m.format, 'round', m.round,
    'side1', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', btrim(p.first_name || ' ' || p.surname)) order by mp.position)
                         from core.match_participants mp join core.players p on p.id = mp.player_id
                        where mp.match_id = m.id and mp.side = 1), '[]'::jsonb),
    'side2', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', btrim(p.first_name || ' ' || p.surname)) order by mp.position)
                         from core.match_participants mp join core.players p on p.id = mp.player_id
                        where mp.match_id = m.id and mp.side = 2), '[]'::jsonb),
    'status', m.status, 'postponed', m.postponed_at is not null,
    'winner_side', r.winner_side, 'sets', r.sets, 'sets_won', r.sets_won, 'sets_lost', r.sets_lost,
    'retired', r.retired, 'walkover', r.walkover,
    'result_source', case
      when r.match_id is null then null
      when r.entered_by is null then case when m.source = 'import' or m.provenance ? 'official' then 'sheet' else 'system' end
      when exists (select 1 from core.match_participants mp join core.players p on p.id = mp.player_id
                    where mp.match_id = m.id and p.claimed_by_user_id = r.entered_by) then 'player'
      when exists (select 1 from core.profiles pr where pr.user_id = r.entered_by and pr.role in ('admin', 'editor')) then 'staff'
      else 'player' end,
    'player_logged', m.source = 'user',
    'first_seen', m.created_at,
    'last_updated', greatest(m.updated_at, r.entered_at))
    from (select 1) x
    left join core.match_results r on r.match_id = m.id
    left join core.clubs c on c.id = m.club_id
    left join core.tournament_events e on e.id = m.event_id
$$;
revoke all on function core.records_match_json(core.matches) from public;

-- p_since: the last write's as_of (from the sheet's Changes tab); null on the first write, when every match is new
create or replace function api.records_sheet(p_since timestamptz default null)
returns jsonb
language plpgsql stable security definer set search_path = core, pg_temp
as $$
begin
  if not (core.is_service() or core.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'as_of', now(),
    'since', p_since,
    'tournaments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', t.id, 'name', t.name, 'source_kind', t.source_kind, 'source_url', t.source_url, 'venue', t.venue,
               'starts_on', t.starts_on, 'ends_on', t.ends_on, 'ongoing', t.ongoing, 'active', t.active,
               'last_run_at', t.last_run_at,
               'matches', s.matches, 'results', s.results, 'players', s.players, 'new_players', s.new_players,
               'open_reviews', (select count(*) from core.ingest_reviews ir where ir.tournament_id = t.id and ir.status = 'open'))
             order by t.starts_on desc nulls last, t.name, t.id)
        from core.tournaments t
        cross join lateral (
          select count(distinct m.id) as matches,
                 count(distinct m.id) filter (where r.match_id is not null) as results,
                 count(distinct mp.player_id) as players,
                 -- people this tournament's sheet added to the roster: made by an import no earlier than their first
                 -- match here, and not claimed since
                 count(distinct mp.player_id) filter (
                   where p.source = 'import' and p.claimed_by_user_id is null
                     and p.created_at >= (select min(m2.created_at) from core.matches m2
                                            join core.match_participants mp2 on mp2.match_id = m2.id
                                           where m2.tournament_id = t.id and mp2.player_id = p.id) - interval '1 minute') as new_players
            from core.matches m
            left join core.match_results r on r.match_id = m.id
            left join core.match_participants mp on mp.match_id = m.id
            left join core.players p on p.id = mp.player_id
           where m.tournament_id = t.id and not m.provenance ? 'demo') s
       where s.matches > 0 or t.source_url is not null or t.draw_url is not null), '[]'::jsonb),
    'matches', coalesce((
      select jsonb_agg(core.records_match_json(m) order by m.starts_at nulls last, m.id)
        from core.matches m
       where m.tournament_id is not null and not m.provenance ? 'demo'), '[]'::jsonb),
    'changes', coalesce((
      select jsonb_agg(jsonb_build_object('match_id', x.id,
                                          'kind', case when p_since is null or x.created_at > p_since then 'new' else 'updated' end,
                                          'changed_at', x.changed_at)
                       order by x.changed_at, x.id)
        from (select m.id, m.created_at, greatest(m.updated_at, r.entered_at) as changed_at
                from core.matches m
                left join core.match_results r on r.match_id = m.id
               where m.tournament_id is not null and not m.provenance ? 'demo') x
       where p_since is null or x.changed_at > p_since), '[]'::jsonb));
end;
$$;
revoke all on function api.records_sheet(timestamptz) from public, anon;
grant execute on function api.records_sheet(timestamptz) to authenticated, service_role;
