-- Add covering index for foreign key to improve query performance
-- This index will help with joins and lookups on the set2_winner_id foreign key

CREATE INDEX
IF NOT EXISTS idx_match_results_set2_winner_id 
    ON public.match_results
(set2_winner_id) 
    WHERE set2_winner_id IS NOT NULL;
