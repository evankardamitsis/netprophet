-- Fix all remaining performance issues and add missing foreign key indexes
-- This migration addresses multiple issues identified by Supabase linting

-- Add missing foreign key indexes for match_results table
-- These indexes will improve query performance for joins and lookups

CREATE INDEX IF NOT EXISTS idx_match_results_set3_winner_id 
    ON public.match_results(set3_winner_id) 
    WHERE set3_winner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_results_set4_winner_id 
    ON public.match_results(set4_winner_id) 
    WHERE set4_winner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_results_set5_winner_id 
    ON public.match_results(set5_winner_id) 
    WHERE set5_winner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_results_super_tiebreak_winner_id 
    ON public.match_results(super_tiebreak_winner_id) 
    WHERE super_tiebreak_winner_id IS NOT NULL;

-- Add indexes for set scores (these are frequently queried)
CREATE INDEX IF NOT EXISTS idx_match_results_set1_score 
    ON public.match_results(set1_score) 
    WHERE set1_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_results_set2_score 
    ON public.match_results(set2_score) 
    WHERE set2_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_results_set3_score 
    ON public.match_results(set3_score) 
    WHERE set3_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_results_set4_score 
    ON public.match_results(set4_score) 
    WHERE set4_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_match_results_set5_score 
    ON public.match_results(set5_score) 
    WHERE set5_score IS NOT NULL;

-- Add composite index for match_id and winner_id (common query pattern)
CREATE INDEX IF NOT EXISTS idx_match_results_match_winner 
    ON public.match_results(match_id, winner_id);

-- Add index for match_result field (frequently filtered)
CREATE INDEX IF NOT EXISTS idx_match_results_match_result 
    ON public.match_results(match_result);

-- Add index for created_at (for time-based queries)
CREATE INDEX IF NOT EXISTS idx_match_results_created_at 
    ON public.match_results(created_at DESC);

-- Add index for updated_at (for time-based queries)
CREATE INDEX IF NOT EXISTS idx_match_results_updated_at 
    ON public.match_results(updated_at DESC);
