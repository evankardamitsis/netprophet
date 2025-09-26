-- Create email templates for admin notifications
-- This migration adds email templates for notifying admins about user registrations and player claims

-- 1. Insert admin notification email templates (only if they don't exist)
INSERT INTO email_templates
    (name, type, language, subject, html_content, text_content, variables, is_active, version)
VALUES
    -- New User Registration Notification (English)
    ('Admin New User Notification - English', 'admin', 'en', '🔔 New User Registration - NetProphet Admin',
        '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New User Registration - NetProphet Admin</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="margin-bottom: 20px;">
        <div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
        </div>
      </div>
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">New User Registration</h1>
      <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 16px;">Admin Notification</p>
    </div>

    <!-- Main Content -->
    <div style="background: rgba(30, 41, 59, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 16px; padding: 40px; color: white; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
      
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #fbbf24; margin: 0 0 16px 0; font-size: 20px; font-weight: bold;">{{notification_title}}</h2>
        <p style="color: #cbd5e1; margin: 0; font-size: 16px; line-height: 1.6;">{{notification_message}}</p>
      </div>

      <div style="background: rgba(15, 23, 42, 0.6); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #fbbf24; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">User Details</h3>
        <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          <p style="margin: 8px 0;"><strong>Email:</strong> {{user_email}}</p>
          <p style="margin: 8px 0;"><strong>Registration Time:</strong> {{registration_time}}</p>
          <p style="margin: 8px 0;"><strong>Status:</strong> Awaiting Profile Setup</p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="{{admin_dashboard_url}}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 16px;">
          View in Admin Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px; color: #64748b; font-size: 12px;">
      <p style="margin: 0;">© {{current_year}} {{company_name}}. {{footer_rights}}</p>
      <p style="margin: 10px 0 0 0;">{{footer_tagline}}</p>
    </div>
  </div>
</body>
</html>',
        'New User Registration - NetProphet Admin

{{notification_title}}

{{notification_message}}

User Details:
- Email: {{user_email}}
- Registration Time: {{registration_time}}
- Status: Awaiting Profile Setup

View in Admin Dashboard: {{admin_dashboard_url}}

© {{current_year}} {{company_name}}. {{footer_rights}}
{{footer_tagline}}',
        '{"admin_dashboard_url": "https://admin.netprophetapp.com", "current_year": "2024", "company_name": "NetProphet", "footer_rights": "All rights reserved", "footer_tagline": "Made with ❤️ for tennis enthusiasts"}',
        true, 1),

    -- Player Profile Claimed Notification (English)
    ('Admin Player Claimed Notification - English', 'admin', 'en', '🎾 Player Profile Claimed - NetProphet Admin',
        '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Player Profile Claimed - NetProphet Admin</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="margin-bottom: 20px;">
        <div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
        </div>
      </div>
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">Player Profile Claimed</h1>
      <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 16px;">Admin Notification</p>
    </div>

    <!-- Main Content -->
    <div style="background: rgba(30, 41, 59, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 16px; padding: 40px; color: white; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
      
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #fbbf24; margin: 0 0 16px 0; font-size: 20px; font-weight: bold;">{{notification_title}}</h2>
        <p style="color: #cbd5e1; margin: 0; font-size: 16px; line-height: 1.6;">{{notification_message}}</p>
      </div>

      <div style="background: rgba(15, 23, 42, 0.6); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #fbbf24; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">Claim Details</h3>
        <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          <p style="margin: 8px 0;"><strong>User Email:</strong> {{user_email}}</p>
          <p style="margin: 8px 0;"><strong>Player Name:</strong> {{player_name}} {{player_surname}}</p>
          <p style="margin: 8px 0;"><strong>Claim Time:</strong> {{claim_time}}</p>
          <p style="margin: 8px 0;"><strong>Status:</strong> Player is now active and can participate in matches</p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="{{admin_dashboard_url}}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 16px;">
          View in Admin Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px; color: #64748b; font-size: 12px;">
      <p style="margin: 0;">© {{current_year}} {{company_name}}. {{footer_rights}}</p>
      <p style="margin: 10px 0 0 0;">{{footer_tagline}}</p>
    </div>
  </div>
</body>
</html>',
        'Player Profile Claimed - NetProphet Admin

{{notification_title}}

{{notification_message}}

Claim Details:
- User Email: {{user_email}}
- Player Name: {{player_name}} {{player_surname}}
- Claim Time: {{claim_time}}
- Status: Player is now active and can participate in matches

View in Admin Dashboard: {{admin_dashboard_url}}

© {{current_year}} {{company_name}}. {{footer_rights}}
{{footer_tagline}}',
        '{"admin_dashboard_url": "https://admin.netprophetapp.com", "current_year": "2024", "company_name": "NetProphet", "footer_rights": "All rights reserved", "footer_tagline": "Made with ❤️ for tennis enthusiasts"}',
        true, 1),

    -- Profile Creation Requested Notification (English)
    ('Admin Profile Creation Requested - English', 'admin', 'en', '📝 Profile Creation Requested - NetProphet Admin',
        '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profile Creation Requested - NetProphet Admin</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="margin-bottom: 20px;">
        <div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
        </div>
      </div>
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">Profile Creation Requested</h1>
      <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 16px;">Admin Notification</p>
    </div>

    <!-- Main Content -->
    <div style="background: rgba(30, 41, 59, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 16px; padding: 40px; color: white; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
      
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #fbbf24; margin: 0 0 16px 0; font-size: 20px; font-weight: bold;">{{notification_title}}</h2>
        <p style="color: #cbd5e1; margin: 0; font-size: 16px; line-height: 1.6;">{{notification_message}}</p>
      </div>

      <div style="background: rgba(15, 23, 42, 0.6); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #fbbf24; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">Request Details</h3>
        <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
          <p style="margin: 8px 0;"><strong>User Email:</strong> {{user_email}}</p>
          <p style="margin: 8px 0;"><strong>Requested Name:</strong> {{requested_name}} {{requested_surname}}</p>
          <p style="margin: 8px 0;"><strong>Request Time:</strong> {{request_time}}</p>
          <p style="margin: 8px 0;"><strong>Status:</strong> Awaiting Admin Action</p>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="{{admin_dashboard_url}}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 16px;">
          View in Admin Dashboard
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px; color: #64748b; font-size: 12px;">
      <p style="margin: 0;">© {{current_year}} {{company_name}}. {{footer_rights}}</p>
      <p style="margin: 10px 0 0 0;">{{footer_tagline}}</p>
    </div>
  </div>
</body>
</html>',
        'Profile Creation Requested - NetProphet Admin

{{notification_title}}

{{notification_message}}

Request Details:
- User Email: {{user_email}}
- Requested Name: {{requested_name}} {{requested_surname}}
- Request Time: {{request_time}}
- Status: Awaiting Admin Action

View in Admin Dashboard: {{admin_dashboard_url}}

© {{current_year}} {{company_name}}. {{footer_rights}}
{{footer_tagline}}',
        '{"admin_dashboard_url": "https://admin.netprophetapp.com", "current_year": "2024", "company_name": "NetProphet", "footer_rights": "All rights reserved", "footer_tagline": "Made with ❤️ for tennis enthusiasts"}',
        true, 1)
ON CONFLICT (type, language, version) DO NOTHING;

-- 2. Insert template variables for admin notification templates
INSERT INTO email_template_variables
    (template_id, variable_name, display_name, description, variable_type, is_required, default_value, validation_rules)
VALUES
    -- Variables for new user registration template
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin New User Notification - English'), 'notification_title', 'Notification Title', 'Title of the notification', 'text', true, '', '{}'),
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin New User Notification - English'), 'notification_message', 'Notification Message', 'Detailed message about the notification', 'text', true, '', '{}'),
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin New User Notification - English'), 'user_email', 'User Email', 'Email address of the registered user', 'text', true, '', '{}'),
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin New User Notification - English'), 'registration_time', 'Registration Time', 'Time when the user registered', 'text', true, '', '{}'),

    -- Variables for player claimed template
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin Player Claimed Notification - English'), 'notification_title', 'Notification Title', 'Title of the notification', 'text', true, '', '{}'),
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin Player Claimed Notification - English'), 'notification_message', 'Notification Message', 'Detailed message about the notification', 'text', true, '', '{}'),
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin Player Claimed Notification - English'), 'user_email', 'User Email', 'Email address of the user who claimed the profile', 'text', true, '', '{}'),
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin Player Claimed Notification - English'), 'player_name', 'Player Name', 'First name of the claimed player', 'text', true, '', '{}'),
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin Player Claimed Notification - English'), 'player_surname', 'Player Surname', 'Last name of the claimed player', 'text', true, '', '{}'),
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin Player Claimed Notification - English'), 'claim_time', 'Claim Time', 'Time when the profile was claimed', 'text', true, '', '{}'),

    -- Variables for profile creation requested template
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin Profile Creation Requested - English'), 'notification_title', 'Notification Title', 'Title of the notification', 'text', true, '', '{}'),
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin Profile Creation Requested - English'), 'notification_message', 'Notification Message', 'Detailed message about the notification', 'text', true, '', '{}'),
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin Profile Creation Requested - English'), 'user_email', 'User Email', 'Email address of the user requesting profile creation', 'text', true, '', '{}'),
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin Profile Creation Requested - English'), 'requested_name', 'Requested Name', 'First name requested by the user', 'text', true, '', '{}'),
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin Profile Creation Requested - English'), 'requested_surname', 'Requested Surname', 'Last name requested by the user', 'text', true, '', '{}'),
    ((SELECT id
        FROM email_templates
        WHERE type = 'admin' AND name = 'Admin Profile Creation Requested - English'), 'request_time', 'Request Time', 'Time when the profile creation was requested', 'text', true, '', '{}');
