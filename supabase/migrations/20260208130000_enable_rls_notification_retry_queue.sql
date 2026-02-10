-- Enable RLS on notification_retry_queue (backend queue; only service_role should access)
ALTER TABLE public.notification_retry_queue ENABLE ROW LEVEL SECURITY;

-- Restrict access to service_role only (anon/authenticated get no rows)
DROP POLICY IF EXISTS "Service role can manage notification_retry_queue" ON public.notification_retry_queue;
CREATE POLICY "Service role can manage notification_retry_queue"
    ON public.notification_retry_queue
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
