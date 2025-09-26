-- Add user profile fields for name/surname and terms acceptance
-- This migration extends the profiles table to support the player claim system

-- 1. Add fields to profiles table for user profile information
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS profile_claim_status VARCHAR(20) DEFAULT 'pending' CHECK (profile_claim_status IN ('pending', 'claimed', 'creation_requested', 'completed')),
ADD COLUMN IF NOT EXISTS claimed_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS profile_claim_completed_at TIMESTAMP WITH TIME ZONE;

-- 2. Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_first_name ON profiles(first_name);
CREATE INDEX IF NOT EXISTS idx_profiles_last_name ON profiles(last_name);
CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted ON profiles(terms_accepted);
CREATE INDEX IF NOT EXISTS idx_profiles_profile_claim_status ON profiles(profile_claim_status);
CREATE INDEX IF NOT EXISTS idx_profiles_claimed_player_id ON profiles(claimed_player_id);

-- 3. Create a function to update user profile with name/surname and terms acceptance
CREATE OR REPLACE FUNCTION update_user_profile(
    user_id UUID,
    user_first_name TEXT,
    user_last_name TEXT,
    terms_accepted_value BOOLEAN
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validate that terms are accepted
    IF NOT terms_accepted_value THEN
        RETURN false;
    END IF;
    
    -- Update user profile
    UPDATE profiles 
    SET 
        first_name = user_first_name,
        last_name = user_last_name,
        terms_accepted = true,
        terms_accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create a function to handle new user registration with profile claim
CREATE OR REPLACE FUNCTION handle_new_user_with_profile_claim()
RETURNS TRIGGER AS $$
DECLARE
    matching_players_count INTEGER;
    matching_player_id UUID;
BEGIN
    -- Insert basic profile
    INSERT INTO public.profiles
        (id, email, balance, daily_login_streak, has_received_welcome_bonus, two_factor_enabled, created_at, updated_at)
    VALUES
        (
            NEW.id,
            NEW.email,
            0,
            0,
            false,
            true,
            NEW.created_at,
            NEW.updated_at
        );
    
    -- Send admin notification for new user registration
    PERFORM send_admin_notification(
        'new_user_registered',
        'New User Registered',
        'A new user has registered: ' || NEW.email,
        NEW.id,
        NULL,
        jsonb_build_object(
            'user_email', NEW.email,
            'registration_time', NEW.created_at
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a function to process profile claim after name/surname submission
CREATE OR REPLACE FUNCTION process_profile_claim(
    user_id UUID,
    user_first_name TEXT,
    user_last_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    matching_players RECORD;
    result JSONB;
BEGIN
    -- Find matching players
    SELECT * FROM find_matching_players(user_first_name, user_last_name) LIMIT 1 INTO matching_players;
    
    IF matching_players.id IS NOT NULL THEN
        -- Player found, return claim option
        result := jsonb_build_object(
            'status', 'player_found',
            'player_id', matching_players.id,
            'player_name', matching_players.name,
            'player_surname', matching_players.surname,
            'action', 'claim_profile'
        );
    ELSE
        -- No player found, return creation option
        result := jsonb_build_object(
            'status', 'no_player_found',
            'action', 'create_profile'
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a function to handle player profile claiming
CREATE OR REPLACE FUNCTION handle_player_claim(
    user_id UUID,
    player_id UUID
)
RETURNS JSONB AS $$
DECLARE
    claim_success BOOLEAN;
    player_info RECORD;
    result JSONB;
BEGIN
    -- Attempt to claim the player profile
    SELECT claim_player_profile(player_id, user_id) INTO claim_success;
    
    IF claim_success THEN
        -- Update user profile
        UPDATE profiles 
        SET 
            profile_claim_status = 'claimed',
            claimed_player_id = player_id,
            profile_claim_completed_at = NOW(),
            updated_at = NOW()
        WHERE id = user_id;
        
        -- Get player information
        SELECT name, surname FROM players WHERE id = player_id INTO player_info;
        
        -- Send admin notification
        PERFORM send_admin_notification(
            'player_claimed',
            'Player Profile Claimed',
            'User ' || (SELECT email FROM profiles WHERE id = user_id) || ' has claimed player profile: ' || player_info.name || ' ' || player_info.surname,
            user_id,
            player_id,
            jsonb_build_object(
                'player_name', player_info.name,
                'player_surname', player_info.surname,
                'user_email', (SELECT email FROM profiles WHERE id = user_id)
            )
        );
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Player profile claimed successfully',
            'player_name', player_info.name,
            'player_surname', player_info.surname
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Failed to claim player profile. Player may already be claimed or not found.'
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a function to handle profile creation request
CREATE OR REPLACE FUNCTION handle_profile_creation_request(
    user_id UUID,
    user_first_name TEXT,
    user_last_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    request_success BOOLEAN;
    result JSONB;
BEGIN
    -- Request profile creation
    SELECT request_profile_creation(user_id, user_first_name, user_last_name) INTO request_success;
    
    IF request_success THEN
        -- Update user profile
        UPDATE profiles 
        SET 
            profile_claim_status = 'creation_requested',
            updated_at = NOW()
        WHERE id = user_id;
        
        -- Send admin notification
        PERFORM send_admin_notification(
            'profile_creation_requested',
            'Profile Creation Requested',
            'User ' || (SELECT email FROM profiles WHERE id = user_id) || ' has requested profile creation for: ' || user_first_name || ' ' || user_last_name,
            user_id,
            NULL,
            jsonb_build_object(
                'requested_name', user_first_name,
                'requested_surname', user_last_name,
                'user_email', (SELECT email FROM profiles WHERE id = user_id)
            )
        );
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Profile creation request submitted successfully'
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Failed to submit profile creation request'
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_user_profile(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION process_profile_claim(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_player_claim(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_profile_creation_request(UUID, TEXT, TEXT) TO authenticated;
