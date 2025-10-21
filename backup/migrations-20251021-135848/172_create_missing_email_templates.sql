-- Create missing email templates for complete transactional email system
-- This migration adds all the missing email templates needed for a complete system

-- Insert winnings notification templates
INSERT INTO email_templates
    (name, type, language, subject, html_content, text_content, variables, is_active)
VALUES
    -- English winnings notification
    ('Winnings Notification', 'winnings', 'en', '🎉 Congratulations! You won {{winnings}} coins!',
        '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Winnings Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); padding: 32px 24px; text-align: center;">
            <div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
            </div>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px 24px;">
            <h1 style="color: #1f2937; font-size: 24px; font-weight: bold; margin: 0 0 16px 0; text-align: center;">🎉 Congratulations!</h1>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Your prediction on <strong>{{match}}</strong> was correct! You''ve won <strong>{{winnings}} coins</strong>.
            </p>
            
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                <h2 style="color: white; font-size: 32px; font-weight: bold; margin: 0 0 8px 0;">{{winnings}} Coins</h2>
                <p style="color: white; font-size: 16px; margin: 0;">Added to your wallet</p>
            </div>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
                Keep making predictions and winning more coins! Good luck with your next predictions.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">NetProphet - Tennis Prediction Platform</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">This email was sent to {{user_email}}</p>
        </div>
    </div>
</body>
</html>',
        'Congratulations! Your prediction on {{match}} was correct! You''ve won {{winnings}} coins. Keep making predictions and winning more coins!',
        '{"match": "Match name", "winnings": "Amount won", "user_email": "User email address"}',
        true),

    -- Greek winnings notification
    ('Winnings Notification', 'winnings', 'el', '🎉 Συγχαρητήρια! Κέρδισες {{winnings}} νομίσματα!',
        '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ειδοποίηση Κερδών</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); padding: 32px 24px; text-align: center;">
            <div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
            </div>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px 24px;">
            <h1 style="color: #1f2937; font-size: 24px; font-weight: bold; margin: 0 0 16px 0; text-align: center;">🎉 Συγχαρητήρια!</h1>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Η πρόβλεψή σου για <strong>{{match}}</strong> ήταν σωστή! Κέρδισες <strong>{{winnings}} νομίσματα</strong>.
            </p>
            
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                <h2 style="color: white; font-size: 32px; font-weight: bold; margin: 0 0 8px 0;">{{winnings}} Νομίσματα</h2>
                <p style="color: white; font-size: 16px; margin: 0;">Προστέθηκαν στο πορτοφόλι σου</p>
            </div>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
                Συνεχίστε να κάνετε προβλέψεις και να κερδίζετε περισσότερα νομίσματα! Καλή τύχη στις επόμενες προβλέψεις σας.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">NetProphet - Πλατφόρμα Προβλέψεων Tennis</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">Αυτό το email στάλθηκε στο {{user_email}}</p>
        </div>
    </div>
</body>
</html>',
        'Συγχαρητήρια! Η πρόβλεψή σου για {{match}} ήταν σωστή! Κέρδισες {{winnings}} νομίσματα. Συνεχίστε να κάνετε προβλέψεις και να κερδίζετε περισσότερα νομίσματα!',
        '{"match": "Όνομα αγώνα", "winnings": "Ποσό που κερδίθηκε", "user_email": "Email χρήστη"}',
        true);

-- Insert welcome email templates
INSERT INTO email_templates
    (name, type, language, subject, html_content, text_content, variables, is_active)
VALUES
    -- English welcome email
    ('Welcome Email', 'welcome', 'en', '🎉 Welcome to NetProphet! Get your {{welcome_bonus}} coin bonus!',
        '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to NetProphet</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); padding: 32px 24px; text-align: center;">
            <div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
            </div>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px 24px;">
            <h1 style="color: #1f2937; font-size: 24px; font-weight: bold; margin: 0 0 16px 0; text-align: center;">🎉 Welcome to NetProphet!</h1>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hi {{user_name}}! Welcome to the ultimate tennis prediction platform. Start your journey with a <strong>{{welcome_bonus}} coin bonus</strong>!
            </p>
            
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                <h2 style="color: white; font-size: 32px; font-weight: bold; margin: 0 0 8px 0;">{{welcome_bonus}} Coins</h2>
                <p style="color: white; font-size: 16px; margin: 0;">Welcome bonus added to your wallet</p>
            </div>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
                Start making predictions on tennis matches and win more coins! Good luck!
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">NetProphet - Tennis Prediction Platform</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">This email was sent to {{user_email}}</p>
        </div>
    </div>
</body>
</html>',
        'Welcome to NetProphet! Hi {{user_name}}! Welcome to the ultimate tennis prediction platform. Start your journey with a {{welcome_bonus}} coin bonus! Start making predictions on tennis matches and win more coins!',
        '{"user_name": "User name", "welcome_bonus": "Welcome bonus amount", "user_email": "User email address"}',
        true),

    -- Greek welcome email
    ('Welcome Email', 'welcome', 'el', '🎉 Καλώς ήρθες στο NetProphet! Πάρε το μπόνους των {{welcome_bonus}} νομισμάτων!',
        '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Καλώς ήρθες στο NetProphet</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); padding: 32px 24px; text-align: center;">
            <div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
            </div>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px 24px;">
            <h1 style="color: #1f2937; font-size: 24px; font-weight: bold; margin: 0 0 16px 0; text-align: center;">🎉 Καλώς ήρθες στο NetProphet!</h1>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Γεια σου {{user_name}}! Καλώς ήρθες στην απόλυτη πλατφόρμα προβλέψεων tennis. Ξεκίνα το ταξίδι σου με ένα <strong>μπόνους {{welcome_bonus}} νομισμάτων</strong>!
            </p>
            
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                <h2 style="color: white; font-size: 32px; font-weight: bold; margin: 0 0 8px 0;">{{welcome_bonus}} Νομίσματα</h2>
                <p style="color: white; font-size: 16px; margin: 0;">Μπόνους καλωσορίσματος προστέθηκε στο πορτοφόλι σου</p>
            </div>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
                Ξεκίνα να κάνεις προβλέψεις σε αγώνες tennis και κέρδισε περισσότερα νομίσματα! Καλή τύχη!
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">NetProphet - Πλατφόρμα Προβλέψεων Tennis</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">Αυτό το email στάλθηκε στο {{user_email}}</p>
        </div>
    </div>
</body>
</html>',
        'Καλώς ήρθες στο NetProphet! Γεια σου {{user_name}}! Καλώς ήρθες στην απόλυτη πλατφόρμα προβλέψεων tennis. Ξεκίνα το ταξίδι σου με ένα μπόνους {{welcome_bonus}} νομισμάτων! Ξεκίνα να κάνεις προβλέψεις σε αγώνες tennis και κέρδισε περισσότερα νομίσματα!',
        '{"user_name": "Όνομα χρήστη", "welcome_bonus": "Ποσό μπόνους καλωσορίσματος", "user_email": "Email χρήστη"}',
        true);

-- Insert promotional email templates
INSERT INTO email_templates
    (name, type, language, subject, html_content, text_content, variables, is_active)
VALUES
    -- English promotional email
    ('Promotional Email', 'promotional', 'en', '🔥 Featured Matches & Special Offers!',
        '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Featured Matches</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); padding: 32px 24px; text-align: center;">
            <div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
            </div>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px 24px;">
            <h1 style="color: #1f2937; font-size: 24px; font-weight: bold; margin: 0 0 16px 0; text-align: center;">🔥 Featured Matches</h1>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Don''t miss these exciting tennis matches! Make your predictions and win big!
            </p>
            
            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                <h2 style="color: white; font-size: 20px; font-weight: bold; margin: 0 0 8px 0;">Special Offer!</h2>
                <p style="color: white; font-size: 16px; margin: 0;">Double your winnings on featured matches</p>
            </div>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
                Check out the latest matches and start predicting now!
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">NetProphet - Tennis Prediction Platform</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">This email was sent to {{user_email}}</p>
        </div>
    </div>
</body>
</html>',
        'Featured Matches! Don''t miss these exciting tennis matches! Make your predictions and win big! Special Offer: Double your winnings on featured matches. Check out the latest matches and start predicting now!',
        '{"user_email": "User email address"}',
        true),

    -- Greek promotional email
    ('Promotional Email', 'promotional', 'el', '🔥 Προτεινόμενοι Αγώνες & Ειδικές Προσφορές!',
        '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Προτεινόμενοι Αγώνες</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); padding: 32px 24px; text-align: center;">
            <div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
            </div>
        </div>
        
        <!-- Content -->
        <div style="padding: 32px 24px;">
            <h1 style="color: #1f2937; font-size: 24px; font-weight: bold; margin: 0 0 16px 0; text-align: center;">🔥 Προτεινόμενοι Αγώνες</h1>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Μην χάσεις αυτούς τους συναρπαστικούς αγώνες tennis! Κάνε τις προβλέψεις σου και κέρδισε μεγάλα!
            </p>
            
            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                <h2 style="color: white; font-size: 20px; font-weight: bold; margin: 0 0 8px 0;">Ειδική Προσφορά!</h2>
                <p style="color: white; font-size: 16px; margin: 0;">Διπλασίασε τα κέρδη σου στους προτεινόμενους αγώνες</p>
            </div>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
                Δες τους τελευταίους αγώνες και ξεκίνα να προβλέπεις τώρα!
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">NetProphet - Πλατφόρμα Προβλέψεων Tennis</p>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">Αυτό το email στάλθηκε στο {{user_email}}</p>
        </div>
    </div>
</body>
</html>',
        'Προτεινόμενοι Αγώνες! Μην χάσεις αυτούς τους συναρπαστικούς αγώνες tennis! Κάνε τις προβλέψεις σου και κέρδισε μεγάλα! Ειδική Προσφορά: Διπλασίασε τα κέρδη σου στους προτεινόμενους αγώνες. Δες τους τελευταίους αγώνες και ξεκίνα να προβλέπεις τώρα!',
        '{"user_email": "Email χρήστη"}',
        true);

-- Insert template variables for all new templates
INSERT INTO email_template_variables
    (template_id, variable_name, display_name, description, variable_type, is_required, default_value)
SELECT
    et.id,
    'user_email',
    'User Email',
    'Email address of the recipient',
    'text',
    true,
    ''
FROM email_templates et
WHERE et.type IN ('winnings', 'welcome', 'promotional');

-- Insert specific variables for winnings templates
INSERT INTO email_template_variables
    (template_id, variable_name, display_name, description, variable_type, is_required, default_value)
SELECT
    et.id,
    'match',
    'Match Name',
    'Name of the tennis match',
    'text',
    true,
    ''
FROM email_templates et
WHERE et.type = 'winnings';

INSERT INTO email_template_variables
    (template_id, variable_name, display_name, description, variable_type, is_required, default_value)
SELECT
    et.id,
    'winnings',
    'Winnings Amount',
    'Amount of coins won',
    'number',
    true,
    '0'
FROM email_templates et
WHERE et.type = 'winnings';

-- Insert specific variables for welcome templates
INSERT INTO email_template_variables
    (template_id, variable_name, display_name, description, variable_type, is_required, default_value)
SELECT
    et.id,
    'user_name',
    'User Name',
    'Name of the user',
    'text',
    true,
    ''
FROM email_templates et
WHERE et.type = 'welcome';

INSERT INTO email_template_variables
    (template_id, variable_name, display_name, description, variable_type, is_required, default_value)
SELECT
    et.id,
    'welcome_bonus',
    'Welcome Bonus',
    'Amount of welcome bonus coins',
    'number',
    true,
    '100'
FROM email_templates et
WHERE et.type = 'welcome';
