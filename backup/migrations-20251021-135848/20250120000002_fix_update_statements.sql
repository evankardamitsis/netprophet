-- Fix UPDATE statements that were missing WHERE clauses
-- This migration corrects the UPDATE statements in the previous migration

-- Update tournament participant counts for all existing tournaments
UPDATE tournaments 
SET current_participants = (
    SELECT COUNT(DISTINCT player_id)
FROM tournament_participants
WHERE tournament_id = tournaments.id
)
WHERE EXISTS (
    SELECT 1
FROM tournament_participants
WHERE tournament_id = tournaments.id
);

-- Update tournament category participant counts (if categories still exist)
UPDATE tournament_categories 
SET current_participants = (
    SELECT COUNT(DISTINCT tp.player_id)
FROM tournament_participants tp
    JOIN matches m ON tp.tournament_id = m.tournament_id AND tp.player_id IN (m.player_a_id, m.player_b_id)
WHERE m.tournament_id = tournament_categories.tournament_id
    AND m.category_id = tournament_categories.id
)
WHERE EXISTS (
    SELECT 1
FROM matches m
WHERE m.tournament_id = tournament_categories.tournament_id
    AND m.category_id = tournament_categories.id
);
