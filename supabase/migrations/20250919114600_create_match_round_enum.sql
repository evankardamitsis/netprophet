-- Create enum for match rounds
CREATE TYPE match_round AS ENUM
(
    'Round of 64',
    'Round of 32', 
    'Round of 16',
    'Quarterfinals',
    'Semifinals',
    'Finals'
);

-- First, update existing data to match enum values
UPDATE public.matches 
SET round = CASE 
    WHEN round = 'First Round' OR round = 'Round 1' THEN 'Round of 64'
    WHEN round = 'Second Round' OR round = 'Round 2' THEN 'Round of 32'
    WHEN round = 'Third Round' OR round = 'Round 3' THEN 'Round of 16'
    WHEN round = 'Quarter-Final' OR round = 'QF' THEN 'Quarterfinals'
    WHEN round = 'Semi-Final' OR round = 'SF' THEN 'Semifinals'
    WHEN round = 'Final' OR round = 'F' THEN 'Finals'
    ELSE NULL
END
WHERE round IS NOT NULL;

-- Update matches table to use the enum
ALTER TABLE public.matches 
ALTER COLUMN round TYPE
match_round USING round::match_round;

-- Add comment for documentation
COMMENT ON TYPE match_round IS 'Enum for tennis tournament rounds';
COMMENT ON COLUMN public.matches.round IS 'Tournament round using standardized enum values';
