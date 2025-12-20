-- Create admin in-app notifications system
-- This is separate from email notifications and provides real-time in-app alerts

-- Create the admin_in_app_notifications table
CREATE TABLE IF NOT EXISTS public.admin_in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- e.g., 'user_registration', 'profile_creation_request', 'large_bet', 'system_error', 'tournament_update'
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')), -- info, warning, error, success
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional context data (user_id, tournament_id, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    read_by UUID REFERENCES auth.users(id), -- Which admin read it
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT admin_notifications_type_check CHECK (type IN (
        'user_registration',
        'profile_creation_request',
        'profile_activated',
        'large_bet',
        'system_error',
        'tournament_created',
        'tournament_updated',
        'match_result_entered',
        'payment_received',
        'user_deleted',
        'player_created',
        'player_updated',
        'suspicious_activity',
        'wallet_issue',
        'other'
    ))
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_in_app_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity ON public.admin_in_app_notifications(severity);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_in_app_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_in_app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON public.admin_in_app_notifications(is_read, created_at DESC) WHERE is_read = FALSE;

-- Enable RLS
ALTER TABLE public.admin_in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running migration)
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.admin_in_app_notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON public.admin_in_app_notifications;

-- RLS Policy: Only admins can view notifications
CREATE POLICY "Admins can view all notifications" ON public.admin_in_app_notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- RLS Policy: Only admins can update notifications (mark as read)
CREATE POLICY "Admins can update notifications" ON public.admin_in_app_notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- RLS Policy: System can insert notifications (via service role)
-- This will be done via service role key, so we allow inserts from service role
-- Regular users cannot insert notifications

-- Function to create an admin notification
-- Required parameters first, then optional ones with defaults
CREATE OR REPLACE FUNCTION create_admin_notification(
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_severity TEXT DEFAULT 'info',
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Validate type
    IF p_type NOT IN (
        'user_registration', 'profile_creation_request', 'profile_activated',
        'large_bet', 'system_error', 'tournament_created', 'tournament_updated',
        'match_result_entered', 'payment_received', 'user_deleted',
        'player_created', 'player_updated', 'suspicious_activity',
        'wallet_issue', 'other'
    ) THEN
        RAISE EXCEPTION 'Invalid notification type: %', p_type;
    END IF;

    -- Validate severity
    IF p_severity NOT IN ('info', 'warning', 'error', 'success') THEN
        RAISE EXCEPTION 'Invalid severity: %', p_severity;
    END IF;

    -- Insert notification
    INSERT INTO public.admin_in_app_notifications (
        type,
        severity,
        title,
        message,
        metadata
    )
    VALUES (
        p_type,
        p_severity,
        p_title,
        p_message,
        p_metadata
    )
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin_user BOOLEAN;
BEGIN
    -- Check if current user is admin
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    ) INTO is_admin_user;

    IF NOT is_admin_user THEN
        RAISE EXCEPTION 'Only admins can mark notifications as read';
    END IF;

    -- Update notification
    UPDATE public.admin_in_app_notifications
    SET 
        is_read = TRUE,
        read_at = NOW(),
        read_by = auth.uid(),
        updated_at = NOW()
    WHERE id = p_notification_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
    is_admin_user BOOLEAN;
BEGIN
    -- Check if current user is admin
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    ) INTO is_admin_user;

    IF NOT is_admin_user THEN
        RAISE EXCEPTION 'Only admins can mark notifications as read';
    END IF;

    -- Update all unread notifications
    UPDATE public.admin_in_app_notifications
    SET 
        is_read = TRUE,
        read_at = NOW(),
        read_by = auth.uid(),
        updated_at = NOW()
    WHERE is_read = FALSE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    -- Check if current user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    ) THEN
        RETURN 0;
    END IF;

    SELECT COUNT(*) INTO unread_count
    FROM public.admin_in_app_notifications
    WHERE is_read = FALSE;

    RETURN unread_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON TABLE public.admin_in_app_notifications IS 'In-app notifications for admins to track important system activities';
COMMENT ON FUNCTION create_admin_notification IS 'Creates a new admin notification (callable via service role)';
COMMENT ON FUNCTION mark_notification_read IS 'Marks a notification as read by the current admin user';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Marks all notifications as read by the current admin user';
COMMENT ON FUNCTION get_unread_notification_count IS 'Returns the count of unread notifications for the current admin user';

-- Enable Realtime for the notifications table (for real-time updates in admin UI)
-- Note: This requires the supabase_realtime publication to exist
-- If it doesn't exist, you may need to enable it via Supabase Dashboard or create it manually
DO $$
BEGIN
    -- Try to add table to realtime publication
    -- This will fail silently if publication doesn't exist, which is fine
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE admin_in_app_notifications;
    EXCEPTION
        WHEN undefined_object THEN
            -- Publication doesn't exist, skip (can be enabled via dashboard)
            RAISE NOTICE 'supabase_realtime publication not found. Enable Realtime via Supabase Dashboard.';
    END;
END $$;
