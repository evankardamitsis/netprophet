-- Make player_a and player_b text fields nullable since we're using UUID fields now
ALTER TABLE public.matches 
ALTER COLUMN player_a DROP NOT NULL,
ALTER COLUMN player_b
DROP NOT NULL;

-- Update the constraint to allow both fields to be NULL when using UUID fields
ALTER TABLE public.matches 
DROP CONSTRAINT IF EXISTS check_player_a_reference
,
DROP CONSTRAINT
IF EXISTS check_player_b_reference;

-- Add new constraints that allow UUID fields to be used instead of text fields
ALTER TABLE public.matches 
ADD CONSTRAINT check_player_a_reference 
CHECK (
    (player_a IS NOT NULL AND player_a_id IS NULL) OR 
    (player_a IS NULL AND player_a_id IS NOT NULL) OR
    (player_a IS NULL AND player_a_id IS NULL)
);

ALTER TABLE public.matches 
ADD CONSTRAINT check_player_b_reference 
CHECK (
    (player_b IS NOT NULL AND player_b_id IS NULL) OR 
    (player_b IS NULL AND player_b_id IS NOT NULL) OR
    (player_b IS NULL AND player_b_id IS NULL)
); 