-- Add validation constraint for super_tiebreak_score in match_results table
-- Super tiebreak score must follow format: number-number (e.g., "10-8", "17-15")
-- Winner must have at least 10 points and win by at least 2 points

-- First, ensure the column exists (it should already exist, but this is safe)
ALTER TABLE public.match_results 
ADD COLUMN IF NOT EXISTS super_tiebreak_score TEXT;

-- Create a function to validate super tiebreak score
CREATE OR REPLACE FUNCTION validate_super_tiebreak_score(score TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    score1 INTEGER;
    score2 INTEGER;
    winner_score INTEGER;
    diff INTEGER;
BEGIN
    -- NULL is valid (optional field)
    IF score IS NULL OR score = '' THEN
        RETURN TRUE;
    END IF;

    -- Must match pattern: number-number
    IF score !~ '^\d+-\d+$' THEN
        RETURN FALSE;
    END IF;

    -- Extract both scores
    BEGIN
        score1 := split_part(score, '-', 1)::INTEGER;
        score2 := split_part(score, '-', 2)::INTEGER;
    EXCEPTION WHEN OTHERS THEN
        RETURN FALSE;
    END;

    -- Winner must have at least 10 points
    winner_score := GREATEST(score1, score2);
    IF winner_score < 10 THEN
        RETURN FALSE;
    END IF;

    -- Winner must win by at least 2 points
    diff := ABS(score1 - score2);
    IF diff < 2 THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add CHECK constraint using the validation function
ALTER TABLE public.match_results
DROP CONSTRAINT IF EXISTS check_super_tiebreak_score;

ALTER TABLE public.match_results
ADD CONSTRAINT check_super_tiebreak_score CHECK (
    validate_super_tiebreak_score(super_tiebreak_score) = TRUE
);

-- Add comment for documentation
COMMENT ON COLUMN public.match_results.super_tiebreak_score IS 
    'Super tiebreak score (e.g., "10-8", "17-15"). Winner must have at least 10 points and win by at least 2 points.';
