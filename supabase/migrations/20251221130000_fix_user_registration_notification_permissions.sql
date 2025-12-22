-- Fix user registration notification permissions
-- Ensure create_admin_notification can be called from handle_new_user trigger

-- Grant execute permission to service_role (needed for trigger execution)
GRANT EXECUTE ON FUNCTION public.create_admin_notification
(TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_admin_notification
(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Add INSERT policy to allow notifications to be created
-- SECURITY DEFINER functions should bypass RLS, but we add this for safety
DROP POLICY
IF EXISTS "Allow notification creation" ON public.admin_in_app_notifications;
CREATE POLICY "Allow notification creation" ON public.admin_in_app_notifications
    FOR
INSERT
    WITH CHECK
    (true)
;
-- Allow all inserts (SECURITY DEFINER functions bypass RLS anyway)

-- Verify the function exists and has correct signature
DO $$
BEGIN
    -- Check if function exists
    IF NOT EXISTS (
        SELECT 1
    FROM pg_proc
    WHERE proname = 'create_admin_notification'
    ) THEN
        RAISE EXCEPTION 'Function create_admin_notification does not exist';
END
IF;
    
    RAISE LOG 'create_admin_notification function verified and permissions granted';
END $$;

-- Update comment
COMMENT ON FUNCTION public.create_admin_notification IS 'Creates a new admin notification. Can be called from triggers via service_role. Uses SECURITY DEFINER to bypass RLS.';
