-- Add email template for when admin activates a player profile for a user
-- This notifies the user that their requested profile is now ready

-- Delete existing template if it exists
DELETE FROM email_templates 
WHERE type = 'profile_activated' AND language = 'en';

-- Insert the profile activated notification template
INSERT INTO email_templates
    (name, type, language, subject, html_content, text_content, variables, is_active)
VALUES
    (
        'Player Profile Activated - User Notification',
        'profile_activated',
        'en',
        'Your Player Profile is Now Active! 🎾',
        '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile Activated</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Your Player Profile is Active!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">You can now participate in matches</p>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <div style="background: white; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h2 style="margin-top: 0; color: #059669;">✅ Profile Successfully Created</h2>
                <p style="margin: 10px 0; font-size: 16px;">Hi <strong>{{user_name}}</strong>,</p>
                <p style="margin: 10px 0;">Great news! Your player profile has been created and activated by our admin team. You can now participate in matches and tournaments!</p>
            </div>
            
            <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: #495057;">🎾 Your Player Profile</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Player Name:</td>
                        <td style="padding: 8px 0; font-size: 18px; font-weight: bold;">{{player_first_name}} {{player_last_name}}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; color: #6c757d; font-weight: 600;">Status:</td>
                        <td style="padding: 8px 0;"><span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: bold;">Active</span></td>
                    </tr>
                </table>
            </div>
            
            <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: #1e40af;">🚀 What''s Next?</h3>
                <ul style="margin: 0; padding-left: 20px; color: #1e3a8a;">
                    <li style="margin-bottom: 10px;">View your player profile and stats</li>
                    <li style="margin-bottom: 10px;">Participate in upcoming matches</li>
                    <li style="margin-bottom: 10px;">Track your performance</li>
                    <li style="margin-bottom: 10px;">Compete in tournaments</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
                <a href="https://netprophetapp.com/{{language}}/players/{{player_id}}" style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; margin-bottom: 10px;">
                    View My Player Profile →
                </a>
                <br>
                <a href="https://netprophetapp.com/{{language}}/matches" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                    Browse Matches →
                </a>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px;">
                <p>Welcome to NetProphet! 🎾</p>
                <p style="font-size: 12px; margin: 5px 0;">If you have any questions, please contact our support team.</p>
            </div>
        </div>
    </div>
</body>
</html>',
        'YOUR PLAYER PROFILE IS NOW ACTIVE! 🎾

Hi {{user_name}},

Great news! Your player profile has been created and activated by our admin team. You can now participate in matches and tournaments!

YOUR PLAYER PROFILE:
- Player Name: {{player_first_name}} {{player_last_name}}
- Status: Active ✅

WHAT''S NEXT?
• View your player profile and stats
• Participate in upcoming matches
• Track your performance
• Compete in tournaments

View your profile: https://netprophetapp.com/{{language}}/players/{{player_id}}
Browse matches: https://netprophetapp.com/{{language}}/matches

---
Welcome to NetProphet! 🎾
If you have any questions, please contact our support team.',
        '{
        "user_name": "",
        "player_first_name": "",
        "player_last_name": "",
        "player_id": "",
        "language": "en"
    }'
::jsonb,
    true
);

-- Create function to send profile activated notification
CREATE OR REPLACE FUNCTION send_profile_activated_notification
(
    user_id_param UUID,
    player_id_param UUID
)
RETURNS void AS $$
DECLARE
    user_info RECORD;
    player_info RECORD;
    template_variables JSONB;
BEGIN
    -- Get user information
    SELECT email, first_name, last_name, preferred_language
    FROM profiles
    WHERE id = user_id_param
    INTO user_info;

IF user_info IS NULL THEN
        RAISE EXCEPTION 'User not found';
END
IF;
    
    -- Get player information
    SELECT first_name, last_name
FROM players
WHERE id = player_id_param
INTO player_info;

IF player_info IS NULL THEN
        RAISE EXCEPTION 'Player not found';
END
IF;
    
    -- Prepare template variables
    template_variables := jsonb_build_object
(
        'user_name', COALESCE
(user_info.first_name || ' ' || user_info.last_name, 'User'),
        'player_first_name', player_info.first_name,
        'player_last_name', player_info.last_name,
        'player_id', player_id_param::text,
        'language', COALESCE
(user_info.preferred_language, 'en')
    );

-- Insert email log
INSERT INTO public.email_logs
    (
    user_id,
    to_email,
    template,
    type,
    language,
    variables,
    status
    )
VALUES
    (
        user_id_param,
        user_info.email,
        'profile_activated',
        'user',
        COALESCE(user_info.preferred_language, 'en'),
        template_variables,
        'pending'
    );

RAISE LOG 'Profile activated notification sent to user %', user_info.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_profile_activated_notification
(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_profile_activated_notification
(UUID, UUID) TO service_role;

COMMENT ON FUNCTION send_profile_activated_notification
(UUID, UUID) IS 'Sends email notification to user when their requested player profile is activated by admin';

