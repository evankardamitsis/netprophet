-- Fix foreign key relationships between matches and players tables
-- The matches table should reference players by ID, not by name

-- First, let's check if we need to migrate existing data
-- For now, we'll keep the existing structure but add proper foreign key constraints

-- Add foreign key columns if they don't exist
ALTER TABLE public.matches 
ADD COLUMN
IF NOT EXISTS player_a_id UUID REFERENCES public.players
(id),
ADD COLUMN
IF NOT EXISTS player_b_id UUID REFERENCES public.players
(id);

-- Create indexes for the foreign key columns
CREATE INDEX
IF NOT EXISTS idx_matches_player_a_id ON public.matches
(player_a_id);
CREATE INDEX
IF NOT EXISTS idx_matches_player_b_id ON public.matches
(player_b_id);

-- Add constraint to ensure at least one of player_a/player_a_id is set
ALTER TABLE public.matches 
ADD CONSTRAINT check_player_a_reference 
CHECK (
    (player_a IS NOT NULL AND player_a_id IS NULL) OR 
    (player_a IS NULL AND player_a_id IS NOT NULL)
);

-- Add constraint to ensure at least one of player_b/player_b_id is set
ALTER TABLE public.matches 
ADD CONSTRAINT check_player_b_reference 
CHECK (
    (player_b IS NOT NULL AND player_b_id IS NULL) OR 
    (player_b IS NULL AND player_b_id IS NOT NULL)
);

-- Update the matches query functions to handle both text and ID references
-- This allows backward compatibility while supporting the new structure 