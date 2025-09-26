-- Update the player lookup strategy to use surname-first matching
-- This migration updates the check_and_claim_player_for_user function to handle the new strategy

CREATE OR REPLACE FUNCTION public.check_and_claim_player_for_user(user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_profile RECORD;
    surname_matches_count INTEGER;
    exact_matches_count INTEGER;
    matching_player_id UUID;
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

    -- Only proceed if user has first and last name
    IF user_profile.first_name IS NOT NULL AND user_profile.first_name != '' AND
       user_profile.last_name IS NOT NULL AND user_profile.last_name != '' THEN

        -- First, try exact name matching
        SELECT COUNT(*) INTO exact_matches_count
        FROM find_exact_name_matches(user_profile.first_name, user_profile.last_name);

        IF exact_matches_count = 1 THEN
            -- Single exact match - auto-claim
            SELECT id INTO matching_player_id
            FROM find_exact_name_matches(user_profile.first_name, user_profile.last_name)
            LIMIT 1;

            PERFORM claim_player_profile(matching_player_id, user_id);

            UPDATE profiles
            SET
                profile_claim_status = 'claimed',
                claimed_player_id = matching_player_id,
                profile_claim_completed_at = NOW(),
                updated_at = NOW()
            WHERE id = user_id;

            result := jsonb_build_object('success', true, 'status', 'auto_claimed', 'player_id', matching_player_id);
        ELSIF exact_matches_count > 1 THEN
            -- Multiple exact matches, user needs to manually select
            UPDATE profiles
            SET
                profile_claim_status = 'pending',
                updated_at = NOW()
            WHERE id = user_id;
            result := jsonb_build_object('success', true, 'status', 'multiple_exact_matches');
        ELSE
            -- No exact matches, try surname-only matching
            SELECT COUNT(*) INTO surname_matches_count
            FROM find_players_by_surname(user_profile.last_name);

            IF surname_matches_count = 1 THEN
                -- Single surname match - auto-claim
                SELECT id INTO matching_player_id
                FROM find_players_by_surname(user_profile.last_name)
                LIMIT 1;

                PERFORM claim_player_profile(matching_player_id, user_id);

                UPDATE profiles
                SET
                    profile_claim_status = 'claimed',
                    claimed_player_id = matching_player_id,
                    profile_claim_completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = user_id;

                result := jsonb_build_object('success', true, 'status', 'auto_claimed_by_surname', 'player_id', matching_player_id);
            ELSIF surname_matches_count > 1 THEN
                -- Multiple surname matches, user needs to manually select
                UPDATE profiles
                SET
                    profile_claim_status = 'pending',
                    updated_at = NOW()
                WHERE id = user_id;
                result := jsonb_build_object('success', true, 'status', 'multiple_surname_matches');
            ELSE
                -- No matches, user needs to create profile
                UPDATE profiles
                SET
                    profile_claim_status = 'creation_requested',
                    updated_at = NOW()
                WHERE id = user_id;
                result := jsonb_build_object('success', true, 'status', 'creation_requested');
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
COMMENT ON FUNCTION public.check_and_claim_player_for_user(UUID) IS 'Updated player lookup function with surname-first matching strategy';
