-- Fix request_profile_creation to include all required NOT NULL fields
-- This creates a "draft" player profile that admins will later edit with correct information

CREATE OR REPLACE FUNCTION request_profile_creation
(
    user_id UUID,
    user_name TEXT,
    user_surname TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Insert a profile creation request with placeholder data for all required fields
    -- Admins will update these values with actual tennis information before activating
    INSERT INTO players
        (
        first_name,
        last_name,
        ntrp_rating,
        streak_type,
        surface_preference,
        age,
        hand,
        is_hidden,
        is_active,
        is_demo_player,
        profile_creation_requested,
        profile_creation_requested_by,
        profile_creation_requested_at
        )
    VALUES
        (
            user_name,
            user_surname,
            0.0, -- Placeholder NTRP rating (admins will update)
            'W', -- Placeholder streak type
            'Hard Court', -- Placeholder surface preference
            25, -- Placeholder age (admins will update)
            'right', -- Placeholder hand (admins will update)
            true, -- Hidden until admin activates
            false, -- Inactive until admin approves
            false, -- Not a demo player
            true, -- Mark as creation requested
            user_id, -- Who requested it
            NOW()             -- When it was requested
    );

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION request_profile_creation
(UUID, TEXT, TEXT) IS 'Creates a draft player profile with placeholder data. Admins will edit with correct tennis information before activation.';
