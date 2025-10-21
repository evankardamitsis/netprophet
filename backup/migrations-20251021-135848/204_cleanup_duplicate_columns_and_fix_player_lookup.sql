-- Clean up duplicate columns and fix player lookup system
-- This migration removes duplicate columns and fixes the player matching system

-- 1. Remove duplicate firstname and lastname columns (keep first_name and last_name)
ALTER TABLE profiles DROP COLUMN IF EXISTS firstname;
ALTER TABLE profiles DROP COLUMN IF EXISTS lastname;

-- 2. Update the existing player to be claimable
UPDATE players 
SET 
    is_hidden = true,
    is_active = false,
    is_demo_player = false
WHERE first_name = 'Βαγγέλης' AND last_name = 'Καρδαμίτσης';

-- 3. Fix the find_matching_players function to handle NULL values properly
DROP FUNCTION IF EXISTS find_matching_players(TEXT, TEXT);

CREATE FUNCTION find_matching_players(
    search_name TEXT,
    search_surname TEXT
)
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    is_hidden BOOLEAN,
    is_active BOOLEAN,
    claimed_by_user_id UUID,
    is_demo_player BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.is_hidden,
        p.is_active,
        p.claimed_by_user_id,
        p.is_demo_player
    FROM players p
    WHERE 
        LOWER(p.first_name) = LOWER(search_name) 
        AND LOWER(p.last_name) = LOWER(search_surname)
        AND (p.is_hidden = true OR p.is_hidden IS NULL)  -- Allow NULL values
        AND p.claimed_by_user_id IS NULL
        AND (p.is_demo_player = false OR p.is_demo_player IS NULL)  -- Allow NULL values
    ORDER BY p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update the handle_new_user function to use the correct column names (first_name, last_name)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_first_name TEXT;
    user_last_name TEXT;
    matching_players_count INTEGER;
    matching_player_id UUID;
BEGIN
    -- Extract firstName and lastName from user metadata
    user_first_name := COALESCE(NEW.raw_user_meta_data->>'firstName', '');
    user_last_name := COALESCE(NEW.raw_user_meta_data->>'lastName', '');
    
    -- Insert profile with correct existing column names
    INSERT INTO public.profiles
        (
            id, 
            email, 
            first_name, 
            last_name, 
            balance, 
            daily_login_streak, 
            has_received_welcome_bonus,
            terms_accepted,
            profile_claim_status,
            created_at, 
            updated_at
        )
    VALUES
        (
            NEW.id,
            NEW.email,
            user_first_name,
            user_last_name,
            0, -- balance starts at 0
            0, -- daily_login_streak starts at 0
            false, -- has_received_welcome_bonus starts false
            false, -- terms_accepted starts false
            'pending', -- profile_claim_status starts pending
            NEW.created_at,
            NEW.updated_at
        );
    
    -- If we have both first and last name, try to find matching players
    IF user_first_name != '' AND user_last_name != '' THEN
        -- Count matching players
        SELECT COUNT(*) INTO matching_players_count 
        FROM find_matching_players(user_first_name, user_last_name);
        
        -- If we found exactly one match, automatically claim it
        IF matching_players_count = 1 THEN
            SELECT id INTO matching_player_id 
            FROM find_matching_players(user_first_name, user_last_name) 
            LIMIT 1;
            
            -- Claim the player profile
            PERFORM claim_player_profile(matching_player_id, NEW.id);
            
            -- Update profile status to claimed
            UPDATE profiles 
            SET 
                profile_claim_status = 'claimed',
                claimed_player_id = matching_player_id,
                profile_claim_completed_at = NOW(),
                updated_at = NOW()
            WHERE id = NEW.id;
            
        ELSIF matching_players_count > 1 THEN
            -- Multiple matches - set status to pending for manual selection
            UPDATE profiles 
            SET 
                profile_claim_status = 'pending',
                updated_at = NOW()
            WHERE id = NEW.id;
            
        ELSE
            -- No matches - set status to creation_requested
            UPDATE profiles 
            SET 
                profile_claim_status = 'creation_requested',
                updated_at = NOW()
            WHERE id = NEW.id;
        END IF;
    ELSE
        -- No name provided (e.g., Google OAuth) - set status to pending
        UPDATE profiles 
        SET 
            profile_claim_status = 'pending',
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE LOG 'Error in handle_new_user for user %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments to document these changes
COMMENT ON FUNCTION find_matching_players(TEXT, TEXT) IS 'Finds matching players for claiming, handles NULL values for is_hidden and is_demo_player';
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile for new users using first_name/last_name columns with automatic player matching';
