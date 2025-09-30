-- Consolidated welcome email system migration
-- This replaces multiple redundant welcome email migrations with a single comprehensive one

-- 1. Create function to send welcome email to new users
CREATE OR REPLACE FUNCTION send_welcome_email_to_user
(
    user_email TEXT,
    user_id UUID,
    user_name TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    template_variables JSONB;
BEGIN
    -- Prepare template variables for welcome email
    template_variables := jsonb_build_object
(
        'user_email', user_email,
        'user_id', user_id,
        'user_name', COALESCE
(user_name, 'New User'),
        'welcome_bonus_coins', 100,
        'welcome_bonus_pass', 'Tournament Pass',
        'app_url', 'https://netprophetapp.com'
    );

-- Insert email log for processing
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
        user_id,
        user_email,
        'welcome_email',
        'user',
        'en',
        template_variables,
        'pending'
    );

RAISE LOG 'Welcome email logged for user %', user_email;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the final welcome email template
DELETE FROM email_templates WHERE type = 'welcome_email' AND language = 'en';

INSERT INTO email_templates
    (
    type,
    language,
    name,
    subject,
    html_content,
    text_content,
    variables,
    is_active,
    version
    )
VALUES
    (
        'welcome_email',
        'en',
        'Welcome to NetProphet',
        '🎾 Welcome to NetProphet - Your Tennis Prediction Journey Begins!',
        '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to NetProphet</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="margin-bottom: 20px;">
        <img src="https://netprophetapp.com/net-prophet-logo-with-icon.svg" alt="NetProphet" style="height: 60px; width: auto;">
      </div>
      <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        Welcome to NetProphet!
      </h1>
      <p style="color: #94a3b8; font-size: 18px; margin: 10px 0 0 0;">
        Your tennis prediction journey starts now
      </p>
    </div>

    <!-- Main Content -->
    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 40px; margin-bottom: 30px; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1);">
      <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">
        Hello {{user_name}}! 👋
      </h2>
      
      <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Welcome to NetProphet, the ultimate tennis prediction platform! We''re thrilled to have you join our community of tennis enthusiasts and prediction experts.
      </p>

      <!-- Welcome Bonus Section -->
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
        <h3 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 15px 0;">
          🎁 Your Welcome Bonus
        </h3>
        <div style="display: flex; justify-content: center; gap: 30px; flex-wrap: wrap;">
          <div style="text-align: center;">
            <div style="color: #ffffff; font-size: 32px; font-weight: 700; margin-bottom: 5px;">{{welcome_bonus_coins}}</div>
            <div style="color: #e0e7ff; font-size: 14px;">Coins</div>
          </div>
          <div style="text-align: center;">
            <div style="color: #ffffff; font-size: 32px; font-weight: 700; margin-bottom: 5px;">1</div>
            <div style="color: #e0e7ff; font-size: 14px;">{{welcome_bonus_pass}}</div>
          </div>
        </div>
        <p style="color: #e0e7ff; font-size: 14px; margin: 15px 0 0 0;">
          Use your coins to make predictions and your tournament pass to access premium tournaments!
        </p>
      </div>

      <!-- Features Section -->
      <div style="margin: 30px 0;">
        <h3 style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
          What you can do on NetProphet:
        </h3>
        <ul style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 10px;">🎾 Make predictions on professional tennis matches</li>
          <li style="margin-bottom: 10px;">🏆 Compete in tournaments and climb the leaderboard</li>
          <li style="margin-bottom: 10px;">💰 Earn coins and rewards for accurate predictions</li>
          <li style="margin-bottom: 10px;">📊 Track your performance and improve your skills</li>
          <li style="margin-bottom: 10px;">👥 Connect with other tennis prediction enthusiasts</li>
        </ul>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{app_url}}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); transition: all 0.3s ease;">
          Start Predicting Now →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; color: #94a3b8; font-size: 14px; line-height: 1.5;">
      <p style="margin: 0 0 10px 0;">
        Ready to become a tennis prediction expert?
      </p>
      <p style="margin: 0;">
        Visit <a href="{{app_url}}" style="color: #3b82f6; text-decoration: none;">{{app_url}}</a> to get started!
      </p>
    </div>
  </div>
</body>
</html>',
        'Welcome to NetProphet!

Hello {{user_name}}!

Welcome to NetProphet, the ultimate tennis prediction platform! We''re thrilled to have you join our community of tennis enthusiasts and prediction experts.

🎁 Your Welcome Bonus:
- {{welcome_bonus_coins}} Coins
- 1 {{welcome_bonus_pass}}

Use your coins to make predictions and your tournament pass to access premium tournaments!

What you can do on NetProphet:
🎾 Make predictions on professional tennis matches
🏆 Compete in tournaments and climb the leaderboard  
💰 Earn coins and rewards for accurate predictions
📊 Track your performance and improve your skills
👥 Connect with other tennis prediction enthusiasts

Ready to become a tennis prediction expert?
Visit {{app_url}} to get started!

Best regards,
The NetProphet Team',
        '{
      "app_url": "https://netprophetapp.com",
      "user_name": "New User",
      "user_email": "user@example.com",
      "welcome_bonus_coins": 100,
      "welcome_bonus_pass": "Tournament Pass"
    }',
        true,
        1
);

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION send_welcome_email_to_user
(TEXT, UUID, TEXT) TO authenticated;
