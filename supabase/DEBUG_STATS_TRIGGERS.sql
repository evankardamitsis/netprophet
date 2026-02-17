-- Debug script: Check why player stats aren't updating from match results
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Verify triggers exist on match_results
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'public.match_results'::regclass 
ORDER BY tgname;
-- Expected: trigger_update_player_stats_insert, trigger_update_player_stats_update, trigger_update_player_stats_delete

-- 2. CRITICAL: Matches without tournament_id cause trigger to FAIL (JOIN returns no row)
SELECT 
  m.id as match_id,
  m.tournament_id,
  m.match_type,
  mr.id as match_result_id
FROM match_results mr
JOIN matches m ON m.id = mr.match_id
WHERE m.tournament_id IS NULL 
  AND (m.match_type IS NULL OR m.match_type != 'doubles');
-- If any rows: trigger raises "Match not found" and INSERT is rolled back

-- 3. Count match_results: null winner_id = backfill may not have run or derive failed
SELECT 
  CASE WHEN mr.winner_id IS NULL THEN 'NULL' ELSE 'SET' END as winner_status,
  COUNT(*) 
FROM match_results mr
JOIN matches m ON m.id = mr.match_id
WHERE (m.match_type IS NULL OR m.match_type != 'doubles')
GROUP BY 1;

-- 4. Sample recent singles match - verify tournament + surface
SELECT 
  mr.id, m.id as match_id, m.match_type,
  m.tournament_id, t.name as tournament_name, t.surface,
  mr.winner_id, mr.set1_score, mr.set2_score
FROM match_results mr
JOIN matches m ON m.id = mr.match_id
LEFT JOIN tournaments t ON t.id = m.tournament_id
WHERE (m.match_type IS NULL OR m.match_type != 'doubles')
ORDER BY mr.created_at DESC
LIMIT 5;

-- 5. FIX: Ensure all matches with results have tournament_id
-- Run this if step 2 returned rows (matches need a tournament for stats to work):
/*
UPDATE matches m
SET tournament_id = (SELECT id FROM tournaments LIMIT 1)
FROM match_results mr
WHERE mr.match_id = m.id AND m.tournament_id IS NULL;
*/

-- 6. Re-run backfill for match_results with null winner_id (if any)
-- The backfill migration runs once. To re-run for new rows, execute the DO block from:
-- supabase/migrations/20260208160100_backfill_player_stats_null_winner.sql
