-- Fix demo player assignment - mark existing players as demo players
-- This migration corrects the demo player assignment logic

-- 1. Remove demo player assignments from users (they shouldn't have demo players)
UPDATE profiles 
SET 
    profile_claim_status = 'pending',
    claimed_player_id = NULL,
    profile_claim_completed_at = NULL
WHERE claimed_player_id IS NOT NULL;

-- 2. Mark all existing players in the players table as demo players
UPDATE players 
SET 
    is_demo_player = true,
    is_hidden = false,
    is_active = true,
    claimed_by_user_id = NULL,
    claimed_at = NULL
WHERE is_demo_player = false;

-- 3. Update the user registration trigger to NOT assign demo players automatically
CREATE OR REPLACE FUNCTION handle_new_user_with_profile_claim()
RETURNS TRIGGER AS $$
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

-- 4. Create a function to get available demo players (for display purposes)
CREATE OR REPLACE FUNCTION get_demo_players()
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    is_demo_player BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.is_demo_player
    FROM players p
    WHERE p.is_demo_player = true
    ORDER BY p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION get_demo_players() TO authenticated;
