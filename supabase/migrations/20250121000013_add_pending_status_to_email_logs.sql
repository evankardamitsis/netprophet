-- Add 'pending' status to email_logs table constraint
-- This allows emails to be created with pending status for processing

-- Drop the existing check constraint
ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_status_check;

-- Add the new check constraint that includes 'pending' status
ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_status_check 
    CHECK (status IN ('sent', 'failed', 'delivered', 'bounced', 'pending'));

-- Add comment for documentation
COMMENT ON CONSTRAINT email_logs_status_check ON public.email_logs IS 'Email status constraint - includes pending status for processing queue';
