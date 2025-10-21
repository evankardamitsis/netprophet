-- Fix RLS performance issue on notifications table for delete policy
-- Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row

-- Drop the existing problematic policy
DROP POLICY
IF EXISTS "Users can delete their own notifications" ON public.notifications;

-- Recreate the policy with optimized auth.uid() usage
CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR
DELETE USING ((
SELECT auth.uid()
) = user_id);
