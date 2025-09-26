-- Implement player profile claim system
-- This migration adds the necessary fields and functionality for users to claim player profiles

-- 1. Add fields to players table for profile claiming
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS claimed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS profile_creation_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_creation_requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS profile_creation_requested_at TIMESTAMP WITH TIME ZONE;

-- 2. Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_players_is_hidden ON players(is_hidden);
CREATE INDEX IF NOT EXISTS idx_players_is_active ON players(is_active);
CREATE INDEX IF NOT EXISTS idx_players_claimed_by_user_id ON players(claimed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_players_first_name_last_name ON players(first_name, last_name);

-- 3. Create a function to find matching players by name and surname
CREATE OR REPLACE FUNCTION find_matching_players(
    search_name TEXT,
    search_surname TEXT
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    surname TEXT,
    is_hidden BOOLEAN,
    is_active BOOLEAN,
    claimed_by_user_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.is_hidden,
        p.is_active,
        p.claimed_by_user_id
    FROM players p
    WHERE 
        LOWER(p.first_name) = LOWER(search_name) 
        AND LOWER(p.last_name) = LOWER(search_surname)
        AND p.is_hidden = true
        AND p.claimed_by_user_id IS NULL
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create a function to claim a player profile
CREATE OR REPLACE FUNCTION claim_player_profile(
    player_id UUID,
    user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    player_exists BOOLEAN;
    already_claimed BOOLEAN;
BEGIN
    -- Check if player exists and is not already claimed
    SELECT EXISTS(
        SELECT 1 FROM players 
        WHERE id = player_id 
        AND is_hidden = true 
        AND claimed_by_user_id IS NULL
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

-- 5. Create a function to request profile creation
CREATE OR REPLACE FUNCTION request_profile_creation(
    user_id UUID,
    user_name TEXT,
    user_surname TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Insert a profile creation request
    INSERT INTO players (
        first_name,
        last_name,
        is_hidden,
        is_active,
        profile_creation_requested,
        profile_creation_requested_by,
        profile_creation_requested_at
    ) VALUES (
        user_name,
        user_surname,
        true,
        false,
        true,
        user_id,
        NOW()
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a table for admin notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('player_claimed', 'profile_creation_requested', 'new_user_registered')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 7. Create indexes for admin notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at);

-- 8. Enable RLS on admin_notifications
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for admin_notifications
CREATE POLICY "Admins can view all notifications" ON admin_notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "System can insert notifications" ON admin_notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update notifications" ON admin_notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- 10. Create a function to send admin notifications
CREATE OR REPLACE FUNCTION send_admin_notification(
    notification_type VARCHAR(50),
    notification_title VARCHAR(200),
    notification_message TEXT,
    target_user_id UUID DEFAULT NULL,
    target_player_id UUID DEFAULT NULL,
    notification_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO admin_notifications (
        type,
        title,
        message,
        user_id,
        player_id,
        metadata
    ) VALUES (
        notification_type,
        notification_title,
        notification_message,
        target_user_id,
        target_player_id,
        notification_metadata
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant necessary permissions
GRANT EXECUTE ON FUNCTION find_matching_players(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_player_profile(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION request_profile_creation(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_admin_notification(VARCHAR, VARCHAR, TEXT, UUID, UUID, JSONB) TO authenticated;
