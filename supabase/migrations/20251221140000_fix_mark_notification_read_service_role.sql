-- Fix mark_notification_read to work with service role
-- The API route uses service role, so auth.uid() is NULL
-- We need to accept an optional user_id parameter

-- Drop old function signatures if they exist (to avoid conflicts)
DROP FUNCTION IF EXISTS mark_notification_read(UUID);
DROP FUNCTION IF EXISTS mark_all_notifications_read();

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin_user BOOLEAN;
    user_id_to_use UUID;
BEGIN
    -- Determine which user ID to use
    -- If p_user_id is provided, use it (for service role calls)
    -- Otherwise, use auth.uid() (for direct authenticated calls)
    user_id_to_use := COALESCE(p_user_id, auth.uid());
    
    -- If still NULL, check if we're running as service_role
    IF user_id_to_use IS NULL THEN
        -- Service role can bypass admin check (it's already trusted)
        IF auth.role() = 'service_role' THEN
            -- For service role, we can't set read_by, so leave it NULL
            UPDATE public.admin_in_app_notifications
            SET 
                is_read = TRUE,
                read_at = NOW(),
                updated_at = NOW()
            WHERE id = p_notification_id;
            
            RETURN FOUND;
        ELSE
            RAISE EXCEPTION 'User ID is required';
        END IF;
    END IF;
    
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id_to_use AND is_admin = true
    ) INTO is_admin_user;

    IF NOT is_admin_user THEN
        RAISE EXCEPTION 'Only admins can mark notifications as read';
    END IF;

    -- Update notification
    UPDATE public.admin_in_app_notifications
    SET 
        is_read = TRUE,
        read_at = NOW(),
        read_by = user_id_to_use,
        updated_at = NOW()
    WHERE id = p_notification_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(
    p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
    is_admin_user BOOLEAN;
    user_id_to_use UUID;
BEGIN
    -- Determine which user ID to use
    user_id_to_use := COALESCE(p_user_id, auth.uid());
    
    -- If still NULL, check if we're running as service_role
    IF user_id_to_use IS NULL THEN
        -- Service role can bypass admin check
        IF auth.role() = 'service_role' THEN
            -- For service role, we can't set read_by, so leave it NULL
            UPDATE public.admin_in_app_notifications
            SET 
                is_read = TRUE,
                read_at = NOW(),
                updated_at = NOW()
            WHERE is_read = FALSE;
            
            GET DIAGNOSTICS updated_count = ROW_COUNT;
            RETURN updated_count;
        ELSE
            RAISE EXCEPTION 'User ID is required';
        END IF;
    END IF;
    
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id_to_use AND is_admin = true
    ) INTO is_admin_user;

    IF NOT is_admin_user THEN
        RAISE EXCEPTION 'Only admins can mark notifications as read';
    END IF;

    -- Update all unread notifications
    UPDATE public.admin_in_app_notifications
    SET 
        is_read = TRUE,
        read_at = NOW(),
        read_by = user_id_to_use,
        updated_at = NOW()
    WHERE is_read = FALSE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comments (specify full function signatures to avoid ambiguity)
COMMENT ON FUNCTION mark_notification_read(UUID, UUID) IS 'Marks a notification as read. Can be called with user_id parameter when using service role.';
COMMENT ON FUNCTION mark_all_notifications_read(UUID) IS 'Marks all notifications as read. Can be called with user_id parameter when using service role.';

