-- Final fix for duplicate logo issue in 2FA emails
-- This migration ensures only ONE logo appears by completely replacing the logo section

-- Update English 2FA template to have only one logo
UPDATE email_templates 
SET html_content = REGEXP_REPLACE(
    html_content,
    '(<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center;.*?</div>.*?<img[^>]*>)|(<img[^>]*>.*?<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center;.*?</div>)',
    '<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
    </div>',
    'g'
)
WHERE type = '2fa' AND language = 'en';

-- Update Greek 2FA template to have only one logo
UPDATE email_templates 
SET html_content = REGEXP_REPLACE(
    html_content,
    '(<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center;.*?</div>.*?<img[^>]*>)|(<img[^>]*>.*?<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center;.*?</div>)',
    '<div style="width: 145px; height: 32px; margin: 0 auto; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #9333ea 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-weight: bold; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif;">NetProphet</span>
    </div>',
    'g'
)
WHERE type = '2fa' AND language = 'el';

-- Also remove any remaining img tags with logo_url
UPDATE email_templates 
SET html_content = REGEXP_REPLACE(
    html_content,
    '<img[^>]*src="\{\{logo_url\}\}"[^>]*>',
    '',
    'g'
)
WHERE type = '2fa';

-- Update template variables description
UPDATE email_template_variables 
SET description = 'Logo display method - uses styled text only (no external images)'
WHERE variable_name = 'logo_url' AND template_id IN (
    SELECT id
    FROM email_templates
    WHERE type = '2fa'
);
