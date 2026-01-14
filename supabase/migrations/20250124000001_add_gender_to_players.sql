-- Add gender column to players table
-- Gender can be 'men' or 'women' to filter players by gender

ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Add constraint to ensure gender is either 'men' or 'women' or NULL
ALTER TABLE public.players
ADD CONSTRAINT players_gender_check CHECK (gender IS NULL OR gender IN ('men', 'women'));

-- Add comment for documentation
COMMENT ON COLUMN public.players.gender IS 'Player gender: men or women. Used for filtering players by gender category.';

-- Create index for better query performance when filtering by gender
CREATE INDEX IF NOT EXISTS idx_players_gender ON public.players(gender) WHERE gender IS NOT NULL;
