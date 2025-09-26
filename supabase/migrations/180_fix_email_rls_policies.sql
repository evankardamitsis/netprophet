-- Fix RLS policies for email-related tables
-- The email service needs to access templates and logs without authentication

-- Fix email_templates RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read email templates" ON email_templates;
DROP POLICY IF EXISTS "Allow admins to manage email templates" ON email_templates;

-- Allow service role to access all email templates
CREATE POLICY "Service role can access email templates" ON email_templates
    FOR ALL USING (auth.role() = 'service_role');

-- Allow anyone to read email templates (needed for edge functions)
CREATE POLICY "Allow reading email templates" ON email_templates
    FOR SELECT USING (true);

-- Fix email_template_versions RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read template versions" ON email_template_versions;
DROP POLICY IF EXISTS "Allow admins to manage template versions" ON email_template_versions;

-- Allow service role to access all template versions
CREATE POLICY "Service role can access template versions" ON email_template_versions
    FOR ALL USING (auth.role() = 'service_role');

-- Allow anyone to read template versions
CREATE POLICY "Allow reading template versions" ON email_template_versions
    FOR SELECT USING (true);

-- Fix email_template_variables RLS policies
DROP POLICY IF EXISTS "Allow authenticated users to read template variables" ON email_template_variables;
DROP POLICY IF EXISTS "Allow admins to manage template variables" ON email_template_variables;

-- Allow service role to access all template variables
CREATE POLICY "Service role can access template variables" ON email_template_variables
    FOR ALL USING (auth.role() = 'service_role');

-- Allow anyone to read template variables
CREATE POLICY "Allow reading template variables" ON email_template_variables
    FOR SELECT USING (true);

-- Fix email_logs RLS policies
DROP POLICY IF EXISTS "Admins can view email logs" ON email_logs;
DROP POLICY IF EXISTS "System can insert email logs" ON email_logs;

-- Allow service role to access all email logs
CREATE POLICY "Service role can access email logs" ON email_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Allow anyone to insert email logs (needed for edge functions)
CREATE POLICY "Allow inserting email logs" ON email_logs
    FOR INSERT WITH CHECK (true);
