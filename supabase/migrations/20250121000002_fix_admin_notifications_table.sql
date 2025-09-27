-- Fix the admin_notifications table structure
-- First, drop the existing table if it exists with wrong structure
DROP TABLE IF EXISTS admin_notifications CASCADE;

-- Recreate the admin_notifications table with correct structure
CREATE TABLE admin_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('user_registration', 'profile_claim')),
    user_id UUID NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Add foreign key constraint
    CONSTRAINT fk_admin_notifications_user_id 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_notifications_status_created 
    ON admin_notifications(status, created_at);

-- Create trigger function for new user registrations
CREATE OR REPLACE FUNCTION trigger_admin_user_registration_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert notification record
    INSERT INTO admin_notifications (type, user_id)
    VALUES ('user_registration', NEW.id);
    
    RETURN NEW;
END;
$$;

-- Create trigger function for profile claims
CREATE OR REPLACE FUNCTION trigger_admin_profile_claim_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only send notification if this is a new player record (profile claim)
    -- and the user_id is not null (indicating a real user claim)
    IF NEW.user_id IS NOT NULL AND (OLD IS NULL OR OLD.user_id IS NULL OR OLD.user_id != NEW.user_id) THEN
        -- Insert notification record
        INSERT INTO admin_notifications (type, user_id)
        VALUES ('profile_claim', NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS admin_user_registration_trigger ON profiles;
CREATE TRIGGER admin_user_registration_trigger
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_admin_user_registration_notification();

DROP TRIGGER IF EXISTS admin_profile_claim_trigger ON players;
CREATE TRIGGER admin_profile_claim_trigger
    AFTER INSERT OR UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION trigger_admin_profile_claim_notification();

-- Create function to get pending notifications (simplified version without HTTP calls)
CREATE OR REPLACE FUNCTION get_pending_admin_notifications()
RETURNS TABLE(
    id UUID,
    type TEXT,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        an.id,
        an.type,
        an.user_id,
        an.created_at
    FROM admin_notifications an
    WHERE an.status = 'pending'
    ORDER BY an.created_at ASC
    LIMIT 50;
END;
$$;

-- Create function to mark notification as processed
CREATE OR REPLACE FUNCTION mark_admin_notification_processed(
    notification_id UUID,
    success BOOLEAN,
    error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF success THEN
        UPDATE admin_notifications 
        SET status = 'sent', sent_at = NOW()
        WHERE id = notification_id;
    ELSE
        UPDATE admin_notifications 
        SET status = 'failed', error_message = mark_admin_notification_processed.error_message
        WHERE id = notification_id;
    END IF;
END;
$$;
