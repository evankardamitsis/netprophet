-- Add demo player field and update existing players
-- This migration adds the is_demo_player field and sets existing players as demo players

-- 1. Add is_demo_player field to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS is_demo_player BOOLEAN DEFAULT false;

-- 2. Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_players_is_demo_player ON players(is_demo_player);

-- 3. Update all existing players to be demo players
-- This ensures existing players don't go through the claim process
UPDATE players 
SET 
    is_demo_player = true,
    is_hidden = false,
    is_active = true
WHERE is_demo_player = false;

-- 4. Drop and recreate the find_matching_players function to exclude demo players
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
        AND p.is_hidden = true
        AND p.claimed_by_user_id IS NULL
        AND p.is_demo_player = false  -- Exclude demo players from matching
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update the claim_player_profile function to prevent claiming demo players
CREATE OR REPLACE FUNCTION claim_player_profile(
    player_id UUID,
    user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    player_exists BOOLEAN;
    is_demo_player BOOLEAN;
BEGIN
    -- Check if player exists, is not already claimed, and is not a demo player
    SELECT EXISTS(
        SELECT 1 FROM players 
        WHERE id = player_id 
        AND is_hidden = true 
        AND claimed_by_user_id IS NULL
        AND is_demo_player = false
    ) INTO player_exists;
    
    IF NOT player_exists THEN
        RETURN false;
    END IF;
    
    -- Update player to be claimed and active
    UPDATE players 
    SET 
        is_hidden = false,
        is_active = true,
        claimed_by_user_id = user_id,
        claimed_at = NOW()
    WHERE id = player_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a function to check if a user has a demo player profile
CREATE OR REPLACE FUNCTION get_user_demo_player(user_id UUID)
RETURNS TABLE (
    player_id UUID,
    player_name TEXT,
    player_surname TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name
    FROM players p
    WHERE 
        p.claimed_by_user_id = user_id 
        AND p.is_demo_player = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a function to handle demo player assignment for new users
CREATE OR REPLACE FUNCTION assign_demo_player_to_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    demo_player_id UUID;
    user_email TEXT;
BEGIN
    -- Get user email for logging
    SELECT email INTO user_email FROM profiles WHERE id = user_id;
    
    -- Find an available demo player (not claimed by anyone)
    SELECT id INTO demo_player_id 
    FROM players 
    WHERE is_demo_player = true 
    AND claimed_by_user_id IS NULL 
    LIMIT 1;
    
    IF demo_player_id IS NULL THEN
        -- No demo players available, create a generic one
        INSERT INTO players (
            first_name,
            last_name,
            ntrp_rating,
            wins,
            losses,
            last5,
            current_streak,
            streak_type,
            surface_preference,
            surface_win_rates,
            aggressiveness,
            stamina,
            consistency,
            age,
            hand,
            injury_status,
            is_demo_player,
            is_hidden,
            is_active,
            claimed_by_user_id,
            claimed_at
        ) VALUES (
            'Demo',
            'Player',
            4.0,
            0,
            0,
            '{}',
            0,
            'W',
            'Hard Court',
            '{}',
            5,
            5,
            5,
            25,
            'right',
            'healthy',
            true,
            false,
            true,
            user_id,
            NOW()
        ) RETURNING id INTO demo_player_id;
    ELSE
        -- Assign existing demo player to user
        UPDATE players 
        SET 
            claimed_by_user_id = user_id,
            claimed_at = NOW()
        WHERE id = demo_player_id;
    END IF;
    
    -- Update user profile to reflect demo player assignment
    UPDATE profiles 
    SET 
        profile_claim_status = 'completed',
        claimed_player_id = demo_player_id,
        profile_claim_completed_at = NOW(),
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Update the handle_new_user_with_profile_claim function to assign demo players
CREATE OR REPLACE FUNCTION handle_new_user_with_profile_claim()
RETURNS TRIGGER AS $$
DECLARE
    demo_assigned BOOLEAN;
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
    
    -- Assign a demo player to the user immediately
    SELECT assign_demo_player_to_user(NEW.id) INTO demo_assigned;
    
    -- Send admin notification for new user registration
    PERFORM send_admin_notification(
        'new_user_registered',
        'New User Registered',
        'A new user has registered: ' || NEW.email || ' (Demo player assigned)',
        NEW.id,
        NULL,
        jsonb_build_object(
            'user_email', NEW.email,
            'registration_time', NEW.created_at,
            'demo_player_assigned', demo_assigned
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_demo_player(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_demo_player_to_user(UUID) TO authenticated;
