-- Create email logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    to_email TEXT NOT NULL,
    template TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('promotional', 'notification', 'admin', '2fa')),
    language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'el')),
    variables JSONB DEFAULT '{}',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'delivered', 'bounced'))
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON public.email_logs(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email logs
-- Only admins can view email logs
CREATE POLICY "Admins can view email logs" ON public.email_logs
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE is_admin = true
        )
    );

-- System can insert email logs
CREATE POLICY "System can insert email logs" ON public.email_logs
    FOR INSERT WITH CHECK (true);

-- Create function to send 2FA email
CREATE OR REPLACE FUNCTION send_2fa_email(
    user_uuid UUID,
    user_email TEXT,
    verification_code TEXT,
    user_language TEXT DEFAULT 'en'
)
RETURNS void AS $$
DECLARE
    template_variables JSONB;
BEGIN
    -- Prepare template variables
    template_variables := jsonb_build_object(
        'code', verification_code,
        'user_email', user_email
    );

    -- Insert email log (the actual sending is handled by the Edge Function)
    INSERT INTO public.email_logs (
        user_id,
        to_email,
        template,
        type,
        language,
        variables,
        status
    ) VALUES (
        user_uuid,
        user_email,
        '2fa_code',
        '2fa',
        user_language,
        template_variables,
        'pending'
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to send winnings notification email
CREATE OR REPLACE FUNCTION send_winnings_email(
    user_uuid UUID,
    user_email TEXT,
    match_name TEXT,
    prediction TEXT,
    winnings_amount INTEGER,
    user_language TEXT DEFAULT 'en'
)
RETURNS void AS $$
DECLARE
    template_variables JSONB;
BEGIN
    -- Prepare template variables
    template_variables := jsonb_build_object(
        'match', match_name,
        'prediction', prediction,
        'winnings', winnings_amount
    );

    -- Insert email log
    INSERT INTO public.email_logs (
        user_id,
        to_email,
        template,
        type,
        language,
        variables,
        status
    ) VALUES (
        user_uuid,
        user_email,
        'winnings_notification',
        'notification',
        user_language,
        template_variables,
        'pending'
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to send promotional email
CREATE OR REPLACE FUNCTION send_promotional_email(
    user_uuid UUID,
    user_email TEXT,
    featured_matches JSONB,
    user_language TEXT DEFAULT 'en'
)
RETURNS void AS $$
DECLARE
    template_variables JSONB;
BEGIN
    -- Prepare template variables
    template_variables := jsonb_build_object(
        'matches', featured_matches
    );

    -- Insert email log
    INSERT INTO public.email_logs (
        user_id,
        to_email,
        template,
        type,
        language,
        variables,
        status
    ) VALUES (
        user_uuid,
        user_email,
        'promotional_update',
        'promotional',
        user_language,
        template_variables,
        'pending'
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to send admin alert email
CREATE OR REPLACE FUNCTION send_admin_alert_email(
    alert_type TEXT,
    message TEXT,
    details JSONB DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    template_variables JSONB;
    admin_emails TEXT[];
    admin_record RECORD;
BEGIN
    -- Get all admin emails
    SELECT ARRAY_AGG(email) INTO admin_emails
    FROM auth.users u
    JOIN profiles p ON u.id = p.id
    WHERE p.is_admin = true;

    -- Prepare template variables
    template_variables := jsonb_build_object(
        'alert_type', alert_type,
        'message', message,
        'details', COALESCE(details::text, ''),
        'timestamp', NOW()::text
    );

    -- Insert email logs for each admin
    FOREACH admin_record.email IN ARRAY admin_emails
    LOOP
        INSERT INTO public.email_logs (
            user_id,
            to_email,
            template,
            type,
            language,
            variables,
            status
        ) VALUES (
            NULL, -- No specific user for admin alerts
            admin_record.email,
            'admin_alert',
            'admin',
            'en', -- Admin emails in English
            template_variables,
            'pending'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_2fa_email(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_winnings_email(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_promotional_email(UUID, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_admin_alert_email(TEXT, TEXT, JSONB) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.email_logs IS 'Logs of all emails sent through the system for tracking and debugging';
COMMENT ON FUNCTION send_2fa_email IS 'Sends 2FA verification code email to user';
COMMENT ON FUNCTION send_winnings_email IS 'Sends winnings notification email to user';
COMMENT ON FUNCTION send_promotional_email IS 'Sends promotional email with featured matches to user';
COMMENT ON FUNCTION send_admin_alert_email IS 'Sends admin alert email to all administrators';
