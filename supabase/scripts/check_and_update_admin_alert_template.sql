-- 1. Check current admin_alert email template
SELECT
    id,
    name,
    type,
    language,
    subject,
    html_content,
    is_active
FROM email_templates
WHERE type = 'admin_alert'
    AND language = 'en';

-- 2. Update admin_alert template to display form data nicely
-- This will replace the template to show all athlete registration form fields
UPDATE email_templates
SET html_content = '
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

            <!-- Alert Details Section -->
            <div style="background: rgba(15, 23, 42, 0.6); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="color: #fbbf24; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">Athlete Registration Details</h3>
                <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
                    <p style="margin: 8px 0;"><strong style="color: #fbbf24;">User Email:</strong> <span id="user_email_display">{{details}}</span></p>
                    <p style="margin: 8px 0;"><strong style="color: #fbbf24;">Requested First Name:</strong> <span id="requested_first_name_display">{{details}}</span></p>
                    <p style="margin: 8px 0;"><strong style="color: #fbbf24;">Requested Last Name:</strong> <span id="requested_last_name_display">{{details}}</span></p>
                    <p style="margin: 8px 0;"><strong style="color: #fbbf24;">Date of Birth:</strong> <span id="date_of_birth_display">{{details}}</span></p>
                    <p style="margin: 8px 0;"><strong style="color: #fbbf24;">Playing Hand:</strong> <span id="playing_hand_display">{{details}}</span></p>
                    <p style="margin: 8px 0;"><strong style="color: #fbbf24;">Age:</strong> <span id="age_display">{{details}}</span></p>
                </div>
            </div>

            <!-- Full Details JSON (for reference) -->
            <div style="background: rgba(15, 23, 42, 0.4); border-radius: 8px; padding: 16px; margin-top: 20px;">
                <h4 style="color: #94a3b8; margin: 0 0 12px 0; font-size: 14px; font-weight: bold;">Full Details (JSON):</h4>
                <pre style="color: #cbd5e1; font-size: 12px; margin: 0; white-space: pre-wrap; word-wrap: break-word; font-family: ''Courier New'', monospace;">{{details}}</pre>
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
</html>'
WHERE type = 'admin_alert'
    AND language = 'en';

-- Note: The template uses {{details}} which contains the full JSON.
-- The email processing function should parse the JSON and extract individual fields.
-- For now, the template shows the full JSON. You may want to update the email processing
-- to parse and display individual fields, or update the template to parse JSON client-side.
