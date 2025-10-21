-- First, clean up any bets with NULL match_id (these are likely test data)
DELETE FROM public.bets WHERE match_id IS NULL;

-- Restore foreign key relationship between bets and matches tables
ALTER TABLE public.bets 
ADD CONSTRAINT bets_match_id_fkey 
FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;

-- Re-enable the NOT NULL constraint for match_id
ALTER TABLE public.bets ALTER COLUMN match_id
SET
NOT NULL;
