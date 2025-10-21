-- Add safe bet tokens to profiles table
-- This migration adds support for safe bet tokens used in parlay betting

-- Add safe bet tokens column to profiles
ALTER TABLE public.profiles 
ADD COLUMN
IF NOT EXISTS safe_bet_tokens INTEGER DEFAULT 5 CHECK
(safe_bet_tokens >= 0);

-- Add comment to document the safe bet tokens
COMMENT ON COLUMN public.profiles.safe_bet_tokens IS 'Number of safe bet tokens available for parlay betting. Safe bet tokens allow one loss in a parlay without losing the entire bet.';

-- Create a function to award safe bet tokens (e.g., for daily login streaks, achievements, etc.)
CREATE OR REPLACE FUNCTION award_safe_bet_tokens
(user_uuid UUID, tokens_to_award INTEGER)
RETURNS INTEGER AS $$
DECLARE
    current_tokens INTEGER;
    new_tokens INTEGER;
BEGIN
    -- Get current token count
    SELECT safe_bet_tokens
    INTO current_tokens
    FROM public.profiles
    WHERE id = user_uuid;

    -- Calculate new token count
    new_tokens := COALESCE
    (current_tokens, 0) + tokens_to_award;

-- Update tokens (ensure it doesn't go negative)
UPDATE public.profiles
    SET safe_bet_tokens = GREATEST(0, new_tokens)
    WHERE id = user_uuid;

RETURN GREATEST(0, new_tokens);
END;
$$ LANGUAGE plpgsql;

-- Create a function to consume safe bet tokens
CREATE OR REPLACE FUNCTION consume_safe_bet_tokens
(user_uuid UUID, tokens_to_consume INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_tokens INTEGER;
    new_tokens INTEGER;
BEGIN
    -- Get current token count
    SELECT safe_bet_tokens
    INTO current_tokens
    FROM public.profiles
    WHERE id = user_uuid;

    -- Check if user has enough tokens
    IF COALESCE(current_tokens, 0) < tokens_to_consume THEN
    RETURN FALSE;
END
IF;
    
    -- Calculate new token count
    new_tokens := current_tokens - tokens_to_consume;

-- Update tokens
UPDATE public.profiles
    SET safe_bet_tokens = new_tokens
    WHERE id = user_uuid;

RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a view for user safe bet token statistics
CREATE OR REPLACE VIEW public.safe_bet_token_stats AS
SELECT
    id as user_id,
    safe_bet_tokens,
    CASE 
        WHEN safe_bet_tokens = 0 THEN 'No tokens'
        WHEN safe_bet_tokens <= 2 THEN 'Low tokens'
        WHEN safe_bet_tokens <= 5 THEN 'Medium tokens'
        ELSE 'High tokens'
    END as token_status
FROM public.profiles
WHERE safe_bet_tokens IS NOT NULL;

-- Add RLS policy for safe bet token functions (only users can modify their own tokens)
CREATE POLICY "Users can view their own safe bet tokens" ON public.profiles
    FOR
SELECT USING (auth.uid() = id);

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION award_safe_bet_tokens
(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION consume_safe_bet_tokens
(UUID, INTEGER) TO authenticated; 