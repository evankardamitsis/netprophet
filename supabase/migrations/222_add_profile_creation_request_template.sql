-- Add specific email template for profile creation requests
-- This is different from profile claims - admins need to CREATE a new player profile

-- Delete existing template if it exists
DELETE FROM email_templates 
WHERE type = 'profile_creation_request' AND language = 'en';

-- Insert the profile creation request template
INSERT INTO email_templates (name, type, language, subject, html_content, text_content, variables, is_active)
VALUES (
    'Profile Creation Request - Admin Alert',
    'profile_creation_request',
    'en',
    'New Player Profile Creation Request',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile Creation Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">⚠️ New Player Profile Creation Request</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px;">Action Required</p>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <div style="background: white; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h2 style="margin-top: 0; color: #d97706;">🆕 New Profile Requested</h2>
                <p style="margin: 10px 0;"><strong>A user could not find their player profile and has requested you to create one.</strong></p>
            </div>
            
            <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: #495057;">📋 User Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Email:</td>
                        <td style="padding: 8px 0;">{{user_email}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">User ID:</td>
                        <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">{{user_id}}</td>
                    </tr>
                </table>
            </div>
            
            <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: #495057;">🎾 Requested Player Profile</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">First Name:</td>
                        <td style="padding: 8px 0; font-size: 18px; font-weight: bold;">{{requested_first_name}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Last Name:</td>
                        <td style="padding: 8px 0; font-size: 18px; font-weight: bold;">{{requested_last_name}}</td>
                    </tr>
                </table>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: #856404;">⚡ Action Required</h3>
                <ol style="margin: 0; padding-left: 20px; color: #856404;">
                    <li style="margin-bottom: 10px;"><strong>Create</strong> a new player profile in the admin panel</li>
                    <li style="margin-bottom: 10px;"><strong>Set player details:</strong> NTRP rating, stats, etc.</li>
                    <li style="margin-bottom: 10px;"><strong>Link to user:</strong> Associate the player profile with user ID above</li>
                    <li style="margin-bottom: 10px;"><strong>Activate:</strong> Set the player profile as active</li>
                </ol>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="https://admin.netprophetapp.com/players/new" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Create Player Profile →
                </a>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px;">
                <p>This is an automated notification from NetProphet Admin System</p>
                <p style="font-size: 12px; margin: 5px 0;">Timestamp: {{timestamp}}</p>
            </div>
        </div>
    </div>
</body>
</html>',
    'NEW PLAYER PROFILE CREATION REQUEST

A user could not find their player profile and has requested you to create one.

USER INFORMATION:
- Email: {{user_email}}
- User ID: {{user_id}}

REQUESTED PLAYER PROFILE:
- First Name: {{requested_first_name}}
- Last Name: {{requested_last_name}}

ACTION REQUIRED:
1. Create a new player profile in the admin panel
2. Set player details: NTRP rating, stats, etc.
3. Link to user: Associate the player profile with the user ID above
4. Activate: Set the player profile as active

Go to admin panel: https://admin.netprophetapp.com/players/new

---
This is an automated notification from NetProphet Admin System
Timestamp: {{timestamp}}',
    '{
        "user_email": "",
        "user_id": "",
        "requested_first_name": "",
        "requested_last_name": "",
        "timestamp": ""
    }'::jsonb,
    true
);

COMMENT ON TABLE email_templates IS 'Email templates for user and admin notifications';

