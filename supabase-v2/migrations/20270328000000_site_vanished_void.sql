-- A match that vanishes from an organiser's site is closed by itself (founder, 30 Oct 2026: "close vanished matches
-- automatically").
--
-- athenstennis.gr lists every match of the season, played or coming. When the organiser takes a match off (cancelled,
-- or set up again as a new match), it is simply gone: no result, no new day. The «missing twice» rule of
-- core.ingest_missing postponed those matches (no postponed_by) and they waited for the 21-day rule, so the morning
-- email asked staff about them every day: 18 Athens Tennis matches on 30 Oct, voided by hand.
--
-- 1. core.ingest_missing: a match missing from two healthy reads in a row, with no twin to hand its votes to, is
--    voided when the tournament's source is a site (core.void_stale_match: votes cancelled, no points, as «It didn't
--    happen» does). This overrides «nothing is voided by itself» (14 Oct) for sites only. Sheets keep the rain rule
--    unchanged: organisers drop rained-off rows and bring them back on a new day, so a dropped row is postponed and
--    keeps its votes, and is cancelled after 21 days.
-- 2. The Athens Tennis tournament was saved before the admin stored a site link as `site`; it is marked now (the admin
--    sets source_kind from the link on every save, apps/admin/src/app/v2/sources/actions.ts).
-- Copied from 20270216000000_ingest_row_identity.sql with the site branch added.

update core.tournaments set source_kind = 'site'
 where source_url ~* '^https?://(www\.)?athenstennis\.gr/' and source_kind is distinct from 'site';

create or replace function core.ingest_missing(p_tournament_id uuid, p_rows jsonb)
returns jsonb
language plpgsql security definer set search_path = core, pg_temp
as $$
declare
  v_seen  text[] := array(select x ->> 'fingerprint' from jsonb_array_elements(p_rows) x);
  v_id    uuid;
  v_twin  uuid;
  v_miss  int := 0;
  v_void  int := 0;
  v_post  int := 0;
  v_repl  int := 0;
  v_site  boolean := (select source_kind = 'site' from core.tournaments where id = p_tournament_id);
begin
  update core.matches set provenance = provenance - 'missing_runs'
   where tournament_id = p_tournament_id and source = 'import' and source_ref = any (v_seen) and provenance ? 'missing_runs';
  for v_id in
    update core.matches m
       set provenance = provenance || jsonb_build_object('missing_runs', coalesce((provenance ->> 'missing_runs')::int, 0) + 1)
     where m.tournament_id = p_tournament_id and m.source = 'import' and m.status in ('announced', 'scheduled')
       and m.resolved_at is null and not exists (select 1 from core.match_results x where x.match_id = m.id)
       and m.starts_at >= now() - interval '1 day' and m.postponed_at is null
       and not (m.source_ref = any (v_seen))
    returning m.id
  loop
    v_miss := v_miss + 1;
  end loop;
  -- missing twice in a row: if the sheet's row for that slot is another match now (an edit the identity check could
  -- not follow), the votes go there and this copy is voided; else, on an organiser's site, it was taken off and is
  -- voided (30 Oct); on a sheet it is postponed (rain, a moved day), keeping its votes
  for v_id in
    select id from core.matches
     where tournament_id = p_tournament_id and source = 'import' and status in ('announced', 'scheduled')
       and coalesce((provenance ->> 'missing_runs')::int, 0) >= 2 and postponed_at is null
  loop
    v_twin := core.find_twin(v_id, v_seen);
    if v_twin is not null then
      perform core.fix_stale_twin(v_id, v_twin);
      v_repl := v_repl + 1;
    elsif v_site then
      perform core.void_stale_match(v_id, jsonb_build_object('cancelled_at', now(), 'vanished_from_site', true));
      v_void := v_void + 1;
    else
      update core.matches set postponed_at = now() where id = v_id;
      v_post := v_post + 1;
    end if;
  end loop;
  -- postponed three weeks and never back: cancelled
  for v_id in
    select id from core.matches
     where tournament_id = p_tournament_id and source = 'import' and status in ('announced', 'scheduled')
       and postponed_at is not null and postponed_at < now() - interval '21 days'
  loop
    update core.matches set status = 'void', updated_at = now(),
                            provenance = provenance || jsonb_build_object('cancelled_at', now())
     where id = v_id;
    insert into core.outbox (kind, payload, idempotency_key)
    values ('resolve_match', jsonb_build_object('match_id', v_id), 'resolve:' || v_id || ':void')
    on conflict (idempotency_key) do nothing;
    v_void := v_void + 1;
  end loop;
  return jsonb_build_object('missing', v_miss, 'postponed', v_post, 'cancelled', v_void, 'replaced', v_repl);
end;
$$;
revoke all on function core.ingest_missing(uuid, jsonb) from public;
