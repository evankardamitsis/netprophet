-- Add covering index for foreign key to improve query performance
-- This index will help with joins and lookups on the created_by foreign key

CREATE INDEX
IF NOT EXISTS idx_match_results_created_by 
    ON public.match_results
(created_by) 
    WHERE created_by IS NOT NULL;
