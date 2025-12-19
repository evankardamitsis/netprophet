-- Fix admin_alert template to be generic (not show athlete-specific fields)
-- This template is used for general admin alerts like "New User Registration"
-- Athlete profile creation requests use the separate profile_creation_request template

UPDATE email_templates
SET 
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
            
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #fbbf24; margin: 0 0 16px 0; font-size: 20px; font-weight: bold;">{{alert_type}}</h2>
                <p style="color: #cbd5e1; margin: 0; font-size: 16px; line-height: 1.6;">{{message}}</p>
            </div>

            <!-- Alert Details Section (generic - shows basic info) -->
            <div style="background: rgba(15, 23, 42, 0.6); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #fbbf24; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">Alert Details</h3>
                <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
                    <p style="margin: 8px 0;"><strong style="color: #fbbf24;">User Email:</strong> {{user_email}}</p>
                    <p style="margin: 8px 0;"><strong style="color: #fbbf24;">User Name:</strong> {{user_name}}</p>
                </div>
            </div>

            <!-- Full Details JSON (formatted) -->
            <div style="background: rgba(15, 23, 42, 0.4); border-radius: 8px; padding: 16px; margin-top: 20px;">
                <h4 style="color: #94a3b8; margin: 0 0 12px 0; font-size: 14px; font-weight: bold;">Full Details (JSON):</h4>
                <pre style="color: #cbd5e1; font-size: 12px; margin: 0; white-space: pre-wrap; word-wrap: break-word; font-family: ''Courier New'', monospace; background: rgba(0, 0, 0, 0.3); padding: 12px; border-radius: 6px;">{{details}}</pre>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">Timestamp: {{timestamp}}</p>
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

Alert Details:
- User Email: {{user_email}}
- User Name: {{user_name}}

Full Details (JSON):
{{details}}

Timestamp: {{timestamp}}',
    subject = 'Admin Alert: {{alert_type}}',
    version = COALESCE(version, 0) + 1,
    updated_at = NOW()
WHERE type = 'admin_alert'
    AND language = 'en'
RETURNING id, name, type, version;

-- Note: The template now only shows generic fields (user_email, user_name)
-- Athlete-specific fields (date_of_birth, playing_hand, age) are NOT shown here
-- Those are handled by the separate profile_creation_request template
-- The send_admin_alert_email function may extract those fields, but they won't be displayed
