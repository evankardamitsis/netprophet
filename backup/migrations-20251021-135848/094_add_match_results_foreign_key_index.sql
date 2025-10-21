-- Add covering index for foreign key to improve query performance
-- This index will help with joins and lookups on the aces_leader_id foreign key

CREATE INDEX
IF NOT EXISTS idx_match_results_aces_leader_id 
    ON public.match_results
(aces_leader_id) 
    WHERE aces_leader_id IS NOT NULL;
