-- Fix foreign key constraint names for matches table
-- Add proper foreign key constraints with expected names

-- Drop existing foreign key constraints if they exist
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_player_a_id_fkey;
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_player_b_id_fkey;
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_winner_id_fkey;

-- Add foreign key constraints with proper names
ALTER TABLE public.matches 
ADD CONSTRAINT matches_player_a_id_fkey 
FOREIGN KEY (player_a_id) REFERENCES public.players(id) ON DELETE SET NULL;

ALTER TABLE public.matches 
ADD CONSTRAINT matches_player_b_id_fkey 
FOREIGN KEY (player_b_id) REFERENCES public.players(id) ON DELETE SET NULL;

ALTER TABLE public.matches 
ADD CONSTRAINT matches_winner_id_fkey 
FOREIGN KEY (winner_id) REFERENCES public.players(id) ON DELETE SET NULL; 