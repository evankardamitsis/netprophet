-- Add player matching logic to handle_new_user function
-- This migration updates the function to perform automatic player lookup and claiming

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
    
    -- Insert profile with correct column names
    INSERT INTO public.profiles
        (
            id, 
            email, 
            firstName, 
            lastName, 
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

-- Add comment to document this change
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile for new users with automatic player matching and claiming';
