-- Add tournament pass fields to profiles table
-- This allows users to have a free tournament access pass from welcome bonus

-- Add tournament pass fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_tournament_pass BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tournament_pass_used BOOLEAN DEFAULT FALSE;

-- Add comment to explain the columns
COMMENT ON COLUMN public.profiles.has_tournament_pass IS 'Whether user has an unused tournament pass from welcome bonus';
COMMENT ON COLUMN public.profiles.tournament_pass_used IS 'Whether the tournament pass has been used (prevents multiple uses)';

-- Create a function to grant tournament pass to user
CREATE OR REPLACE FUNCTION grant_tournament_pass(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.profiles
    SET has_tournament_pass = true,
        tournament_pass_used = false
    WHERE id = user_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to use tournament pass
CREATE OR REPLACE FUNCTION use_tournament_pass(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_pass BOOLEAN;
    pass_used BOOLEAN;
BEGIN
    -- Check if user has an unused pass
    SELECT has_tournament_pass, tournament_pass_used 
    INTO has_pass, pass_used
    FROM public.profiles
    WHERE id = user_uuid;
    
    -- If no pass or already used, return false
    IF NOT has_pass OR pass_used THEN
        RETURN FALSE;
    END IF;
    
    -- Mark pass as used
    UPDATE public.profiles
    SET tournament_pass_used = true
    WHERE id = user_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user can use tournament pass
CREATE OR REPLACE FUNCTION can_use_tournament_pass(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_pass BOOLEAN;
    pass_used BOOLEAN;
BEGIN
    SELECT has_tournament_pass, tournament_pass_used 
    INTO has_pass, pass_used
    FROM public.profiles
    WHERE id = user_uuid;
    
    RETURN has_pass AND NOT pass_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
