-- Fix automatic player lookup to always set pending when matches are found
-- This migration updates the check_and_claim_player_for_user function to always set status to 'pending' for matches
-- and respect user's manual decisions (creation_requested, claimed, completed)

CREATE OR REPLACE FUNCTION public.check_and_claim_player_for_user(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_profile RECORD;
    surname_matches_count INTEGER;
    exact_matches_count INTEGER;
    result JSONB;
BEGIN
    -- Fetch user profile to get first_name and last_name
    SELECT first_name, last_name, profile_claim_status
    INTO user_profile
    FROM public.profiles
    WHERE id = user_id;

    -- If profile is already claimed or completed, no need to run lookup
    IF user_profile.profile_claim_status = 'claimed' OR user_profile.profile_claim_status = 'completed' THEN
        RETURN jsonb_build_object('success', true, 'status', 'already_claimed');
    END IF;

    -- If user has manually requested creation or is waiting for admin approval, don't override
    IF user_profile.profile_claim_status = 'creation_requested' THEN
        RETURN jsonb_build_object('success', true, 'status', 'creation_requested');
    END IF;

    -- Only proceed if user has first and last name
    IF user_profile.first_name IS NOT NULL AND user_profile.first_name != '' AND
       user_profile.last_name IS NOT NULL AND user_profile.last_name != '' THEN
        
        -- Check for exact matches first
        SELECT COUNT(*) INTO exact_matches_count
        FROM find_matching_players(user_profile.first_name, user_profile.last_name);

        IF exact_matches_count >= 1 THEN
            -- Found exact matches - always set status to pending for manual claim
            UPDATE profiles
            SET
                profile_claim_status = 'pending',
                updated_at = NOW()
            WHERE id = user_id;
            
            IF exact_matches_count = 1 THEN
                result := jsonb_build_object('success', true, 'status', 'exact_match_found');
            ELSE
                result := jsonb_build_object('success', true, 'status', 'multiple_exact_matches');
            END IF;
        ELSE
            -- No exact matches, try surname-only matching
            SELECT COUNT(*) INTO surname_matches_count
            FROM find_players_by_surname(user_profile.last_name);

            IF surname_matches_count >= 1 THEN
                -- Found surname matches - always set status to pending for manual claim
                UPDATE profiles
                SET
                    profile_claim_status = 'pending',
                    updated_at = NOW()
                WHERE id = user_id;
                
                IF surname_matches_count = 1 THEN
                    result := jsonb_build_object('success', true, 'status', 'surname_match_found');
                ELSE
                    result := jsonb_build_object('success', true, 'status', 'multiple_surname_matches');
                END IF;
            ELSE
                -- No matches found - don't set any status, let user decide
                result := jsonb_build_object('success', true, 'status', 'no_matches_found');
            END IF;
        END IF;
    ELSE
        -- No name provided in profile, user needs to complete profile setup
        result := jsonb_build_object('success', true, 'status', 'name_missing');
    END IF;

    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in check_and_claim_player_for_user for user %: %', user_id, SQLERRM;
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document the updated function
COMMENT ON FUNCTION public.check_and_claim_player_for_user(UUID) IS 'Updated to always set pending status for matches, respecting manual user decisions';
