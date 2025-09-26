-- Add automatic player lookup for existing users during login
-- This migration creates a function to check and claim players for existing users

-- Create a function to perform automatic player lookup for existing users
CREATE OR REPLACE FUNCTION check_and_claim_player_for_user(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_profile RECORD;
    matching_players_count INTEGER;
    matching_player_id UUID;
    result JSONB;
BEGIN
    -- Get user profile information
    SELECT first_name, last_name, profile_claim_status, claimed_player_id
    INTO user_profile
    FROM profiles 
    WHERE id = user_id;
    
    -- If user already has a claimed player, return success
    IF user_profile.claimed_player_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Player already claimed',
            'player_id', user_profile.claimed_player_id,
            'status', 'already_claimed'
        );
    END IF;
    
    -- If user doesn't have first_name and last_name, can't do lookup
    IF user_profile.first_name IS NULL OR user_profile.first_name = '' OR 
       user_profile.last_name IS NULL OR user_profile.last_name = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No name information available for lookup',
            'status', 'no_name_info'
        );
    END IF;
    
    -- Count matching players
    SELECT COUNT(*) INTO matching_players_count 
    FROM find_matching_players(user_profile.first_name, user_profile.last_name);
    
    -- If we found exactly one match, automatically claim it
    IF matching_players_count = 1 THEN
        SELECT id INTO matching_player_id 
        FROM find_matching_players(user_profile.first_name, user_profile.last_name) 
        LIMIT 1;
        
        -- Claim the player profile
        PERFORM claim_player_profile(matching_player_id, user_id);
        
        -- Update profile status to claimed
        UPDATE profiles 
        SET 
            profile_claim_status = 'claimed',
            claimed_player_id = matching_player_id,
            profile_claim_completed_at = NOW(),
            updated_at = NOW()
        WHERE id = user_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Player automatically claimed',
            'player_id', matching_player_id,
            'status', 'auto_claimed'
        );
        
    ELSIF matching_players_count > 1 THEN
        -- Multiple matches - set status to pending for manual selection
        UPDATE profiles 
        SET 
            profile_claim_status = 'pending',
            updated_at = NOW()
        WHERE id = user_id;
        
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Multiple players found, manual selection required',
            'status', 'multiple_matches'
        );
        
    ELSE
        -- No matches - set status to creation_requested
        UPDATE profiles 
        SET 
            profile_claim_status = 'creation_requested',
            updated_at = NOW()
        WHERE id = user_id;
        
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No matching players found',
            'status', 'no_matches'
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error during player lookup: ' || SQLERRM,
            'status', 'error'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document this function
COMMENT ON FUNCTION check_and_claim_player_for_user(UUID) IS 'Performs automatic player lookup and claiming for existing users during login';
