-- Modify bets table to allow NULL match_id for testing
ALTER TABLE public.bets ALTER COLUMN match_id DROP NOT NULL;
ALTER TABLE public.bets DROP CONSTRAINT IF EXISTS bets_match_id_fkey; 