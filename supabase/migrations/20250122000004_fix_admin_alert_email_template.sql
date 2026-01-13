-- Fix admin_alert email template to correctly display alert_type
-- Ensure it doesn't show athlete-specific fields for user registrations

-- Update the admin_alert template to use alert_type correctly
UPDATE email_templates
SET 
    subject = 'Admin Alert: {{alert_type}}',
    html_content = '
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Admin Alert - {{alert_type}}</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
            <div style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 12px; padding: 12px 24px;">
                <span style="color: white; font-weight: bold; font-size: 24px;">NetProphet</span>
            </div>
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 20px 0 0 0;">Admin Alert</h1>
        </div>

        <!-- Main Content -->
        <div style="background: rgba(30, 41, 59, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 16px; padding: 40px; color: white; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
            <div style="margin-bottom: 30px;">
                <h2 style="color: #fbbf24; font-size: 22px; font-weight: 700; margin: 0 0 10px 0;">{{alert_type}}</h2>
                <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6; margin: 0;">{{message}}</p>
            </div>

            <!-- Details Section -->
            <div style="background: rgba(15, 23, 42, 0.6); border-radius: 12px; padding: 20px; margin-top: 20px;">
                <h3 style="color: #fbbf24; font-size: 18px; font-weight: 600; margin: 0 0 15px 0;">Details</h3>
                <p style="color: #cbd5e1; font-size: 14px; margin: 8px 0;">
                    <strong style="color: #fbbf24;">User Email:</strong> {{user_email}}
                </p>
                <p style="color: #cbd5e1; font-size: 14px; margin: 8px 0;">
                    <strong style="color: #fbbf24;">User Name:</strong> {{user_name}}
                </p>
                <p style="color: #64748b; font-size: 12px; margin: 15px 0 0 0;">
                    <strong>Timestamp:</strong> {{timestamp}}
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; color: #64748b; font-size: 12px;">
            <p style="margin: 0;">© 2025 NetProphet. All rights reserved.</p>
        </div>
    </div>
</body>
</html>',
    text_content = 'ADMIN ALERT

{{alert_type}}

{{message}}

Details:
- User Email: {{user_email}}
- User Name: {{user_name}}

Timestamp: {{timestamp}}',
    version = COALESCE(version, 0) + 1,
    updated_at = NOW()
WHERE type = 'admin_alert'
    AND language = 'en';

-- Add comment
COMMENT ON FUNCTION send_admin_alert_email
(TEXT, TEXT, JSONB) IS 
'Sends admin alert emails using the admin_alert template. The alert_type parameter determines the subject and title. For user registrations, use alert_type = ''New User Registration''. For profile creation requests, use the separate send_profile_creation_request_admin_email function.';
