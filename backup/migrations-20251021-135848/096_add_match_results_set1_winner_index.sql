-- Add covering index for foreign key to improve query performance
-- This index will help with joins and lookups on the set1_winner_id foreign key

CREATE INDEX
IF NOT EXISTS idx_match_results_set1_winner_id 
    ON public.match_results
(set1_winner_id) 
    WHERE set1_winner_id IS NOT NULL;
