-- Update handle_new_user function to extract and store first_name and last_name from user metadata
-- This allows automatic profile lookup for email/password registrations

-- Update the handle_new_user function to extract name fields from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user
()
RETURNS TRIGGER AS $$
DECLARE
    user_first_name TEXT;
    user_last_name TEXT;
    matching_players_count INTEGER;
    matching_player_id UUID;
BEGIN
    -- Extract first_name and last_name from user metadata
    user_first_name := COALESCE
(NEW.raw_user_meta_data->>'first_name', '');
    user_last_name := COALESCE
(NEW.raw_user_meta_data->>'last_name', '');

-- Insert basic profile with name fields
INSERT INTO public.profiles
    (id, email, first_name, last_name, balance, daily_login_streak, has_received_welcome_bonus, two_factor_enabled, created_at, updated_at)
VALUES
    (
        NEW.id,
        NEW.email,
        user_first_name,
        user_last_name,
        0, -- Explicitly set balance to 0
        0, -- Set daily login streak to 0
        false, -- Set welcome bonus flag to false
        true, -- Enable 2FA by default for all new users
        NEW.created_at,
        NEW.updated_at
        );

-- If we have both first and last name, try to find matching players
IF user_first_name != '' AND user_last_name != '' THEN
-- Count matching players
SELECT COUNT(*)
INTO matching_players_count
FROM find_matching_players(user_first_name, user_last_name);

-- If we found exactly one match, automatically claim it
IF matching_players_count = 1 THEN
SELECT id
INTO matching_player_id
FROM find_matching_players(user_first_name, user_last_name)
            LIMIT
1;
            
            -- Claim the player profile
            PERFORM claim_player_profile
(matching_player_id, NEW.id);

-- Update profile status
UPDATE profiles 
            SET 
                profile_claim_status = 'claimed',
                claimed_player_id = matching_player_id,
                profile_claim_completed_at = NOW(),
                updated_at = NOW()
            WHERE id = NEW.id;

-- Send admin notification for automatic claim
PERFORM send_admin_notification
(
                'player_claimed',
                'Player Profile Auto-Claimed',
                'User ' || NEW.email || ' has automatically claimed player profile: ' || user_first_name || ' ' || user_last_name,
                NEW.id,
                matching_player_id,
                jsonb_build_object
(
                    'player_first_name', user_first_name,
                    'player_last_name', user_last_name,
                    'user_email', NEW.email,
                    'auto_claimed', true
                )
            );
        ELSIF matching_players_count > 1 THEN
-- Multiple matches - set status to pending for manual selection
UPDATE profiles 
            SET 
                profile_claim_status = 'pending',
                updated_at = NOW()
            WHERE id = NEW.id;

-- Send admin notification for multiple matches
PERFORM send_admin_notification
(
                'multiple_player_matches',
                'Multiple Player Matches Found',
                'User ' || NEW.email || ' has multiple matching player profiles. Manual review required.',
                NEW.id,
                NULL,
                jsonb_build_object
(
                    'user_first_name', user_first_name,
                    'user_last_name', user_last_name,
                    'user_email', NEW.email,
                    'matches_count', matching_players_count
                )
            );
        ELSE
-- No matches found - set status to pending for profile creation request
UPDATE profiles 
            SET 
                profile_claim_status = 'pending',
                updated_at = NOW()
            WHERE id = NEW.id;
END
IF;
    ELSE
        -- No name provided (e.g., Google OAuth) - set status to pending
        UPDATE profiles 
        SET 
            profile_claim_status = 'pending',
            updated_at = NOW()
        WHERE id = NEW.id;
END
IF;
    
    -- Send admin notification for new user registration
    PERFORM send_admin_notification
(
        'new_user_registered',
        'New User Registered',
        'A new user has registered: ' || NEW.email,
        NEW.id,
        NULL,
        jsonb_build_object
(
            'user_email', NEW.email,
            'user_first_name', user_first_name,
            'user_last_name', user_last_name,
            'registration_time', NEW.created_at,
            'has_name_fields',
(user_first_name != '' AND user_last_name != '')
        )
    );

RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document this change
COMMENT ON FUNCTION public.handle_new_user
() IS 'Creates profile for new users with automatic player matching for email/password registrations';
