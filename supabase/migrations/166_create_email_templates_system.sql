-- Create email_templates table
CREATE TABLE email_templates
(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    -- '2fa', 'promotional', 'winnings', 'admin'
    language VARCHAR(5) NOT NULL,
    -- 'en', 'el'
    subject VARCHAR(200) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB DEFAULT '{}',
    -- Template variables like {{code}}, {{user_name}}, etc.
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP
    WITH TIME ZONE DEFAULT NOW
    (),
  updated_at TIMESTAMP
    WITH TIME ZONE DEFAULT NOW
    (),
  UNIQUE
    (type, language, version)
);

    -- Create email_template_versions table for version history
    CREATE TABLE email_template_versions
    (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        subject VARCHAR(200) NOT NULL,
        html_content TEXT NOT NULL,
        text_content TEXT,
        variables JSONB DEFAULT '{}',
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMP
        WITH TIME ZONE DEFAULT NOW
        ()
);

        -- Create email_template_variables table for variable definitions
        CREATE TABLE email_template_variables
        (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            template_id UUID REFERENCES email_templates(id) ON DELETE CASCADE,
            variable_name VARCHAR(50) NOT NULL,
            -- e.g., 'code', 'user_name', 'amount'
            display_name VARCHAR(100) NOT NULL,
            -- e.g., 'Verification Code', 'User Name'
            description TEXT,
            variable_type VARCHAR(20) DEFAULT 'text',
            -- 'text', 'number', 'date', 'currency'
            is_required BOOLEAN DEFAULT false,
            default_value TEXT,
            validation_rules JSONB DEFAULT '{}',
            -- e.g., {"min_length": 6, "max_length": 6, "pattern": "^[0-9]+$"}
            created_at TIMESTAMP
            WITH TIME ZONE DEFAULT NOW
            ()
);

            -- Insert default email templates
            INSERT INTO email_templates
                (name, type, language, subject, html_content, text_content, variables)
            VALUES
                -- 2FA English Template
                ('2FA Verification - English', '2fa', 'en', '🔐 Your NetProphet Verification Code',
                    '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NetProphet Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="margin-bottom: 20px;">
        <img src="{{logo_url}}" alt="NetProphet Logo" style="width: 145px; height: 32px; display: block; margin: 0 auto;" />
      </div>
      <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 16px;">{{platform_description}}</p>
    </div>

    <!-- Main Content -->
    <div style="background: rgba(30, 41, 59, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 16px; padding: 40px; color: white; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
          <span style="font-size: 24px;">🔐</span>
        </div>
        <h2 style="color: #fbbf24; margin: 0; font-size: 24px; font-weight: 700;">{{verification_title}}</h2>
        <p style="color: #cbd5e1; margin: 10px 0 0 0; font-size: 16px;">{{verification_description}}</p>
      </div>

      <!-- Code Display -->
      <div style="background: rgba(51, 65, 85, 0.6); border: 2px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
        <span style="font-size: 36px; font-weight: 800; color: #fbbf24; letter-spacing: 8px; font-family: ''Courier New'', monospace;">{{code}}</span>
      </div>

      <!-- Instructions -->
      <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3 style="color: #60a5fa; margin: 0 0 10px 0; font-size: 18px;">{{instructions_title}}</h3>
        <p style="color: #cbd5e1; margin: 0; font-size: 14px; line-height: 1.6;">{{instructions_text}}</p>
      </div>

      <!-- Security Notice -->
      <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="color: #fca5a5; margin: 0; font-size: 14px; line-height: 1.6;">{{security_notice}}</p>
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
                    'NetProphet Verification Code\n\nYour verification code is: {{code}}\n\nThis code will expire in {{expiry_minutes}} minutes.\n\nIf you didn''t request this code, please ignore this email.\n\n© {{current_year}} {{company_name}}. {{footer_rights}}',
                    '{"logo_url": "https://netprophetapp.com/net-prophet-logo-with-icon.png", "platform_description": "Tennis Prediction Platform", "verification_title": "Verification Code", "verification_description": "Enter this code to complete your authentication", "instructions_title": "How to use this code", "instructions_text": "Copy the code above and paste it into the verification field on NetProphet to complete your login.", "security_notice": "This code will expire in 10 minutes. Never share this code with anyone. NetProphet will never ask for your verification code.", "current_year": "2024", "company_name": "NetProphet", "footer_rights": "All rights reserved", "footer_tagline": "Made with ❤️ for tennis enthusiasts", "expiry_minutes": "10"}'),

                -- 2FA Greek Template
                ('2FA Verification - Greek', '2fa', 'el', '🔐 Ο Κωδικός Επαλήθευσης σας στο NetProphet',
                    '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NetProphet Κωδικός Επαλήθευσης</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <div style="margin-bottom: 20px;">
        <img src="{{logo_url}}" alt="NetProphet Logo" style="width: 145px; height: 32px; display: block; margin: 0 auto;" />
      </div>
      <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 16px;">{{platform_description}}</p>
    </div>

    <!-- Main Content -->
    <div style="background: rgba(30, 41, 59, 0.8); backdrop-filter: blur(10px); border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 16px; padding: 40px; color: white; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
          <span style="font-size: 24px;">🔐</span>
        </div>
        <h2 style="color: #fbbf24; margin: 0; font-size: 24px; font-weight: 700;">{{verification_title}}</h2>
        <p style="color: #cbd5e1; margin: 10px 0 0 0; font-size: 16px;">{{verification_description}}</p>
      </div>

      <!-- Code Display -->
      <div style="background: rgba(51, 65, 85, 0.6); border: 2px solid rgba(251, 191, 36, 0.3); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
        <span style="font-size: 36px; font-weight: 800; color: #fbbf24; letter-spacing: 8px; font-family: ''Courier New'', monospace;">{{code}}</span>
      </div>

      <!-- Instructions -->
      <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <h3 style="color: #60a5fa; margin: 0 0 10px 0; font-size: 18px;">{{instructions_title}}</h3>
        <p style="color: #cbd5e1; margin: 0; font-size: 14px; line-height: 1.6;">{{instructions_text}}</p>
      </div>

      <!-- Security Notice -->
      <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="color: #fca5a5; margin: 0; font-size: 14px; line-height: 1.6;">{{security_notice}}</p>
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
                    'NetProphet Κωδικός Επαλήθευσης\n\nΟ κωδικός επαλήθευσης σας είναι: {{code}}\n\nΑυτός ο κωδικός θα λήξει σε {{expiry_minutes}} λεπτά.\n\nΕάν δεν ζητήσατε αυτόν τον κωδικό, παρακαλώ αγνοήστε αυτό το email.\n\n© {{current_year}} {{company_name}}. {{footer_rights}}',
                    '{"logo_url": "https://netprophetapp.com/net-prophet-logo-with-icon.png", "platform_description": "Πλατφόρμα Προβλέψεων Τένις", "verification_title": "Κωδικός Επαλήθευσης", "verification_description": "Εισάγετε αυτόν τον κωδικό για να ολοκληρώσετε την πιστοποίησή σας", "instructions_title": "Πώς να χρησιμοποιήσετε αυτόν τον κωδικό", "instructions_text": "Αντιγράψτε τον κωδικό παραπάνω και επικολλήστε τον στο πεδίο επαλήθευσης στο NetProphet για να ολοκληρώσετε την είσοδό σας.", "security_notice": "Αυτός ο κωδικός θα λήξει σε 10 λεπτά. Ποτέ μη μοιράζεστε αυτόν τον κωδικό με κανέναν. Το NetProphet δεν θα ζητήσει ποτέ τον κωδικό επαλήθευσής σας.", "current_year": "2024", "company_name": "NetProphet", "footer_rights": "Όλα τα δικαιώματα διατηρούνται", "footer_tagline": "Φτιαγμένο με ❤️ για τους λάτρεις του τένις", "expiry_minutes": "10"}');

            -- Insert template variables for 2FA templates
            INSERT INTO email_template_variables
                (template_id, variable_name, display_name, description, variable_type, is_required, default_value, validation_rules)
            VALUES
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'en'), 'code', 'Verification Code', '6-digit verification code', 'text', true, '', '{"min_length": 6, "max_length": 6, "pattern": "^[0-9]+$"}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'en'), 'logo_url', 'Logo URL', 'URL to the NetProphet logo image', 'text', true, 'https://netprophetapp.com/net-prophet-logo-with-icon.png', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'en'), 'platform_description', 'Platform Description', 'Description of the platform', 'text', false, 'Tennis Prediction Platform', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'en'), 'verification_title', 'Verification Title', 'Title for verification section', 'text', false, 'Verification Code', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'en'), 'verification_description', 'Verification Description', 'Description for verification section', 'text', false, 'Enter this code to complete your authentication', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'en'), 'instructions_title', 'Instructions Title', 'Title for instructions section', 'text', false, 'How to use this code', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'en'), 'instructions_text', 'Instructions Text', 'Instructions text', 'text', false, 'Copy the code above and paste it into the verification field on NetProphet to complete your login.', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'en'), 'security_notice', 'Security Notice', 'Security notice text', 'text', false, 'This code will expire in 10 minutes. Never share this code with anyone. NetProphet will never ask for your verification code.', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'en'), 'current_year', 'Current Year', 'Current year for footer', 'text', false, '2024', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'en'), 'company_name', 'Company Name', 'Company name for footer', 'text', false, 'NetProphet', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'en'), 'footer_rights', 'Footer Rights', 'Rights text for footer', 'text', false, 'All rights reserved', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'en'), 'footer_tagline', 'Footer Tagline', 'Tagline for footer', 'text', false, 'Made with ❤️ for tennis enthusiasts', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'en'), 'expiry_minutes', 'Expiry Minutes', 'Number of minutes until code expires', 'number', false, '10', '{}');

            -- Insert template variables for Greek 2FA template
            INSERT INTO email_template_variables
                (template_id, variable_name, display_name, description, variable_type, is_required, default_value, validation_rules)
            VALUES
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'el'), 'code', 'Κωδικός Επαλήθευσης', '6-ψηφιος κωδικός επαλήθευσης', 'text', true, '', '{"min_length": 6, "max_length": 6, "pattern": "^[0-9]+$"}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'el'), 'logo_url', 'URL Λογότυπου', 'URL για την εικόνα του λογότυπου NetProphet', 'text', true, 'https://netprophetapp.com/net-prophet-logo-with-icon.png', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'el'), 'platform_description', 'Περιγραφή Πλατφόρμας', 'Περιγραφή της πλατφόρμας', 'text', false, 'Πλατφόρμα Προβλέψεων Τένις', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'el'), 'verification_title', 'Τίτλος Επαλήθευσης', 'Τίτλος για την ενότητα επαλήθευσης', 'text', false, 'Κωδικός Επαλήθευσης', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'el'), 'verification_description', 'Περιγραφή Επαλήθευσης', 'Περιγραφή για την ενότητα επαλήθευσης', 'text', false, 'Εισάγετε αυτόν τον κωδικό για να ολοκληρώσετε την πιστοποίησή σας', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'el'), 'instructions_title', 'Τίτλος Οδηγιών', 'Τίτλος για την ενότητα οδηγιών', 'text', false, 'Πώς να χρησιμοποιήσετε αυτόν τον κωδικό', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'el'), 'instructions_text', 'Κείμενο Οδηγιών', 'Κείμενο οδηγιών', 'text', false, 'Αντιγράψτε τον κωδικό παραπάνω και επικολλήστε τον στο πεδίο επαλήθευσης στο NetProphet για να ολοκληρώσετε την είσοδό σας.', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'el'), 'security_notice', 'Ειδοποίηση Ασφαλείας', 'Κείμενο ειδοποίησης ασφαλείας', 'text', false, 'Αυτός ο κωδικός θα λήξει σε 10 λεπτά. Ποτέ μη μοιράζεστε αυτόν τον κωδικό με κανέναν. Το NetProphet δεν θα ζητήσει ποτέ τον κωδικό επαλήθευσής σας.', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'el'), 'current_year', 'Τρέχον Έτος', 'Τρέχον έτος για το footer', 'text', false, '2024', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'el'), 'company_name', 'Όνομα Εταιρείας', 'Όνομα εταιρείας για το footer', 'text', false, 'NetProphet', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'el'), 'footer_rights', 'Δικαιώματα Footer', 'Κείμενο δικαιωμάτων για το footer', 'text', false, 'Όλα τα δικαιώματα διατηρούνται', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'el'), 'footer_tagline', 'Tagline Footer', 'Tagline για το footer', 'text', false, 'Φτιαγμένο με ❤️ για τους λάτρεις του τένις', '{}'),
                ((SELECT id
                    FROM email_templates
                    WHERE type = '2fa' AND language = 'el'), 'expiry_minutes', 'Λεπτά Λήξης', 'Αριθμός λεπτών μέχρι τη λήξη του κωδικού', 'number', false, '10', '{}');

            -- Create RLS policies
            ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
            ALTER TABLE email_template_versions ENABLE ROW LEVEL SECURITY;
            ALTER TABLE email_template_variables ENABLE ROW LEVEL SECURITY;

            -- Allow authenticated users to read templates
            CREATE POLICY "Allow authenticated users to read email templates" ON email_templates
  FOR
            SELECT USING (auth.role() = 'authenticated');

            -- Allow admins to manage templates
            CREATE POLICY "Allow admins to manage email templates" ON email_templates
  FOR ALL USING
            (
    EXISTS
            (
      SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
                AND profiles.is_admin = true
    )
            );

            -- Allow authenticated users to read template versions
            CREATE POLICY "Allow authenticated users to read template versions" ON email_template_versions
  FOR
            SELECT USING (auth.role() = 'authenticated');

            -- Allow admins to manage template versions
            CREATE POLICY "Allow admins to manage template versions" ON email_template_versions
  FOR ALL USING
            (
    EXISTS
            (
      SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
                AND profiles.is_admin = true
    )
            );

            -- Allow authenticated users to read template variables
            CREATE POLICY "Allow authenticated users to read template variables" ON email_template_variables
  FOR
            SELECT USING (auth.role() = 'authenticated');

            -- Allow admins to manage template variables
            CREATE POLICY "Allow admins to manage template variables" ON email_template_variables
  FOR ALL USING
            (
    EXISTS
            (
      SELECT 1
            FROM profiles
            WHERE profiles.id = auth.uid()
                AND profiles.is_admin = true
    )
            );

            -- Create indexes for better performance
            CREATE INDEX idx_email_templates_type_language ON email_templates(type, language);
            CREATE INDEX idx_email_templates_active ON email_templates(is_active) WHERE is_active = true;
            CREATE INDEX idx_email_template_versions_template_id ON email_template_versions(template_id);
            CREATE INDEX idx_email_template_variables_template_id ON email_template_variables(template_id);

            -- Create function to update updated_at timestamp
            CREATE OR REPLACE FUNCTION update_email_template_updated_at
            ()
RETURNS TRIGGER AS $$
            BEGIN
  NEW.updated_at = NOW
            ();
            RETURN NEW;
            END;
$$ LANGUAGE plpgsql;

            -- Create trigger to automatically update updated_at
            CREATE TRIGGER update_email_templates_updated_at
  BEFORE
            UPDATE ON email_templates
  FOR EACH ROW
            EXECUTE FUNCTION update_email_template_updated_at
            ();
