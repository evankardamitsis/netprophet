-- Add email templates for player profile claim/creation confirmation
-- These emails are sent when users claim or create their player profiles

-- 1. Create function to send profile claim confirmation email
CREATE OR REPLACE FUNCTION send_profile_claim_confirmation_email
(
    user_email TEXT,
    user_id UUID,
    user_name TEXT,
    player_first_name TEXT,
    player_last_name TEXT
)
RETURNS void AS $$
DECLARE
    template_variables JSONB;
    user_language TEXT;
BEGIN
    -- Get user language
    SELECT COALESCE(preferred_language, 'el') INTO user_language
    FROM profiles
    WHERE id = user_id;
    
    IF user_language IS NULL THEN
        user_language := 'el';
    END IF;

    -- Prepare template variables
    template_variables := jsonb_build_object(
        'user_email', user_email,
        'user_id', user_id,
        'user_name', user_name,
        'player_first_name', player_first_name,
        'player_last_name', player_last_name,
        'player_full_name', player_first_name || ' ' || player_last_name,
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
        'profile_claim_confirmation',
        'user',
        user_language,
        template_variables,
        'pending'
    );

    RAISE LOG 'Profile claim confirmation email logged for user % in language %', user_email, user_language;
END;
$$ LANGUAGE plpgsql;

-- 2. Create function to send profile creation confirmation email
CREATE OR REPLACE FUNCTION send_profile_creation_confirmation_email
(
    user_email TEXT,
    user_id UUID,
    user_name TEXT,
    requested_first_name TEXT,
    requested_last_name TEXT
)
RETURNS void AS $$
DECLARE
    template_variables JSONB;
    user_language TEXT;
BEGIN
    -- Get user language
    SELECT COALESCE(preferred_language, 'el') INTO user_language
    FROM profiles
    WHERE id = user_id;
    
    IF user_language IS NULL THEN
        user_language := 'el';
    END IF;

    -- Prepare template variables
    template_variables := jsonb_build_object(
        'user_email', user_email,
        'user_id', user_id,
        'user_name', user_name,
        'requested_first_name', requested_first_name,
        'requested_last_name', requested_last_name,
        'requested_full_name', requested_first_name || ' ' || requested_last_name,
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
        'profile_creation_confirmation',
        'user',
        user_language,
        template_variables,
        'pending'
    );

    RAISE LOG 'Profile creation confirmation email logged for user % in language %', user_email, user_language;
END;
$$ LANGUAGE plpgsql;

-- 3. Insert English profile claim confirmation template
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
    'profile_claim_confirmation',
    'en',
    'Player Profile Claimed',
    '🎾 Profile Claimed - Welcome {{player_full_name}}!',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profile Claimed</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="margin-bottom: 20px;">
        <img src="https://netprophetapp.com/net-prophet-logo-with-icon.svg" alt="NetProphet" style="height: 60px; width: auto;">
      </div>
      <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0;">
        Profile Successfully Claimed! 🎉
      </h1>
    </div>

    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 40px; margin-bottom: 30px; border: 1px solid rgba(255, 255, 255, 0.1);">
      <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">
        Hello {{user_name}}! 👋
      </h2>
      
      <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Great news! You have successfully claimed your player profile as <strong style="color: #3b82f6;">{{player_full_name}}</strong>.
      </p>

      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
        <h3 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 15px 0;">
          ✅ Your Player Profile
        </h3>
        <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 10px;">
          {{player_full_name}}
        </div>
        <p style="color: #d1fae5; font-size: 14px; margin: 0;">
          Your match history and stats are now connected to your NetProphet account!
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{app_url}}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
          View Your Profile →
        </a>
      </div>
    </div>

    <div style="text-align: center; color: #94a3b8; font-size: 14px;">
      <p style="margin: 0;">
        Visit <a href="{{app_url}}" style="color: #3b82f6; text-decoration: none;">{{app_url}}</a>
      </p>
    </div>
  </div>
</body>
</html>',
    'Profile Successfully Claimed!

Hello {{user_name}}!

Great news! You have successfully claimed your player profile as {{player_full_name}}.

✅ Your Player Profile: {{player_full_name}}

Your match history and stats are now connected to your NetProphet account!

Visit {{app_url}} to view your profile.

Best regards,
The NetProphet Team',
    '{
      "app_url": "https://netprophetapp.com",
      "user_name": "User",
      "user_email": "user@example.com",
      "player_first_name": "John",
      "player_last_name": "Doe",
      "player_full_name": "John Doe"
    }',
    true,
    1
);

-- 4. Insert Greek profile claim confirmation template
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
    'profile_claim_confirmation',
    'el',
    'Το Προφίλ Παίκτη Δηλώθηκε',
    '🎾 Προφίλ Δηλώθηκε - Καλώς ήρθες {{player_full_name}}!',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Προφίλ Δηλώθηκε</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="margin-bottom: 20px;">
        <img src="https://netprophetapp.com/net-prophet-logo-with-icon.svg" alt="NetProphet" style="height: 60px; width: auto;">
      </div>
      <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0;">
        Το Προφίλ Δηλώθηκε Επιτυχώς! 🎉
      </h1>
    </div>

    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 40px; margin-bottom: 30px; border: 1px solid rgba(255, 255, 255, 0.1);">
      <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">
        Γεια σου {{user_name}}! 👋
      </h2>
      
      <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Εξαιρετικά νέα! Δήλωσες επιτυχώς το προφίλ σου ως <strong style="color: #3b82f6;">{{player_full_name}}</strong>.
      </p>

      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
        <h3 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 15px 0;">
          ✅ Το Προφίλ Παίκτη σου
        </h3>
        <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 10px;">
          {{player_full_name}}
        </div>
        <p style="color: #d1fae5; font-size: 14px; margin: 0;">
          Το ιστορικό αγώνων και τα στατιστικά σου είναι πλέον συνδεδεμένα με τον λογαριασμό σου στο NetProphet!
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{app_url}}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
          Δες το Προφίλ σου →
        </a>
      </div>
    </div>

    <div style="text-align: center; color: #94a3b8; font-size: 14px;">
      <p style="margin: 0;">
        Επισκέψου το <a href="{{app_url}}" style="color: #3b82f6; text-decoration: none;">{{app_url}}</a>
      </p>
    </div>
  </div>
</body>
</html>',
    'Το Προφίλ Δηλώθηκε Επιτυχώς!

Γεια σου {{user_name}}!

Εξαιρετικά νέα! Δήλωσες επιτυχώς το προφίλ σου ως {{player_full_name}}.

✅ Το Προφίλ Παίκτη σου: {{player_full_name}}

Το ιστορικό αγώνων και τα στατιστικά σου είναι πλέον συνδεδεμένα με τον λογαριασμό σου στο NetProphet!

Επισκέψου το {{app_url}} για να δεις το προφίλ σου.

Με εκτίμηση,
Η Ομάδα του NetProphet',
    '{
      "app_url": "https://netprophetapp.com",
      "user_name": "User",
      "user_email": "user@example.com",
      "player_first_name": "John",
      "player_last_name": "Doe",
      "player_full_name": "John Doe"
    }',
    true,
    1
);

-- 5. Insert English profile creation confirmation template
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
    'profile_creation_confirmation',
    'en',
    'Profile Creation Request Received',
    '🎾 Profile Creation Request - We''re Working on It!',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profile Creation Request</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="margin-bottom: 20px;">
        <img src="https://netprophetapp.com/net-prophet-logo-with-icon.svg" alt="NetProphet" style="height: 60px; width: auto;">
      </div>
      <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0;">
        Profile Request Received! ✅
      </h1>
    </div>

    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 40px; margin-bottom: 30px; border: 1px solid rgba(255, 255, 255, 0.1);">
      <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">
        Hello {{user_name}}! 👋
      </h2>
      
      <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        We have received your request to create a player profile for <strong style="color: #3b82f6;">{{requested_full_name}}</strong>.
      </p>

      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
        <h3 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 15px 0;">
          ⏳ Under Review
        </h3>
        <div style="color: #ffffff; font-size: 24px; font-weight: 700; margin-bottom: 10px;">
          {{requested_full_name}}
        </div>
        <p style="color: #fef3c7; font-size: 14px; margin: 0;">
          Our team will review your request and create your profile shortly. We''ll notify you once it''s ready!
        </p>
      </div>

      <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
        In the meantime, you can continue using NetProphet and making predictions!
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{app_url}}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
          Continue to NetProphet →
        </a>
      </div>
    </div>

    <div style="text-align: center; color: #94a3b8; font-size: 14px;">
      <p style="margin: 0;">
        Visit <a href="{{app_url}}" style="color: #3b82f6; text-decoration: none;">{{app_url}}</a>
      </p>
    </div>
  </div>
</body>
</html>',
    'Profile Request Received!

Hello {{user_name}}!

We have received your request to create a player profile for {{requested_full_name}}.

⏳ Under Review: {{requested_full_name}}

Our team will review your request and create your profile shortly. We''ll notify you once it''s ready!

In the meantime, you can continue using NetProphet and making predictions!

Visit {{app_url}}

Best regards,
The NetProphet Team',
    '{
      "app_url": "https://netprophetapp.com",
      "user_name": "User",
      "user_email": "user@example.com",
      "requested_first_name": "John",
      "requested_last_name": "Doe",
      "requested_full_name": "John Doe"
    }',
    true,
    1
);

-- 6. Insert Greek profile creation confirmation template
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
    'profile_creation_confirmation',
    'el',
    'Αίτημα Δημιουργίας Προφίλ Ελήφθη',
    '🎾 Αίτημα Δημιουργίας Προφίλ - Δουλεύουμε πάνω του!',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Αίτημα Δημιουργίας Προφίλ</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="margin-bottom: 20px;">
        <img src="https://netprophetapp.com/net-prophet-logo-with-icon.svg" alt="NetProphet" style="height: 60px; width: auto;">
      </div>
      <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0;">
        Αίτημα Ελήφθη! ✅
      </h1>
    </div>

    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 40px; margin-bottom: 30px; border: 1px solid rgba(255, 255, 255, 0.1);">
      <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0 0 20px 0;">
        Γεια σου {{user_name}}! 👋
      </h2>
      
      <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Λάβαμε το αίτημά σου για δημιουργία προφίλ παίκτη για <strong style="color: #3b82f6;">{{requested_full_name}}</strong>.
      </p>

      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; padding: 30px; margin: 30px 0; text-align: center;">
        <h3 style="color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 15px 0;">
          ⏳ Υπό Έλεγχο
        </h3>
        <div style="color: #ffffff; font-size: 24px; font-weight: 700; margin-bottom: 10px;">
          {{requested_full_name}}
        </div>
        <p style="color: #fef3c7; font-size: 14px; margin: 0;">
          Η ομάδα μας θα ελέγξει το αίτημά σου και θα δημιουργήσει το προφίλ σου σύντομα. Θα σε ειδοποιήσουμε όταν είναι έτοιμο!
        </p>
      </div>

      <p style="color: #e2e8f0; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
        Στο μεταξύ, μπορείς να συνεχίσεις να χρησιμοποιείς το NetProphet και να κάνεις προβλέψεις!
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="{{app_url}}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
          Συνέχεια στο NetProphet →
        </a>
      </div>
    </div>

    <div style="text-align: center; color: #94a3b8; font-size: 14px;">
      <p style="margin: 0;">
        Επισκέψου το <a href="{{app_url}}" style="color: #3b82f6; text-decoration: none;">{{app_url}}</a>
      </p>
    </div>
  </div>
</body>
</html>',
    'Αίτημα Δημιουργίας Προφίλ Ελήφθη!

Γεια σου {{user_name}}!

Λάβαμε το αίτημά σου για δημιουργία προφίλ παίκτη για {{requested_full_name}}.

⏳ Υπό Έλεγχο: {{requested_full_name}}

Η ομάδα μας θα ελέγξει το αίτημά σου και θα δημιουργήσει το προφίλ σου σύντομα. Θα σε ειδοποιήσουμε όταν είναι έτοιμο!

Στο μεταξύ, μπορείς να συνεχίσεις να χρησιμοποιείς το NetProphet και να κάνεις προβλέψεις!

Επισκέψου το {{app_url}}

Με εκτίμηση,
Η Ομάδα του NetProphet',
    '{
      "app_url": "https://netprophetapp.com",
      "user_name": "User",
      "user_email": "user@example.com",
      "requested_first_name": "John",
      "requested_last_name": "Doe",
      "requested_full_name": "John Doe"
    }',
    true,
    1
);

-- 7. Update handle_player_claim function to send confirmation email
CREATE OR REPLACE FUNCTION handle_player_claim
(
    user_id UUID,
    player_id UUID
)
RETURNS JSONB AS $$
DECLARE
    claim_success BOOLEAN;
    player_info RECORD;
    user_info RECORD;
    result JSONB;
BEGIN
    -- Attempt to claim the player profile
    SELECT claim_player_profile(player_id, user_id)
    INTO claim_success;

    IF claim_success THEN
        -- Update user profile with terms acceptance
        UPDATE profiles 
        SET 
            profile_claim_status = 'claimed',
            claimed_player_id = player_id,
            profile_claim_completed_at = NOW(),
            terms_accepted = true,
            terms_accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = user_id;

        -- Get player information
        SELECT first_name, last_name
        FROM players
        WHERE id = player_id
        INTO player_info;

        -- Get user information
        SELECT email, first_name, last_name
        FROM profiles
        WHERE id = user_id
        INTO user_info;

        -- Send admin notification
        PERFORM send_admin_notification(
            'player_claimed',
            'Player Profile Claimed',
            'User ' || user_info.email || ' has claimed player profile: ' || player_info.first_name || ' ' || player_info.last_name,
            user_id,
            player_id,
            jsonb_build_object(
                'player_first_name', player_info.first_name,
                'player_last_name', player_info.last_name,
                'user_email', user_info.email
            )
        );
        
        -- Send confirmation email to user
        PERFORM send_profile_claim_confirmation_email(
            user_info.email,
            user_id,
            COALESCE(user_info.first_name || ' ' || user_info.last_name, 'User'),
            player_info.first_name,
            player_info.last_name
        );
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Player profile claimed successfully',
            'player_first_name', player_info.first_name,
            'player_last_name', player_info.last_name
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Failed to claim player profile. Player may already be claimed or not found.'
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Update handle_profile_creation_request function to send confirmation email
CREATE OR REPLACE FUNCTION handle_profile_creation_request(
    user_id UUID,
    user_first_name TEXT,
    user_last_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    request_success BOOLEAN;
    user_info RECORD;
    result JSONB;
BEGIN
    -- Request profile creation
    SELECT request_profile_creation(user_id, user_first_name, user_last_name) INTO request_success;
    
    IF request_success THEN
        -- Update user profile
        UPDATE profiles 
        SET 
            profile_claim_status = 'creation_requested',
            profile_claim_completed_at = NOW(),
            updated_at = NOW()
        WHERE id = user_id;
        
        -- Get user information
        SELECT email, first_name, last_name
        FROM profiles
        WHERE id = user_id
        INTO user_info;
        
        -- Send admin notification
        PERFORM send_admin_notification(
            'profile_creation_requested',
            'Profile Creation Requested',
            'User ' || user_info.email || ' has requested profile creation for: ' || user_first_name || ' ' || user_last_name,
            user_id,
            NULL,
            jsonb_build_object(
                'requested_first_name', user_first_name,
                'requested_last_name', user_last_name,
                'user_email', user_info.email
            )
        );
        
        -- Send confirmation email to user
        PERFORM send_profile_creation_confirmation_email(
            user_info.email,
            user_id,
            COALESCE(user_info.first_name || ' ' || user_info.last_name, 'User'),
            user_first_name,
            user_last_name
        );
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Profile creation request submitted successfully'
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Failed to submit profile creation request'
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION send_profile_claim_confirmation_email(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_profile_claim_confirmation_email(TEXT, UUID, TEXT, TEXT, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION send_profile_creation_confirmation_email(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_profile_creation_confirmation_email(TEXT, UUID, TEXT, TEXT, TEXT) TO service_role;

-- 10. Add comments
COMMENT ON FUNCTION send_profile_claim_confirmation_email IS 'Sends confirmation email when user claims a player profile';
COMMENT ON FUNCTION send_profile_creation_confirmation_email IS 'Sends confirmation email when user requests profile creation';

