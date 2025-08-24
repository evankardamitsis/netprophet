-- Fix RLS performance issues on notifications table
-- Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row

-- Drop the existing problematic policies
DROP POLICY
IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY
IF EXISTS "Users can update their own notifications" ON public.notifications;

-- Recreate the policies with optimized auth.uid() usage
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR
SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR
UPDATE USING ((SELECT auth.uid()
) = user_id);
