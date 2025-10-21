-- Add Greek welcome email template
-- Ensure both English and Greek versions exist for welcome emails

-- Delete existing Greek welcome email template if any
DELETE FROM email_templates WHERE type = 'welcome_email' AND language = 'el';

-- Insert Greek welcome email template
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
        'el',
        'Καλώς ήρθες στο NetProphet',
        'Καλώς ήρθες στο NetProphet - Το Ταξίδι των Προβλέψεων σου Ξεκινά!',
        '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Καλώς ήρθες στο NetProphet</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="margin-bottom: 20px;">
        <img src="https://netprophetapp.com/net-prophet-logo-with-icon.svg" alt="NetProphet" style="height: 60px; width: auto;">
      </div>
      <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
        Καλώς ήρθες στο NetProphet!
      </h1>
      <p style="color: #94a3b8; font-size: 18px; margin: 10px 0 0 0;">
        Το ταξίδι των προβλέψεων σου ξεκινά τώρα
      </p>
    </div>

    <!-- Main Content -->
    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 40px; margin-bottom: 30px; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1);">
      <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">
        Γεια σου {{user_name}}! 👋
      </h2>
      
      <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Καλώς ήρθες στο NetProphet, την απόλυτη πλατφόρμα προβλέψεων τένις! Είμαστε ενθουσιασμένοι που γίνεσαι μέλος της κοινότητάς μας από λάτρεις του τένις και ειδικούς στις προβλέψεις.
      </p>

      <!-- Welcome Bonus Section -->
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
        <h3 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 15px 0;">
          🎁 Το Μπόνους Καλωσορίσματός σου
        </h3>
        <div style="display: flex; justify-content: center; gap: 30px; flex-wrap: wrap;">
          <div style="text-align: center;">
            <div style="color: #ffffff; font-size: 32px; font-weight: 700; margin-bottom: 5px;">{{welcome_bonus_coins}}</div>
            <div style="color: #e0e7ff; font-size: 14px;">Νομίσματα</div>
          </div>
          <div style="text-align: center;">
            <div style="color: #ffffff; font-size: 32px; font-weight: 700; margin-bottom: 5px;">1</div>
            <div style="color: #e0e7ff; font-size: 14px;">{{welcome_bonus_pass}}</div>
          </div>
        </div>
        <p style="color: #e0e7ff; font-size: 14px; margin: 15px 0 0 0;">
          Χρησιμοποίησε τα νομίσματά σου για να κάνεις προβλέψεις και το tournament pass σου για πρόσβαση σε premium τουρνουά!
        </p>
      </div>

      <!-- Features Section -->
      <div style="margin: 30px 0;">
        <h3 style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
          Τι μπορείς να κάνεις στο NetProphet:
        </h3>
        <ul style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 10px;">🎾 Κάνε προβλέψεις σε ερασιτεχνικούς αγώνες τένις</li>
          <li style="margin-bottom: 10px;">🏆 Διαγωνίσου σε τουρνουά και ανέβα στην κατάταξη</li>
          <li style="margin-bottom: 10px;">💰 Κέρδισε νομίσματα και ανταμοιβές για ακριβείς προβλέψεις</li>
          <li style="margin-bottom: 10px;">📊 Παρακολούθησε την απόδοσή σου και βελτίωσε τις δεξιότητές σου</li>
          <li style="margin-bottom: 10px;">👥 Συνδέσου με άλλους λάτρεις των προβλέψεων τένις</li>
        </ul>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{app_url}}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); transition: all 0.3s ease;">
          Ξεκίνα τις Προβλέψεις Τώρα →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; color: #94a3b8; font-size: 14px; line-height: 1.5;">
      <p style="margin: 0 0 10px 0;">
        Έτοιμος να γίνεις ειδικός στις προβλέψεις τένις;
      </p>
      <p style="margin: 0;">
        Επισκέψου το <a href="{{app_url}}" style="color: #3b82f6; text-decoration: none;">{{app_url}}</a> για να ξεκινήσεις!
      </p>
    </div>
  </div>
</body>
</html>',
        'Καλώς ήρθες στο NetProphet!

Γεια σου {{user_name}}!

Καλώς ήρθες στο NetProphet, την απόλυτη πλατφόρμα προβλέψεων τένις! Είμαστε ενθουσιασμένοι που γίνεσαι μέλος της κοινότητάς μας.

🎁 Το Μπόνους Καλωσορίσματός σου:
- {{welcome_bonus_coins}} Νομίσματα
- 1 {{welcome_bonus_pass}}

Χρησιμοποίησε τα νομίσματά σου για να κάνεις προβλέψεις και το tournament pass σου για πρόσβαση σε premium τουρνουά!

Τι μπορείς να κάνεις στο NetProphet:
🎾 Κάνε προβλέψεις σε επαγγελματικούς αγώνες τένις
🏆 Διαγωνίσου σε τουρνουά και ανέβα στην κατάταξη
💰 Κέρδισε νομίσματα και ανταμοιβές για ακριβείς προβλέψεις
📊 Παρακολούθησε την απόδοσή σου και βελτίωσε τις δεξιότητές σου
👥 Συνδέσου με άλλους λάτρεις των προβλέψεων τένις

Έτοιμος να γίνεις ειδικός στις προβλέψεις τένις;
Επισκέψου το {{app_url}} για να ξεκινήσεις!

Με εκτίμηση,
Η Ομάδα του NetProphet',
        '{
      "app_url": "https://netprophetapp.com",
      "user_name": "Νέος Χρήστης",
      "user_email": "user@example.com",
      "welcome_bonus_coins": 100,
      "welcome_bonus_pass": "Tournament Pass"
    }',
        true,
        1
);

-- Update the send_welcome_email_to_user function to detect user language
CREATE OR REPLACE FUNCTION send_welcome_email_to_user
(
    user_email TEXT,
    user_id UUID,
    user_name TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    template_variables JSONB;
    user_language TEXT;
BEGIN
    -- Try to detect user language from profiles or default to 'en'
    SELECT COALESCE(preferred_language, 'en')
    INTO user_language
    FROM profiles
    WHERE id = user_id;

    -- If no language found, default to 'en'
    IF user_language IS NULL THEN
        user_language := 'en';
END
IF;

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
        user_language,
        template_variables,
        'pending'
    );

RAISE LOG 'Welcome email logged for user % in language %', user_email, user_language;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION send_welcome_email_to_user
(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_welcome_email_to_user
(TEXT, UUID, TEXT) TO service_role;

