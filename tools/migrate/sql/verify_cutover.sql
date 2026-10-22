-- Read only. Run on the hosted project after the v1 matches apply (docs/v2/cutover-runbook.md, step 6):
--   supabase --workdir .supabase-v2 db query --linked -f tools/migrate/sql/verify_cutover.sql
-- Each row: what, the number found, the number expected (from the local dry run report), ok.
-- Expected numbers are for the 9 Oct 2026 v1 backup (v1 had no writes after it); change them if a new backup differs.
with f as (
  select
    (select count(*) from core.matches where source_ref like 'v1:%') as matches,
    (select count(*) from core.matches where source_ref like 'v1:%' and status = 'confirmed') as confirmed,
    (select count(*) from core.match_results r join core.matches m on m.id = r.match_id where m.source_ref like 'v1:%') as results,
    (select count(*) from core.match_participants mp join core.matches m on m.id = mp.match_id
      join core.players p on p.id = mp.player_id where m.source_ref like 'v1:%' and p.status = 'merged') as on_merged,
    (select count(*) from core.matches m where m.source_ref like 'v1:%'
        and (select count(*) from core.match_participants mp where mp.match_id = m.id)
            <> case m.format when 'singles' then 2 else 4 end) as bad_sides,
    (select count(*) from core.tournaments t where exists (select 1 from core.matches m where m.tournament_id = t.id and m.source_ref like 'v1:%')) as tournaments,
    (select count(*) from core.players where is_minor and not hidden
        and exists (select 1 from core.match_participants mp join core.matches m on m.id = mp.match_id
                     where mp.player_id = core.players.id and m.source_ref like 'v1:%')) as minors_visible,
    (select count(*) from auth.users) as accounts,
    (select count(*) from core.profiles) as profiles,
    (select count(*) from core.players where claimed_by_user_id is not null) as claims,
    (select count(*) from core.user_cosmetics uc join core.cosmetic_items i on i.id = uc.item_id
      where i.key = 'frame_founding' and uc.source = 'migration') as founding_by_migration,
    (select count(*) from information_schema.columns where table_schema in ('core', 'api')
        and column_name ~ '(balance|coins?|bets?|odds)$') as coin_columns
)
select 'v1 matches' as what, matches as found, 388 as expected, matches = 388 as ok from f
union all select '  confirmed', confirmed, 335, confirmed = 335 from f
union all select 'v1 results', results, 335, results = 335 from f
union all select 'v1 participants on a merged player', on_merged, 0, on_merged = 0 from f
union all select 'v1 matches with incomplete sides', bad_sides, 0, bad_sides = 0 from f
union all select 'tournaments with v1 matches', tournaments, 9, tournaments = 9 from f
union all select 'minors visible in v1 matches', minors_visible, 0, minors_visible = 0 from f
union all select 'accounts (unchanged by the cutover)', accounts, null, true from f
union all select 'profiles = accounts', profiles, accounts, profiles = accounts from f
union all select 'claimed players (unchanged by the cutover)', claims, null, true from f
union all select 'founding frame given by migration (must be 0, PR #283)', founding_by_migration, 0, founding_by_migration = 0 from f
union all select 'coin/bet/odds columns in core or api', coin_columns, 0, coin_columns = 0 from f;
